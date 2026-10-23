import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Input } from '@expcat/tigercat-react/Input';
import { Message } from '@expcat/tigercat-react/Message';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { Badge } from '@expcat/tigercat-react/Badge';
import { Switch } from '@expcat/tigercat-react/Switch';
import { Progress } from '@expcat/tigercat-react/Progress';
import { Steps, StepsItem } from '@expcat/tigercat-react/Steps';
import { Drawer } from '@expcat/tigercat-react/Drawer';
import { Alert } from '@expcat/tigercat-react/Alert';
import { CronEditor } from '@expcat/tigercat-react/CronEditor';
import { InputNumber } from '@expcat/tigercat-react/InputNumber';
import { InputGroup, InputGroupAddon } from '@expcat/tigercat-react/InputGroup';
import { NumberKeyboard } from '@expcat/tigercat-react/NumberKeyboard';
import { Gantt } from '../utils/lazyTigercat';
import { parseOptionalInt, validateCronExpression, type CronPreset } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MetricCard, MetricGrid, MutedPanel } from '../components/PageFragments';
import {
  ActivityIcon,
  BanIcon,
  ClockIcon,
  EditIcon,
  PlusIcon,
  ZapIcon,
} from '../components/Icons';
import {
  createJob,
  fetchJobs,
  toGanttTasks,
  updateJob,
  validateJobForm,
  JOB_STATUS_META as STATUS_META,
  type Job,
  type JobForm,
} from '../utils/jobs';

const RUN_PHASES = ['排队', '运行', '回调', '完成'];

const CRON_PRESETS: CronPreset[] = [
  { label: '每分钟', value: '* * * * *', description: '每分钟执行一次' },
  { label: '每小时', value: '0 * * * *', description: '每小时整点执行' },
  { label: '每天 02:00', value: '0 2 * * *', description: '每天凌晨两点' },
  { label: '每周一 09:00', value: '0 9 * * 1', description: '每周一上午九点' },
];

const EMPTY_FORM: JobForm = {
  name: '',
  cron: '0 2 * * *',
  concurrency: 2,
  timeout: '60',
  batchSize: '500',
  enabled: true,
};

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [cronValid, setCronValid] = useState(true);
  const listController = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const writePending = useRef(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formVersion, setFormVersion] = useState(0);

  const selected = useMemo(
    () => jobs.find((j) => j.id === selectedId) ?? null,
    [jobs, selectedId],
  );
  const ganttRuns = useMemo(() => toGanttTasks(jobs), [jobs]);

  const totalCount = jobs.length;
  const runningCount = jobs.filter((j) => j.status === 'running').length;
  const pausedCount = jobs.filter((j) => j.status === 'paused').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;

  const loadJobs = async (preferId?: string | null) => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    setLoading(true);
    setErrorMessage('');
    try {
      const payload = await fetchJobs(controller.signal);
      if (controller.signal.aborted) return;
      const items = payload.data ?? [];
      setJobs(items);
      setSelectedId((current) => {
        const next = preferId ?? current;
        if (next && items.some((item) => item.id === next)) return next;
        return items[0]?.id ?? null;
      });
    } catch (error: unknown) {
      if (!controller.signal.aborted) setErrorMessage(readErrorMessage(error, '任务列表加载失败'));
    } finally {
      if (listController.current === controller) setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
    return () => listController.current?.abort();
  }, []);

  const toggleJob = async (job: Job, next: boolean) => {
    if (writePending.current) return;
    writePending.current = true;
    setTogglingId(job.id);
    setJobs((items) => items.map((item) => item.id === job.id ? { ...item, enabled: next } : item));
    try {
      const updated = await updateJob(job.id, { enabled: next });
      setJobs((items) => items.map((item) => item.id === job.id ? updated.data : item));
      Message.success({ content: `任务「${job.name}」已${next ? '启用' : '暂停'}`, duration: 2000 });
      await loadJobs(job.id);
    } catch (error: unknown) {
      setJobs((items) => items.map((item) => item.id === job.id ? job : item));
      Message.error({ content: readErrorMessage(error, '任务启停失败'), duration: 3000 });
    } finally {
      setTogglingId(null);
      writePending.current = false;
    }
  };

  const drawerTriggerRef = useRef<HTMLElement | null>(null);
  const captureDrawerTrigger = () => {
    drawerTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };

  const openCreate = () => {
    captureDrawerTrigger();
    setFormVersion((version) => version + 1);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setCronValid(true);
    setDrawerOpen(true);
  };

  const openEdit = (job: Job) => {
    captureDrawerTrigger();
    setFormVersion((version) => version + 1);
    setEditingId(job.id);
    setFormError('');
    setCronValid(validateCronExpression(job.cron).valid);
    setForm({
      name: job.name,
      cron: job.cron,
      concurrency: job.concurrency,
      timeout: job.timeout,
      batchSize: job.batchSize,
      enabled: job.enabled,
    });
    setDrawerOpen(true);
  };

  const submitJob = async () => {
    if (writePending.current) return;
    // rc.2 的非整数子字段草稿不会触发 onValidate，提交前仍需检查可见草稿。
    const invalidCronDraft = Array.from(formRef.current?.querySelectorAll<HTMLInputElement>('[data-job-field="cron"] input[inputmode="numeric"]') ?? [])
      .find((input) => parseOptionalInt(input.value) === null);
    const error = validateJobForm(form, cronValid && !invalidCronDraft);
    if (error) {
      setFormError(error.message);
      const field = error.field === 'cron' && invalidCronDraft ? invalidCronDraft
        : formRef.current?.querySelector<HTMLElement>(`[data-job-field="${error.field}"] input`)
          ?? formRef.current?.querySelector<HTMLElement>(`[data-job-field="${error.field}"] button`);
      field?.focus();
      return;
    }
    const name = form.name.trim();
    const payload = { ...form, name, concurrency: Number(form.concurrency) };
    writePending.current = true;
    setFormError('');
    setSubmitting(true);
    try {
      const saved = editingId ? await updateJob(editingId, payload) : await createJob(payload);
      setJobs((items) => items.some((item) => item.id === saved.data.id)
        ? items.map((item) => item.id === saved.data.id ? saved.data : item)
        : [...items, saved.data].sort((a, b) => a.id.localeCompare(b.id)));
      setSelectedId(saved.data.id);
      Message.success({ content: `任务「${name}」配置已${editingId ? '更新' : '创建'}`, duration: 2200 });
      setDrawerOpen(false);
      await loadJobs(saved.data.id);
    } catch (error: unknown) {
      setFormError(readErrorMessage(error, editingId ? '任务更新失败' : '任务创建失败'));
    } finally {
      setSubmitting(false);
      writePending.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClockIcon size={24} />}
        title="定时任务"
        subtitle="保存任务配置与启停标记；状态、进度和时间轴仅为示例"
        tags={[
          { label: '运维', variant: 'primary' },
          { label: '演示数据', variant: 'info' },
        ]}
      />

      <Alert type="info" title="任务配置展示" description="本页没有真实调度执行器或运行历史。保存和启停仅更新配置，不会触发执行；时间、进度与阶段为接口示例字段。" />

      <MetricGrid columns={4}>
        <MetricCard title="任务总数" value={totalCount} description="已保存的任务配置" icon={<ClockIcon size={20} />} />
        <MetricCard title="运行中（示例）" value={runningCount} description="接口状态为 running" icon={<ZapIcon size={20} />} />
        <MetricCard title="已暂停" value={pausedCount} description="已停用配置" icon={<BanIcon size={20} />} />
        <MetricCard title="失败（示例）" value={failedCount} description="接口状态为 failed，无日期统计" icon={<ActivityIcon size={20} />} />
      </MetricGrid>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Text weight="bold">任务列表</Text>
          <Badge content={runningCount} variant="success" standalone />
          <Text size="sm" color="secondary">
            个 running 示例状态
          </Text>
        </div>
        <Button disabled={loading || togglingId !== null || submitting} onClick={openCreate}>
          <span className="mr-1 inline-flex align-middle">
            <PlusIcon size={16} />
          </span>
          新建任务
        </Button>
      </div>

      {errorMessage && <div role="alert"><Alert type="error" title={errorMessage} /><Button disabled={loading || togglingId !== null || submitting} onClick={() => void loadJobs()}>重试任务列表</Button></div>}

      <Card className="overflow-hidden">
        {loading && jobs.length === 0 ? (
          <MutedPanel compact description="正在加载任务…" />
        ) : jobs.length === 0 ? (
          <MutedPanel description={errorMessage ? '任务列表尚未加载，请重试。' : '暂无任务配置，可新建任务。'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-(--tiger-border,#e5e7eb) text-left text-(--tiger-text-secondary,#64748b)">
                  <th className="px-3 py-2 font-medium">任务名称</th>
                  <th className="px-3 py-2 font-medium">调度表达式</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">上次 / 下次（示例）</th>
                  <th className="px-3 py-2 font-medium">进度（示例）</th>
                  <th className="px-3 py-2 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className={`cursor-pointer border-b border-(--tiger-border,#e5e7eb) transition-colors ${
                      job.id === selectedId
                        ? 'bg-(--tiger-primary,#3b82f6)/5'
                        : 'hover:bg-(--tiger-bg-hover,#f1f5f9)'
                    }`}
                    onClick={() => setSelectedId(job.id)}>
                    <td className="px-3 py-3">
                      <button type="button" className="text-left" aria-label={`查看任务：${job.name}`} aria-pressed={job.id === selectedId} onClick={() => setSelectedId(job.id)}><Text weight="medium">{job.name}</Text></button>
                      <div className="text-xs text-(--tiger-text-secondary,#64748b)">{job.id}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Tag variant="info" size="sm">
                        {job.cron}
                      </Tag>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch
                          aria-label={`启用任务：${job.name}`}
                          checked={job.enabled}
                          disabled={loading || togglingId !== null || submitting}
                          onChange={(checked) => void toggleJob(job, checked)}
                        />
                        <Tag variant={STATUS_META[job.status].variant} size="sm">
                          {STATUS_META[job.status].label}
                        </Tag>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs text-(--tiger-text-secondary,#64748b)">上次 {job.lastRun}</div>
                      <div className="text-xs text-(--tiger-text-secondary,#64748b)">下次 {job.nextRun}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="w-32">
                        <Progress
                          percentage={job.progress}
                          status={job.status === 'failed' ? 'exception' : undefined}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" disabled={loading || togglingId !== null || submitting} onClick={() => openEdit(job)}>
                        <span className="mr-1 inline-flex align-middle">
                          <EditIcon size={14} />
                        </span>
                        编辑
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2" header={<Text weight="bold">执行时间轴（示例）</Text>}>
          {loading && jobs.length === 0 ? <MutedPanel description="正在加载时间轴…" /> : ganttRuns.length === 0 ? <MutedPanel description={errorMessage ? '时间轴数据尚未加载。' : '暂无时间轴数据。'} /> : <div className="overflow-x-auto">
            <Gantt
              data={ganttRuns}
              width={720}
              height={240}
              scale="day"
              showToday
              showProgress
              selectedId={selectedId}
              onTaskClick={(task) => setSelectedId(String(task.id))}
            />
          </div>}
          <MutedPanel
            compact
            description="展示接口 start / end 的示例窗口，与 Cron 无联动，不是运行历史。今日高亮仅为参考线；点击色条可选中配置。"
          />
        </Card>

        <Card
          header={
            <div className="flex items-center gap-2">
              <Text weight="bold">运行阶段（示例）</Text>
              {selected && (
                <Text size="sm" color="secondary">
                  {selected.name}
                </Text>
              )}
            </div>
          }>
          {selected ? (
            <Steps current={selected.phase} orientation="vertical" size="sm">
              {RUN_PHASES.map((label, idx) => (
                <StepsItem
                  key={label}
                  title={label}
                  description={idx === selected.phase ? '接口示例阶段' : ''}
                />
              ))}
            </Steps>
          ) : (
            <MutedPanel description="请选择任务查看示例阶段。" />
          )}
        </Card>
      </div>

      <Drawer
        placement="right"
        open={drawerOpen}
        title={editingId ? '编辑任务' : '新建任务'}
        width="460px"
        mask
        maskClosable={!submitting}
        onClose={() => { if (!writePending.current) setDrawerOpen(false); }}
        onAfterClose={() => drawerTriggerRef.current?.focus()}>
        <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); void submitJob(); }}>
          {formError && <div role="alert" className="mb-4"><Alert type="error" title={formError} /></div>}
          <fieldset disabled={submitting} className="space-y-4">
          <div data-job-field="name">
            <label htmlFor="job-name" className="mb-1 block font-medium">
              任务名称
            </label>
            <Input
              id="job-name"
              maxLength={120}
              value={form.name}
              onChange={(v) => setForm((s) => ({ ...s, name: String(v) }))}
              placeholder="例如：每日对账批处理"
            />
          </div>
          <div data-job-field="cron">
            <Text weight="medium" className="mb-1 block">
              调度表达式
            </Text>
            <CronEditor key={formVersion} id="job-cron" ariaLabel="调度表达式" value={form.cron} onChange={(value) => setForm((s) => ({ ...s, cron: value ?? '' }))} onValidate={(validation) => setCronValid(validation.valid)} presets={CRON_PRESETS} disabled={submitting} />
          </div>
          <div data-job-field="concurrency">
            <Text weight="medium" className="mb-1 block">
              并发数
            </Text>
            <InputNumber
              aria-label="并发数"
              value={form.concurrency}
              disabled={submitting}
              min={1}
              max={20}
              step={1}
              controlsPosition="both"
              onChange={(value) => {
                const next = value === null || value === '' ? null : Number(value);
                setForm((s) => ({ ...s, concurrency: next }));
              }}
            />
          </div>
          <div data-job-field="timeout">
            <label htmlFor="job-timeout" className="mb-1 block font-medium">
              超时时间
            </label>
            <InputGroup>
              <Input id="job-timeout" maxLength={16} value={form.timeout} onChange={(v) => setForm((s) => ({ ...s, timeout: String(v) }))} placeholder="60" />
              <InputGroupAddon>秒</InputGroupAddon>
            </InputGroup>
          </div>
          <div data-job-field="batchSize" role="group" aria-label="每批处理条数">
            <Text weight="medium" className="mb-1 block">
              每批处理条数
            </Text>
            <Text size="sm" color="secondary" className="mb-2 block">当前值：{form.batchSize || '空（保存时沿用接口默认值）'}</Text>
            <NumberKeyboard value={form.batchSize} mode="number" maxLength={16} disabled={submitting} onChange={(value) => setForm((s) => ({ ...s, batchSize: value }))} />
          </div>
          <div className="flex items-center gap-2">
            <Switch aria-label="保存为启用配置" disabled={submitting} checked={form.enabled} onChange={(checked) => setForm((s) => ({ ...s, enabled: checked }))} />
            <Text size="sm" color="secondary">
              保存为启用配置（不会触发执行）
            </Text>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {editingId ? '保存修改' : '创建任务'}
            </Button>
          </div>
          </fieldset>
        </form>
      </Drawer>
    </div>
  );
}

export default JobsPage;
