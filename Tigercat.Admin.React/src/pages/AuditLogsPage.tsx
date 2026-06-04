import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Loading,
  Modal,
  Select,
  Tag,
  Text,
} from '@expcat/tigercat-react';
import { ActivityFeed } from '@expcat/tigercat-react/ActivityFeed';
import { Timeline } from '@expcat/tigercat-react/Timeline';
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
  const { has: hasPerm } = usePermission();
  const savedWorkbench = useMemo(
    () =>
      loadWorkbenchState('audit-logs', {
        queryState: { keyword: '', category: '' },
      }),
    [],
  );
  const savedQuery = savedWorkbench.queryState;
  const canExport = hasPerm('audit:export');
  const canSaveRetention = hasPerm('setting:edit');

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [keyword, setKeyword] = useState(savedQuery.keyword ?? '');
  const [category, setCategory] = useState(savedQuery.category ?? '');
  const [retentionDays, setRetentionDays] = useState('90');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<AuditRetentionCleanupResult | null>(null);
  const [cleaningRetention, setCleaningRetention] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '60',
      });
      if (keyword.trim()) {
        params.set('keyword', keyword.trim());
      }
      if (category) {
        params.set('category', category);
      }

      const payload = await apiRequest<PagedResult<AuditLogItem>>(
        `/api/audit-logs?${params}`,
        {
          headers: getAuthHeaders(),
        },
      );
      setLogs(payload.data.items);
      setSelectedLog((current) => {
        const eventId = new URLSearchParams(location.search).get('eventId');
        if (eventId) {
          const target = payload.data.items.find((log) => log.id === eventId);
          if (target) {
            return target;
          }
        }

        if (current && payload.data.items.some((log) => log.id === current.id)) {
          return current;
        }

        return payload.data.items[0] ?? null;
      });
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [category, keyword, location.search]);

  const loadRetentionPolicy = useCallback(async () => {
    try {
      const payload = await apiRequest<AuditRetentionPolicy>(
        '/api/audit-logs/retention-policy',
        { headers: getAuthHeaders() },
      );
      setRetentionDays(String(payload.data.retentionDays));
    } catch {
      setRetentionDays('90');
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
    loadRetentionPolicy();
  }, [loadAuditLogs, loadRetentionPolicy]);

  const handleConfirmExport = useCallback(async () => {
    if (logs.length === 0) {
      setErrorMessage('当前筛选没有可导出的结果');
      setExportConfirmOpen(false);
      return;
    }
    setExporting(true);
    try {
      await exportAuditLogs({
        query: {
          keyword,
          category,
        },
        headers: getAuthHeaders(),
      });
      setExportConfirmOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  }, [category, keyword, logs.length]);

  const handleSaveRetention = useCallback(async () => {
    const nextRetentionDays = Number(retentionDays);
    try {
      await apiRequest<AuditRetentionPolicy>('/api/audit-logs/retention-policy', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ retentionDays: nextRetentionDays }),
      });
      await loadRetentionPolicy();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保留策略保存失败');
    }
  }, [loadRetentionPolicy, retentionDays]);

  const runRetentionCleanup = useCallback(async (dryRun: boolean) => {
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
      setErrorMessage(error instanceof Error ? error.message : '审计清理失败');
    } finally {
      setCleaningRetention(false);
    }
  }, [loadAuditLogs]);

  const handleKeywordChange = (value: string) => {
    const next = normalizeInput(value);
    setKeyword(next);
    saveWorkbenchState('audit-logs', {
      queryState: { keyword: next, category },
    });
  };

  const handleCategoryChange = (value: unknown) => {
    const next = String(value ?? '');
    setCategory(next);
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
          { label: 'ActivityFeed', color: 'blue' },
          { label: 'Timeline', color: 'purple' },
        ]}
      />

      {errorMessage && (
        <Alert
          type="error"
          title="日志加载失败"
          description={errorMessage}
          closable
          onClose={() => setErrorMessage('')}
        />
      )}

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
            <Tag color="blue" size="sm">
              认证事件 {authCount}
            </Tag>
            <Tag color="green" size="sm">
              用户事件 {userCount}
            </Tag>
            <Tag color="purple" size="sm">
              总计 {logs.length}
            </Tag>
            <Button variant="outline" onClick={loadAuditLogs}>
              刷新日志
            </Button>
            {canExport && (
              <Button variant="outline" onClick={() => setExportConfirmOpen(true)}>
                导出 CSV
              </Button>
            )}
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card title="保留策略">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={retentionDays}
              placeholder="保留天数"
              onChange={(event) => setRetentionDays(normalizeInput(event))}
            />
            {canSaveRetention && (
              <Button variant="outline" onClick={handleSaveRetention}>
                保存策略
              </Button>
            )}
            {canSaveRetention && (
              <Button
                variant="outline"
                onClick={() => runRetentionCleanup(true)}>
                预览清理
              </Button>
            )}
          </div>
        </Card>

        <Card title="事件详情">
          {selectedLog ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {logs.slice(0, 5).map((log) => (
                  <Button
                    key={log.id}
                    variant="outline"
                    onClick={() => setSelectedLog(log)}>
                    {selectedLog.id === log.id ? `当前：${log.title}` : log.title}
                  </Button>
                ))}
              </div>
              <Text weight="bold">{selectedLog.title}</Text>
              <Text size="sm" color="secondary">
                {selectedLog.description}
              </Text>
              <Text size="sm" color="secondary">
                {selectedLog.eventType} · {selectedLog.actor ?? '系统'} ·{' '}
                {formatDateTime(selectedLog.occurredAtUtc)}
              </Text>
              <pre className="max-h-72 max-w-full overflow-auto rounded bg-(--tiger-bg-hover,#f8fafc) p-3 text-sm">
                {JSON.stringify(selectedLog.data, null, 2)}
              </pre>
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
        open={exportConfirmOpen}
        title="确认导出审计日志"
        showDefaultFooter
        okText={exporting ? '导出中…' : '导出 CSV'}
        cancelText="取消"
        confirmLoading={exporting}
        onOk={handleConfirmExport}
        onCancel={() => setExportConfirmOpen(false)}>
        <Text color="secondary">
          将按当前关键词和分类筛选导出最近审计窗口中的 {logs.length} 条记录。
        </Text>
      </Modal>

      <Modal
        open={cleanupConfirmOpen}
        title="确认清理审计日志"
        showDefaultFooter
        okText={cleaningRetention ? '清理中...' : '执行清理'}
        cancelText="关闭"
        confirmLoading={cleaningRetention}
        onOk={() => runRetentionCleanup(false)}
        onCancel={() => setCleanupConfirmOpen(false)}>
        <div className="space-y-3">
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
    </div>
  );
}

export default AuditLogsPage;
