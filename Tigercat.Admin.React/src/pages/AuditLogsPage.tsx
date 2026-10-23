import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Empty } from '@expcat/tigercat-react/Empty';
import { Input } from '@expcat/tigercat-react/Input';
import { Loading } from '@expcat/tigercat-react/Loading';
import { Pagination } from '@expcat/tigercat-react/Pagination';
import { Message } from '@expcat/tigercat-react/Message';
import { Modal } from '@expcat/tigercat-react/Modal';
import { Select } from '@expcat/tigercat-react/Select';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { ActivityFeed } from '@expcat/tigercat-react/ActivityFeed';
import { Timeline } from '@expcat/tigercat-react/Timeline';
import { DataExport } from '@expcat/tigercat-react/DataExport';
import { CheckboxGroup } from '@expcat/tigercat-react/CheckboxGroup';
import { Checkbox } from '@expcat/tigercat-react/Checkbox';
import { Code } from '@expcat/tigercat-react/Code';
import type { ActivityItem, TimelineItem } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import {
  ActivityIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '../components/Icons';
import {
  ChartEmptyState,
  MetricCard,
  MetricGrid,
  PageActionPanel,
} from '../components/PageFragments';
import {
  apiRequest,
  exportAuditLogs,
  getAuthHeaders,
  loadWorkbenchState,
  normalizeInput,
  saveWorkbenchState,
} from '../utils';
import {
  AUDIT_EXPORT_FIELDS,
  DATA_EXPORT_TRIGGER_FORMATS,
  EXPORT_FORMAT_LABELS,
  EXPORT_FORMATS,
  toExportColumns,
  type ExportFormat,
} from '../utils/export';
import { usePermission } from '../utils/permission';
import type {
  AuditLogItem,
  AuditRetentionCleanupResult,
  AuditRetentionPolicy,
  PagedResult,
} from '../utils/types';

const CONTAINS_CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/;

const CATEGORY_OPTIONS = [
  { label: '全部分类', value: '' },
  { label: '认证', value: 'auth' },
  { label: '用户', value: 'user' },
  { label: '任务', value: 'task' },
  { label: '系统', value: 'system' },
];

const getFriendlyErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    if (CONTAINS_CHINESE_CHAR_REGEX.test(error.message)) {
      return error.message;
    }
  }

  return '审计日志加载失败，请稍后重试。';
};

const formatDateGroup = (value: string) =>
  new Date(value).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const getTimelineColor = (category: AuditLogItem['category']) => {
  switch (category) {
    case 'auth':
      return 'blue';
    case 'user':
      return 'green';
    default:
      return 'purple';
  }
};

function AuditLogsPage() {
  const location = useLocation();
  const { has: hasPerm, loaded: permissionsLoaded } = usePermission();
  const savedWorkbench = useMemo(
    () =>
      loadWorkbenchState('audit-logs', {
        queryState: { keyword: '', category: '' },
      }),
    [],
  );
  const savedQuery = savedWorkbench.queryState;
  const canView = hasPerm('audit:view');
  const eventId = new URLSearchParams(location.search).get('eventId') || '';
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailError, setDetailError] = useState('');
  const [detailReload, setDetailReload] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [policyLoaded, setPolicyLoaded] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);
  const listRequest = useRef<AbortController | null>(null);
  const cleanupTrigger = useRef<HTMLButtonElement>(null);
  const canExport = hasPerm('audit:export');
  const canSaveRetention = hasPerm('setting:edit');

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [keyword, setKeyword] = useState(savedQuery.keyword ?? '');
  const [category, setCategory] = useState(savedQuery.category ?? '');
  const [retentionDays, setRetentionDays] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [exportFields, setExportFields] = useState<string[]>(
    AUDIT_EXPORT_FIELDS.map((field) => field.key),
  );
  const exportColumns = useMemo(() => toExportColumns(AUDIT_EXPORT_FIELDS), []);
  const [exporting, setExporting] = useState(false);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<AuditRetentionCleanupResult | null>(null);
  const [cleaningRetention, setCleaningRetention] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    listRequest.current?.abort();
    if (!canView) { setLogs([]); setSelectedLog(null); setLoading(false); return; }
    const controller = new AbortController();
    listRequest.current = controller;
    setLoading(true);
    setErrorMessage('');
    setLogs([]);
    if (!eventId) setSelectedLog(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '30' });
      if (keyword.trim()) params.set('keyword', keyword.trim());
      if (category) params.set('category', category);
      const payload = await apiRequest<PagedResult<AuditLogItem>>(`/api/audit-logs?${params}`, {
        headers: getAuthHeaders(), signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(payload.data.total / 30));
      if (page > lastPage) { setPage(lastPage); return; }
      setLogs(payload.data.items);
      setTotal(payload.data.total);
      if (!eventId) setSelectedLog(payload.data.items[0] ?? null);
    } catch (error) {
      if (!controller.signal.aborted) { setErrorMessage(getFriendlyErrorMessage(error)); setTotal(0); }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [canView, category, keyword, page, eventId]);

  useEffect(() => {
    const controller = new AbortController();
    setSelectedLog(null);
    setDetailError('');
    if (!canView || !eventId) { setDetailLoading(false); return; }
    setDetailLoading(true);
    void apiRequest<AuditLogItem>(`/api/audit-logs/${encodeURIComponent(eventId)}`, { headers: getAuthHeaders(), signal: controller.signal })
      .then((payload) => { if (!controller.signal.aborted) setSelectedLog(payload.data); })
      .catch((error) => { if (!controller.signal.aborted) setDetailError(error instanceof Error ? error.message : '目标审计事件加载失败'); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [canView, eventId, detailReload]);

  const loadRetentionPolicy = useCallback(async () => {
    if (!canView) return;
    setPolicyError('');
    setPolicyLoaded(false);
    try {
      const payload = await apiRequest<AuditRetentionPolicy>(
        '/api/audit-logs/retention-policy',
        { headers: getAuthHeaders() },
      );
      setRetentionDays(String(payload.data.retentionDays));
      setPolicyLoaded(true);
    } catch (error) {
      setPolicyError(error instanceof Error ? error.message : '保留策略加载失败');
    }
  }, [canView]);

  useEffect(() => {
    void loadAuditLogs();
    return () => listRequest.current?.abort();
  }, [loadAuditLogs]);
  useEffect(() => { void loadRetentionPolicy(); }, [loadRetentionPolicy]);

  const onExport = useCallback(async (format: ExportFormat) => {
    if (!canExport || loading || exporting) return;
    if (logs.length === 0) {
      setErrorMessage('当前筛选没有可导出的结果');
      return;
    }
    if (exportFields.length === 0) {
      setErrorMessage('请至少选择一个导出字段');
      return;
    }
    setExporting(true);
    try {
      await exportAuditLogs({
        format,
        fields: exportFields,
        query: {
          keyword: keyword.trim(),
          category,
        },
        headers: getAuthHeaders(),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  }, [canExport, loading, exporting, category, exportFields, keyword, logs.length]);

  const handleSaveRetention = useCallback(async () => {
    if (!canSaveRetention || !policyLoaded || savingRetention) return;
    const nextRetentionDays = Number(retentionDays);
    if (!Number.isInteger(nextRetentionDays) || nextRetentionDays < 1 || nextRetentionDays > 3650) {
      setPolicyError('保留天数必须是 1–3650 的整数'); return;
    }
    setSavingRetention(true);
    setPolicyError('');
    try {
      await apiRequest<AuditRetentionPolicy>('/api/audit-logs/retention-policy', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ retentionDays: nextRetentionDays }),
      });
      await loadRetentionPolicy();
      Message.success({ content: '保留策略已保存', duration: 2400 });
    } catch (error) {
      setPolicyError(error instanceof Error ? error.message : '保留策略保存失败');
    } finally { setSavingRetention(false); }
  }, [canSaveRetention, policyLoaded, savingRetention, loadRetentionPolicy, retentionDays]);

  const runRetentionCleanup = useCallback(async (dryRun: boolean) => {
    if (!canSaveRetention || !policyLoaded || cleaningRetention) return;
    setPolicyError('');
    setCleaningRetention(true);
    try {
      const payload = await apiRequest<AuditRetentionCleanupResult>(
        '/api/audit-logs/retention/cleanup',
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ dryRun }),
        },
      );
      setCleanupResult(payload.data);
      setCleanupConfirmOpen(true);
      if (!dryRun) {
        await loadAuditLogs();
      }
    } catch (error) {
      setPolicyError(error instanceof Error ? error.message : '审计清理失败');
    } finally {
      setCleaningRetention(false);
    }
  }, [canSaveRetention, policyLoaded, cleaningRetention, loadAuditLogs]);

  const handleKeywordChange = (value: string | number) => {
    const next = normalizeInput(value);
    setKeyword(next);
    setPage(1);
    saveWorkbenchState('audit-logs', {
      queryState: { keyword: next, category },
    });
  };

  const handleCategoryChange = (value: unknown) => {
    const next = String(value ?? '');
    setCategory(next);
    setPage(1);
    saveWorkbenchState('audit-logs', {
      queryState: { keyword, category: next },
    });
  };

  const activityItems = useMemo<ActivityItem[]>(
    () =>
      logs.map((log) => ({
        id: log.id,
        title: log.title,
        description: log.description,
        time: log.occurredAtUtc,
        user: log.actor ? { name: log.actor } : undefined,
        meta: {
          eventType: log.eventType,
          stream: log.stream,
          category: log.category,
        },
      })),
    [logs],
  );

  const timelineItems = useMemo<TimelineItem[]>(
    () =>
      logs.map((log) => ({
        label: formatDateTime(log.occurredAtUtc),
        color: getTimelineColor(log.category),
        content: `${log.title} · ${log.description} · ${log.eventType}`,
      })),
    [logs],
  );

  const authCount = logs.filter((log) => log.category === 'auth').length;
  const userCount = logs.filter((log) => log.category === 'user').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="审计日志"
        subtitle="查看认证与用户管理事件的最近活动轨迹"
        icon={<ActivityIcon size={24} className="text-white" />}
        tags={[
          { label: 'ActivityFeed', variant: 'primary' },
          { label: 'Timeline', variant: 'info' },
        ]}
      />

      {errorMessage && (
        <Alert
          type="error"
          title="审计操作失败"
          description={errorMessage}
          closable
          onClose={() => setErrorMessage('')}
        />
      )}

      {!canView ? <Alert type="warning" title={permissionsLoaded ? '无权查看审计日志' : '审计权限尚未就绪'} description="需要 audit:view 权限；权限变化后刷新页面重试。" /> : <>
      <PageActionPanel
        title="审计事件查询"
        description="页面通过 API 查询 Redis Streams 聚合结果，支持分页、筛选、详情和导出。"
        actions={
          <>
            <Input
              value={keyword}
              placeholder="筛选标题、说明或事件类型"
              onChange={handleKeywordChange}
            />
            <Select
              value={category}
              options={CATEGORY_OPTIONS}
              placeholder="筛选分类"
              clearable={false}
              onChange={handleCategoryChange}
            />
            <Tag variant="primary" size="sm">
              认证事件 {authCount}
            </Tag>
            <Tag variant="success" size="sm">
              用户事件 {userCount}
            </Tag>
            <Tag variant="info" size="sm">
              当前页 {logs.length} · 匹配 {total}
            </Tag>
            <Button variant="outline" onClick={loadAuditLogs}>
              刷新日志
            </Button>
            {canExport ? (
              <>
                {EXPORT_FORMATS.map((format) => (
                  <DataExport
                    key={format}
                    columns={exportColumns}
                    dataSource={[]}
                    formats={DATA_EXPORT_TRIGGER_FORMATS}
                    fileName="audit-logs"
                    labels={{
                      xlsxText: `导出 ${EXPORT_FORMAT_LABELS[format]}`,
                      exportingText: '导出中...',
                      triggerAriaLabel: `导出 ${EXPORT_FORMAT_LABELS[format]}`,
                    }}
                    disabled={exporting || loading}
                    customExport={() => onExport(format)}
                  />
                ))}
                <CheckboxGroup
                  orientation="horizontal"
                  value={exportFields}
                  className="flex w-full flex-wrap gap-x-4 gap-y-2 sm:w-auto"
                  onChange={(value) => setExportFields(value.map(String))}>
                  {AUDIT_EXPORT_FIELDS.map((field) => (
                    <Checkbox key={field.key} value={field.key}>
                      {field.label}
                    </Checkbox>
                  ))}
                </CheckboxGroup>
              </>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card title="活动分组视图">
          <ActivityFeed
            items={activityItems}
            loading={loading}
            emptyText="暂无审计事件"
            groupBy={(item) => formatDateGroup(String(item.time ?? ''))}
          />
        </Card>

        <Card title="事件时间线">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loading size="md" />
            </div>
          ) : timelineItems.length === 0 ? (
            <ChartEmptyState description="暂无可展示的时间线数据。" heightClassName="min-h-40" />
          ) : (
            <Timeline items={timelineItems} />
          )}
        </Card>
      </div>

      <Pagination current={page} pageSize={30} total={total} onChange={(value) => setPage(value)} />
      <Text size="sm" color="secondary">筛选与导出均作用于最近 1000 条可检索事件；导出包含全部匹配结果。</Text>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card title="保留策略">
          {policyError && <div className="space-y-2"><Alert type="error" title="保留策略操作失败" description={policyError} />
            {!policyLoaded && <Button variant="outline" onClick={loadRetentionPolicy}>重试策略</Button>}</div>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={retentionDays}
              placeholder="保留天数"
              aria-label="保留天数"
              disabled={!canSaveRetention || !policyLoaded || savingRetention || cleaningRetention}
              onChange={(event) => setRetentionDays(normalizeInput(event))}
            />
            {canSaveRetention && (
              <Button variant="outline" disabled={!policyLoaded || savingRetention || cleaningRetention} onClick={handleSaveRetention}>
                保存策略
              </Button>
            )}
            {canSaveRetention && (
              <Button
                variant="outline"
                ref={cleanupTrigger}
                disabled={!policyLoaded || savingRetention || cleaningRetention}
                onClick={() => runRetentionCleanup(true)}>
                预览清理
              </Button>
            )}
          </div>
        </Card>

        <Card title="事件详情">
          {detailError && <div className="space-y-2"><Alert type="error" title="目标事件无法定位" description={detailError} />
            <Button variant="outline" onClick={() => setDetailReload((value) => value + 1)}>重试详情</Button></div>}
          {logs.length > 0 && <Select aria-label="选择审计事件" value={selectedLog?.id} clearable={false}
            options={logs.map((log) => ({ value: log.id, label: `${log.title} · ${log.id}` }))}
            onChange={(id) => { setSelectedLog(logs.find((log) => log.id === id) ?? null); setDetailError(''); }} />}
          {detailLoading ? <Loading /> : selectedLog ? (
            <div className="space-y-3 break-words">
              <Text weight="bold">{selectedLog.title}</Text>
              <Text size="sm" color="secondary">
                {selectedLog.description}
              </Text>
              <Text size="sm" color="secondary">
                {selectedLog.eventType} · {selectedLog.actor ?? '系统'} ·{' '}
                {formatDateTime(selectedLog.occurredAtUtc)}
              </Text>
              <div className="max-h-72 max-w-full overflow-auto rounded bg-(--tiger-bg-hover,#f8fafc) p-3">
                <Code
                  code={JSON.stringify(selectedLog.data, null, 2)}
                  copyable
                  copyLabel="复制"
                  copiedLabel="已复制"
                />
              </div>
            </div>
          ) : (
            <Empty description="暂无可查看的审计详情" showImage={false} />
          )}
        </Card>
      </div>

      <MetricGrid>
        <MetricCard
          title="认证链路"
          description="覆盖注册、登录、改密、退出等认证事件。"
          icon={<ShieldCheckIcon size={20} />}
        />
        <MetricCard
          title="用户管理"
          description="覆盖用户创建、更新、删除、批量删除与密码重置。"
          icon={<UsersIcon size={20} />}
        />
        <MetricCard
          title="实时回看"
          description="当前以最近事件窗口为主，后续可继续扩展筛选与通知联动。"
          icon={<CheckCircleIcon size={20} />}
        />
      </MetricGrid>

      <Modal
        open={cleanupConfirmOpen}
        title="确认清理审计日志"
        footer={<>
          <Button variant="outline" disabled={cleaningRetention} onClick={() => setCleanupConfirmOpen(false)}>关闭</Button>
          {cleanupResult?.dryRun && <Button danger disabled={cleaningRetention || !canSaveRetention} loading={cleaningRetention} onClick={() => runRetentionCleanup(false)}>执行清理</Button>}
        </>}
        onAfterClose={() => cleanupTrigger.current?.focus()}
        onCancel={() => { if (!cleaningRetention) setCleanupConfirmOpen(false); }}>
        <div className="space-y-3">
          {policyError && <Alert type="error" title="清理失败" description={policyError} />}
          <Text color="secondary">
            当前保留 {cleanupResult?.retentionDays ?? retentionDays} 天，
            截止时间 {cleanupResult ? formatDateTime(cleanupResult.cutoffUtc) : '--'}。
          </Text>
          <Text>
            预览匹配 {cleanupResult?.matchedCount ?? 0} 条，
            已删除 {cleanupResult?.deletedCount ?? 0} 条。
          </Text>
        </div>
      </Modal>
      </>}
    </div>
  );
}

export default AuditLogsPage;
