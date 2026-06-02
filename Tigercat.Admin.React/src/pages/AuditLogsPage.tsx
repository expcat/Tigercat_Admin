import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityFeed,
  Alert,
  Button,
  Card,
  Input,
  Tag,
  Text,
  Timeline,
} from '@expcat/tigercat-react';
import type { ActivityItem, TimelineItem } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import {
  ActivityIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '../components/Icons';
import { apiRequest, getAuthHeaders, normalizeInput } from '../utils';
import type {
  AuditLogItem,
  AuditRetentionPolicy,
  PagedResult,
} from '../utils/types';

const CONTAINS_CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/;

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
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [keyword, setKeyword] = useState('');
  const [retentionDays, setRetentionDays] = useState('90');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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

      const payload = await apiRequest<PagedResult<AuditLogItem>>(
        `/api/audit-logs?${params}`,
        {
          headers: getAuthHeaders(),
        },
      );
      setLogs(payload.data.items);
      setSelectedLog((current) => {
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
  }, [keyword]);

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

  const handleExport = useCallback(async () => {
    const params = new URLSearchParams();
    if (keyword.trim()) {
      params.set('keyword', keyword.trim());
    }

    try {
      const response = await fetch(`/api/audit-logs/export?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(response.statusText || '导出失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '导出失败');
    }
  }, [keyword]);

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

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Text weight="bold">审计事件查询</Text>
            <Text size="sm" color="secondary">
              页面通过 API 查询 Redis Streams 聚合结果，支持分页、筛选、详情和导出。
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={keyword}
              placeholder="筛选标题、说明或事件类型"
              onChange={(event) => setKeyword(normalizeInput(event))}
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
            <Button variant="outline" onClick={handleExport}>
              导出 CSV
            </Button>
          </div>
        </div>
      </Card>

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
            <Text color="secondary">正在读取最新事件...</Text>
          ) : timelineItems.length === 0 ? (
            <Text color="secondary">暂无可展示的时间线数据。</Text>
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
            <Button variant="outline" onClick={handleSaveRetention}>
              保存策略
            </Button>
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
              <pre className="max-h-72 overflow-auto rounded bg-(--tiger-bg-hover,#f8fafc) p-3 text-sm">
                {JSON.stringify(selectedLog.data, null, 2)}
              </pre>
            </div>
          ) : (
            <Text color="secondary">暂无可查看的审计详情。</Text>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <ShieldCheckIcon size={20} />
            </div>
            <div>
              <Text weight="bold">认证链路</Text>
              <Text size="sm" color="secondary">
                覆盖注册、登录、改密、退出等认证事件。
              </Text>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <UsersIcon size={20} />
            </div>
            <div>
              <Text weight="bold">用户管理</Text>
              <Text size="sm" color="secondary">
                覆盖用户创建、更新、删除、批量删除与密码重置。
              </Text>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <CheckCircleIcon size={20} />
            </div>
            <div>
              <Text weight="bold">实时回看</Text>
              <Text size="sm" color="secondary">
                当前以最近事件窗口为主，后续可继续扩展筛选与通知联动。
              </Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default AuditLogsPage;
