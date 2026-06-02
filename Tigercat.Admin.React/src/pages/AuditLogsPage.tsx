import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityFeed,
  Alert,
  Button,
  Card,
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
import { apiRequest, getAuthHeaders } from '../utils';
import type { AuditLogItem } from '../utils/types';

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
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = await apiRequest<AuditLogItem[]>(
        '/api/audit-logs?limit=60',
        {
          headers: getAuthHeaders(),
        },
      );
      setLogs(payload.data);
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

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
            <Text weight="bold">最近 60 条审计事件</Text>
            <Text size="sm" color="secondary">
              数据直接来自 Redis Streams，按时间倒序聚合认证流与管理流。
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
