import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NotificationItem } from '@expcat/tigercat-core';
import {
  Button,
  Card,
  Text,
  notification,
} from '@expcat/tigercat-react';
import { NotificationCenter } from '@expcat/tigercat-react/NotificationCenter';
import { PageHeader } from '../components/PageHeader';
import {
  BellIcon,
  CheckCircleIcon,
  ServerIcon,
  ShieldCheckIcon,
} from '../components/Icons';
import {
  MetricCard,
  MetricGrid,
  MutedPanel,
  PageActionPanel,
} from '../components/PageFragments';
import {
  buildNotificationGroups,
  countUnreadNotifications,
  findNotificationById,
  getNotificationGroupLabel,
  setNotificationReadState,
} from '../utils/notifications';
import { apiRequest, getAuthHeaders } from '../utils';
import type {
  AdminNotificationGroupKey,
  AdminNotificationItem,
  AdminNotificationToastType,
  PagedResult,
} from '../utils/types';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function showNotification(
  type: AdminNotificationToastType,
  title: string,
  description: string,
) {
  switch (type) {
    case 'success':
      notification.success({ title, description });
      break;
    case 'warning':
      notification.warning({ title, description });
      break;
    case 'error':
      notification.error({ title, description });
      break;
    default:
      notification.info({ title, description });
      break;
  }
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = await apiRequest<PagedResult<AdminNotificationItem>>(
        '/api/notifications?page=1&pageSize=100',
        { headers: getAuthHeaders() },
      );
      setNotifications(payload.data.items);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : '通知加载失败，请稍后重试。';
      setErrorMessage(message);
      showNotification('error', '通知加载失败', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const notificationGroups = useMemo(
    () => buildNotificationGroups(notifications),
    [notifications],
  );
  const unreadCount = useMemo(
    () => countUnreadNotifications(notifications),
    [notifications],
  );
  const opsUnreadCount = useMemo(
    () => countUnreadNotifications(notifications, 'ops'),
    [notifications],
  );
  const securityUnreadCount = useMemo(
    () => countUnreadNotifications(notifications, 'security'),
    [notifications],
  );
  const releaseUnreadCount = useMemo(
    () => countUnreadNotifications(notifications, 'release'),
    [notifications],
  );

  const handleItemClick = useCallback(
    (item: NotificationItem) => {
      const currentItem = findNotificationById(notifications, item.id);
      if (!currentItem) {
        return;
      }

      showNotification(
        currentItem.toastType,
        currentItem.title,
        currentItem.description,
      );
    },
    [notifications],
  );

  const handleItemReadChange = useCallback(
    async (item: NotificationItem, read: boolean) => {
      const currentItem = findNotificationById(notifications, item.id);
      setNotifications((prev) => setNotificationReadState(prev, item.id, read));

      try {
        await apiRequest<AdminNotificationItem>(
          `/api/notifications/${item.id}/read`,
          {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ read }),
          },
        );
      } catch (error) {
        setNotifications((prev) =>
          setNotificationReadState(prev, item.id, !read),
        );
        showNotification(
          'error',
          '通知状态保存失败',
          error instanceof Error ? error.message : '请稍后重试。',
        );
        return;
      }

      if (currentItem) {
        showNotification(
          'info',
          read ? '通知已标记为已读' : '通知已恢复为未读',
          currentItem.title,
        );
      }
    },
    [notifications],
  );

  const handleMarkAllRead = useCallback(
    async (groupKey: string | number | undefined, items: NotificationItem[]) => {
      try {
        await apiRequest('/api/notifications/mark-read', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            groupKey: groupKey ? String(groupKey) : null,
          }),
        });
        await loadNotifications();
      } catch (error) {
        showNotification(
          'error',
          '批量已读失败',
          error instanceof Error ? error.message : '请稍后重试。',
        );
        return;
      }

      const groupTitle = groupKey
        ? getNotificationGroupLabel(groupKey as AdminNotificationGroupKey)
        : '全部通知';
      showNotification(
        'success',
        `${groupTitle}已全部标记为已读`,
        `本次共处理 ${items.length} 条通知。`,
      );
    },
    [loadNotifications],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="通知中心"
        subtitle="集中查看系统运维、安全提醒与版本动态，并在同一页验证 Badge 与 Notification 交互。"
        icon={<BellIcon size={24} className="text-white" />}
        tags={[
          { label: 'NotificationCenter', color: 'blue' },
          { label: 'Badge', color: 'orange' },
          { label: 'Notification', color: 'green' },
        ]}
      />

      <PageActionPanel
        title="通知收件箱"
        description="通知来自后端数据源，未读状态、分组和批量已读会持久化保存。"
        actions={
          <Button variant="outline" onClick={loadNotifications}>
            刷新通知
          </Button>
        }
      />

      {errorMessage && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Text color="danger">{errorMessage}</Text>
            <Button variant="outline" onClick={loadNotifications}>
              重试
            </Button>
          </div>
        </Card>
      )}

      <MetricGrid columns={4}>
        <MetricCard
          title="未读总数"
          description={`全部分组合计 ${unreadCount} 条未读通知。`}
          badge={unreadCount}
          icon={<BellIcon size={20} />}
        />
        <MetricCard
          title="系统运维"
          description="缓存、发布窗口和服务健康类提醒。"
          badge={opsUnreadCount}
          icon={<ServerIcon size={20} />}
        />
        <MetricCard
          title="安全提醒"
          description="密码策略、权限复核和风险检查提醒。"
          badge={securityUnreadCount}
          icon={<ShieldCheckIcon size={20} />}
        />
        <MetricCard
          title="版本动态"
          description="记录 UI 升级、审计能力上线和里程碑变更。"
          badge={releaseUnreadCount}
          icon={<CheckCircleIcon size={20} />}
        />
      </MetricGrid>

      <Card title="通知中心组件验证">
        <NotificationCenter
          title="后台通知"
          groups={notificationGroups}
          emptyText={loading ? '正在加载通知...' : '暂无通知'}
          markAllReadText="全部标记为已读"
          markReadText="设为已读"
          markUnreadText="恢复未读"
          allLabel="全部"
          unreadLabel="未读"
          readLabel="已读"
          onItemClick={handleItemClick}
          onItemReadChange={handleItemReadChange}
          onMarkAllRead={handleMarkAllRead}
        />
      </Card>

      <Card>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {notifications.slice(0, 2).map((item) => (
            <MutedPanel
              key={item.id}
              title={item.title}
              description={`${formatDateTime(item.time)} · ${item.description} · 来源：${item.meta.source ?? 'backend'} · 级别：${item.meta.severity ?? 'normal'}`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

export default NotificationsPage;
