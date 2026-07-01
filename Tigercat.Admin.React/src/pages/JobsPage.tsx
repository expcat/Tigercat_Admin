import { useMemo, useState } from 'react';
import { Card, Text, Tag, Button, Input, Message } from '@expcat/tigercat-react';
import { Badge } from '@expcat/tigercat-react/Badge';
import { Switch } from '@expcat/tigercat-react/Switch';
import { Progress } from '@expcat/tigercat-react/Progress';
import { Steps, StepsItem } from '@expcat/tigercat-react/Steps';
import { Drawer } from '@expcat/tigercat-react/Drawer';
import { CronEditor } from '@expcat/tigercat-react/CronEditor';
import { Stepper } from '@expcat/tigercat-react/Stepper';
import { InputGroup, InputGroupAddon } from '@expcat/tigercat-react/InputGroup';
import { NumberKeyboard } from '@expcat/tigercat-react/NumberKeyboard';
import { Gantt } from '@expcat/tigercat-react/Gantt';
import type { GanttTask, CronPreset, TagVariant } from '@expcat/tigercat-core';
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

type JobStatus = 'running' | 'paused' | 'failed';

interface Job {
  id: string;
  name: string;
  cron: string;
  concurrency: number;
  timeout: string;
  batchSize: string;
  enabled: boolean;
  status: JobStatus;
  lastRun: string;
  nextRun: string;
  progress: number;
  phase: number;
}

const RUN_PHASES = ['排队', '运行', '回调', '完成'];

const STATUS_META: Record<JobStatus, { label: string; variant: TagVariant }> = {
  running: { label: '运行中', variant: 'success' },
  paused: { label: '已暂停', variant: 'default' },
  failed: { label: '失败', variant: 'danger' },
};

const CRON_PRESETS: CronPreset[] = [
  { label: '每分钟', value: '* * * * *', description: '每分钟执行一次' },
  { label: '每小时', value: '0 * * * *', description: '每小时整点执行' },
  { label: '每天 02:00', value: '0 2 * * *', description: '每天凌晨两点' },
  { label: '每周一 09:00', value: '0 9 * * 1', description: '每周一上午九点' },
];

const SEED_JOBS: Job[] = [
  {
    id: 'JOB-1001',
    name: '每日对账批处理',
    cron: '0 2 * * *',
    concurrency: 4,
    timeout: '120',
    batchSize: '2000',
    enabled: true,
    status: 'running',
    lastRun: '2026-07-01 02:00',
    nextRun: '2026-07-02 02:00',
    progress: 64,
    phase: 1,
  },
  {
    id: 'JOB-1002',
    name: '订单数据归档',
    cron: '0 3 * * 0',
    concurrency: 2,
    timeout: '300',
    batchSize: '5000',
    enabled: true,
    status: 'running',
    lastRun: '2026-06-29 03:00',
    nextRun: '2026-07-06 03:00',
    progress: 28,
    phase: 1,
  },
  {
    id: 'JOB-1003',
    name: '缓存预热',
    cron: '*/30 * * * *',
    concurrency: 8,
    timeout: '60',
    batchSize: '500',
    enabled: false,
    status: 'paused',
    lastRun: '2026-06-30 23:30',
    nextRun: '—',
    progress: 100,
    phase: 3,
  },
  {
    id: 'JOB-1004',
    name: '报表快照生成',
    cron: '0 6 * * *',
    concurrency: 1,
    timeout: '180',
    batchSize: '1000',
    enabled: true,
    status: 'failed',
    lastRun: '2026-07-01 06:00',
    nextRun: '2026-07-02 06:00',
    progress: 42,
    phase: 2,
  },
];

const GANTT_RUNS: GanttTask[] = [
  { id: 'JOB-1001', label: '每日对账批处理', start: '2026-06-30', end: '2026-07-02', progress: 64, color: '#22c55e' },
  { id: 'JOB-1002', label: '订单数据归档', start: '2026-06-29', end: '2026-07-01', progress: 28, color: '#3b82f6' },
  { id: 'JOB-1003', label: '缓存预热', start: '2026-06-28', end: '2026-06-30', progress: 100, color: '#94a3b8' },
  { id: 'JOB-1004', label: '报表快照生成', start: '2026-07-01', end: '2026-07-03', progress: 42, color: '#ef4444' },
];

const EMPTY_FORM = {
  name: '',
  cron: '0 2 * * *',
  concurrency: 2,
  timeout: '60',
  batchSize: '500',
  enabled: true,
};

function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>(SEED_JOBS);
  const [selectedId, setSelectedId] = useState<string | null>(SEED_JOBS[0]?.id ?? null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const selected = useMemo(
    () => jobs.find((j) => j.id === selectedId) ?? null,
    [jobs, selectedId],
  );

  const totalCount = jobs.length;
  const runningCount = jobs.filter((j) => j.status === 'running').length;
  const pausedCount = jobs.filter((j) => j.status === 'paused').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;

  const toggleJob = (job: Job, next: boolean) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === job.id
          ? {
              ...j,
              enabled: next,
              status: next ? 'running' : 'paused',
              nextRun: next ? (j.nextRun === '—' ? '待调度' : j.nextRun) : '—',
            }
          : j,
      ),
    );
    Message.success({ content: `任务「${job.name}」已${next ? '启用' : '暂停'}（演示）`, duration: 2000 });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDrawerOpen(true);
  };

  const openEdit = (job: Job) => {
    setEditingId(job.id);
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

  const submitJob = () => {
    const name = form.name.trim();
    if (!name) {
      Message.warning({ content: '请填写任务名称', duration: 2000 });
      return;
    }
    if (editingId) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === editingId
            ? {
                ...j,
                name,
                cron: form.cron,
                concurrency: form.concurrency,
                timeout: form.timeout,
                batchSize: form.batchSize,
                enabled: form.enabled,
                status: form.enabled ? 'running' : 'paused',
              }
            : j,
        ),
      );
      Message.success({ content: `任务「${name}」已更新（演示）`, duration: 2200 });
    } else {
      const id = `JOB-${1004 + jobs.length + 1}`;
      const job: Job = {
        id,
        name,
        cron: form.cron,
        concurrency: form.concurrency,
        timeout: form.timeout,
        batchSize: form.batchSize,
        enabled: form.enabled,
        status: form.enabled ? 'running' : 'paused',
        lastRun: '—',
        nextRun: form.enabled ? '待调度' : '—',
        progress: 0,
        phase: 0,
      };
      setJobs((prev) => [job, ...prev]);
      setSelectedId(id);
      Message.success({ content: `任务「${name}」已创建（演示）`, duration: 2400 });
    }
    setDrawerOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClockIcon size={24} />}
        title="定时任务"
        subtitle="调度表达式配置、启停控制与执行时间轴监控的运维工作台"
        tags={[
          { label: '运维', variant: 'primary' },
          { label: '演示数据', variant: 'info' },
        ]}
      />

      <MetricGrid columns={4}>
        <MetricCard title="任务总数" value={totalCount} description="全部调度任务" icon={<ClockIcon size={20} />} />
        <MetricCard title="运行中" value={runningCount} description="正在调度执行" icon={<ZapIcon size={20} />} />
        <MetricCard title="已暂停" value={pausedCount} description="已停用调度" icon={<BanIcon size={20} />} />
        <MetricCard title="今日失败" value={failedCount} description="需关注重试" icon={<ActivityIcon size={20} />} />
      </MetricGrid>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Text weight="bold">任务列表</Text>
          <Badge content={runningCount} variant="success" standalone />
          <Text size="sm" color="secondary">
            个运行中
          </Text>
        </div>
        <Button onClick={openCreate}>
          <span className="mr-1 inline-flex align-middle">
            <PlusIcon size={16} />
          </span>
          新建任务
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-(--tiger-border,#e5e7eb) text-left text-(--tiger-text-secondary,#64748b)">
                <th className="px-3 py-2 font-medium">任务名称</th>
                <th className="px-3 py-2 font-medium">调度表达式</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">上次 / 下次执行</th>
                <th className="px-3 py-2 font-medium">执行进度</th>
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
                    <Text weight="medium">{job.name}</Text>
                    <div className="text-xs text-(--tiger-text-secondary,#64748b)">{job.id}</div>
                  </td>
                  <td className="px-3 py-3">
                    <Tag variant="info" size="sm">
                      {job.cron}
                    </Tag>
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch checked={job.enabled} onChange={(checked) => toggleJob(job, checked)} />
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
                    <Button variant="outline" size="sm" onClick={() => openEdit(job)}>
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
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" header={<Text weight="bold">执行时间轴</Text>}>
          <div className="overflow-x-auto">
            <Gantt
              data={GANTT_RUNS}
              width={720}
              height={240}
              scale="day"
              showToday
              showProgress
              selectedId={selectedId}
              onTaskClick={(task) => setSelectedId(String(task.id))}
            />
          </div>
          <MutedPanel
            compact
            description="展示近一周各任务的运行窗口；今日高亮为参考线。点击色条可联动选中对应任务。"
          />
        </Card>

        <Card
          header={
            <div className="flex items-center gap-2">
              <Text weight="bold">运行阶段</Text>
              {selected && (
                <Text size="sm" color="secondary">
                  {selected.name}
                </Text>
              )}
            </div>
          }>
          {selected ? (
            <Steps current={selected.phase} direction="vertical" size="small">
              {RUN_PHASES.map((label, idx) => (
                <StepsItem
                  key={label}
                  title={label}
                  description={idx === selected.phase ? '当前阶段' : ''}
                />
              ))}
            </Steps>
          ) : (
            <MutedPanel description="请选择任务查看其运行阶段。" />
          )}
        </Card>
      </div>

      {/* 新建 / 编辑任务 */}
      <Drawer
        placement="right"
        open={drawerOpen}
        title={editingId ? '编辑任务' : '新建任务'}
        width="460px"
        mask
        maskClosable
        onClose={() => setDrawerOpen(false)}>
        <div className="space-y-4">
          <div>
            <Text weight="medium" className="mb-1 block">
              任务名称
            </Text>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="例如：每日对账批处理"
            />
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              调度表达式
            </Text>
            <CronEditor value={form.cron} onChange={(value) => setForm((s) => ({ ...s, cron: value }))} presets={CRON_PRESETS} />
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              并发数
            </Text>
            <Stepper value={form.concurrency} onChange={(value) => setForm((s) => ({ ...s, concurrency: value }))} min={1} max={20} step={1} />
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              超时时间
            </Text>
            <InputGroup>
              <Input value={form.timeout} onChange={(e) => setForm((s) => ({ ...s, timeout: e.target.value }))} placeholder="60" />
              <InputGroupAddon>秒</InputGroupAddon>
            </InputGroup>
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              每批处理条数
            </Text>
            <NumberKeyboard value={form.batchSize} mode="number" maxLength={6} onChange={(value) => setForm((s) => ({ ...s, batchSize: value }))} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.enabled} onChange={(checked) => setForm((s) => ({ ...s, enabled: checked }))} />
            <Text size="sm" color="secondary">
              保存后立即启用
            </Text>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button onClick={submitJob}>{editingId ? '保存修改' : '创建任务'}</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default JobsPage;
