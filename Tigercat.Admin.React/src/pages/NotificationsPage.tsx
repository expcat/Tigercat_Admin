import { useCallback, useMemo, useState } from 'react';
import type { NotificationItem } from '@expcat/tigercat-core';
import {
  Badge,
  Button,
  Card,
  NotificationCenter,
  Text,
  notification,
} from '@expcat/tigercat-react';
import { PageHeader } from '../components/PageHeader';
import {
  BellIcon,
  CheckCircleIcon,
  ServerIcon,
  ShieldCheckIcon,
} from '../components/Icons';
import {
  buildNotificationGroups,
  countUnreadNotifications,
  createInitialNotifications,
  findNotificationById,
  getNotificationGroupLabel,
  markNotificationsRead,
  setNotificationReadState,
} from '../utils/notifications';
import type {
  AdminNotificationGroupKey,
  AdminNotificationItem,
  AdminNotificationToastType,
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
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>(
    () => createInitialNotifications(),
  );

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

  const handleTriggerPreview = useCallback(() => {
    showNotification(
      'info',
      '通知中心已准备就绪',
      `当前还有 ${unreadCount} 条未读通知，可继续验证筛选、已读切换和分组浏览。`,
    );
  }, [unreadCount]);

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
    (item: NotificationItem, read: boolean) => {
      const currentItem = findNotificationById(notifications, item.id);
      setNotifications((prev) => setNotificationReadState(prev, item.id, read));

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
    (groupKey: string | number | undefined, items: NotificationItem[]) => {
      setNotifications((prev) => markNotificationsRead(prev, groupKey));

      const groupTitle = groupKey
        ? getNotificationGroupLabel(groupKey as AdminNotificationGroupKey)
        : '全部通知';
      showNotification(
        'success',
        `${groupTitle}已全部标记为已读`,
        `本次共处理 ${items.length} 条通知。`,
      );
    },
    [],
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

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Text weight="bold">通知收件箱</Text>
            <Text size="sm" color="secondary">
              当前使用前端本地数据模拟通知流，后续可直接替换成 Redis Streams
              或异步任务事件源。
            </Text>
          </div>
          <Button variant="outline" onClick={handleTriggerPreview}>
            触发示例通知
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <Badge
              content={unreadCount}
              type="number"
              showZero
              max={99}
              standalone={false}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <BellIcon size={20} />
              </div>
            </Badge>
            <div>
              <Text weight="bold">未读总数</Text>
              <Text size="sm" color="secondary">
                全部分组合计 {unreadCount} 条未读通知。
              </Text>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Badge
              content={opsUnreadCount}
              type="number"
              showZero
              standalone={false}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <ServerIcon size={20} />
              </div>
            </Badge>
            <div>
              <Text weight="bold">系统运维</Text>
              <Text size="sm" color="secondary">
                缓存、发布窗口和服务健康类提醒。
              </Text>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Badge
              content={securityUnreadCount}
              type="number"
              showZero
              standalone={false}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <ShieldCheckIcon size={20} />
              </div>
            </Badge>
            <div>
              <Text weight="bold">安全提醒</Text>
              <Text size="sm" color="secondary">
                密码策略、权限复核和风险检查提醒。
              </Text>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Badge
              content={releaseUnreadCount}
              type="number"
              showZero
              standalone={false}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircleIcon size={20} />
              </div>
            </Badge>
            <div>
              <Text weight="bold">版本动态</Text>
              <Text size="sm" color="secondary">
                记录 UI 升级、审计能力上线和里程碑变更。
              </Text>
            </div>
          </div>
        </Card>
      </div>

      <Card title="通知中心组件验证">
        <NotificationCenter
          title="后台通知"
          groups={notificationGroups}
          emptyText="暂无通知"
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
            <div
              key={item.id}
              className="rounded-2xl border border-[var(--tiger-border,#e2e8f0)] bg-[var(--tiger-bg-hover,#f8fafc)] p-4">
              <div className="flex items-center justify-between gap-3">
                <Text weight="bold">{item.title}</Text>
                <Text size="sm" color="secondary">
                  {formatDateTime(item.time)}
                </Text>
              </div>
              <Text size="sm" color="secondary" className="mt-2">
                {item.description}
              </Text>
              <Text size="sm" color="secondary" className="mt-3">
                来源：{item.meta.owner} · 通道：{item.meta.channel}
              </Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default NotificationsPage;
