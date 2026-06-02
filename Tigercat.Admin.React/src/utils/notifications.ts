import type {
  NotificationGroup,
  NotificationItem,
} from '@expcat/tigercat-core';
import type { AdminNotificationGroupKey, AdminNotificationItem } from './types';

const NOTIFICATION_GROUP_LABELS: Record<AdminNotificationGroupKey, string> = {
  ops: '系统运维',
  security: '安全提醒',
  release: '版本动态',
};

const NOTIFICATION_GROUP_ORDER: AdminNotificationGroupKey[] = [
  'ops',
  'security',
  'release',
];

const INITIAL_NOTIFICATIONS: AdminNotificationItem[] = [
  {
    id: 'ops-deploy-window',
    groupKey: 'ops',
    title: '今晚 22:00 开始执行版本发布窗口',
    description:
      '发布完成后会自动同步缓存预热与健康检查，请提前确认导出任务已结束。',
    time: '2026-05-28T21:30:00+08:00',
    read: false,
    toastType: 'info',
    meta: {
      owner: '平台运维',
      channel: 'stream:system',
    },
  },
  {
    id: 'security-password-policy',
    groupKey: 'security',
    title: '发现 3 个账号尚未完成强密码轮换',
    description:
      '建议在本周内提醒相关管理员修改密码，并复核角色权限是否仍然匹配当前职责。',
    time: '2026-05-28T18:10:00+08:00',
    read: false,
    toastType: 'warning',
    meta: {
      owner: '安全审计',
      channel: 'policy',
    },
  },
  {
    id: 'release-audit-ready',
    groupKey: 'release',
    title: '审计日志聚合页已可用于联调',
    description:
      '前后端已经打通最近 60 条 Redis Streams 审计事件，可继续接通知联动与筛选。',
    time: '2026-05-28T16:45:00+08:00',
    read: true,
    toastType: 'success',
    meta: {
      owner: '管理后台',
      channel: 'roadmap',
    },
  },
  {
    id: 'ops-cache-alert',
    groupKey: 'ops',
    title: '导出缓存命中率低于预期',
    description:
      '最近一小时导出模块缓存命中率降至 71%，建议检查字段模板是否频繁变更。',
    time: '2026-05-28T14:20:00+08:00',
    read: false,
    toastType: 'error',
    meta: {
      owner: '缓存服务',
      channel: 'redis',
    },
  },
  {
    id: 'release-ui-upgrade',
    groupKey: 'release',
    title: 'Tigercat 1.2.14 UI 基线已经完成收口',
    description:
      'Breadcrumb、DataTableWithToolbar、ActivityFeed 等组件已在双端生产构建通过，可继续推进任务面板验证。',
    time: '2026-05-27T11:00:00+08:00',
    read: true,
    toastType: 'info',
    meta: {
      owner: '前端组',
      channel: 'changelog',
    },
  },
];

export function createInitialNotifications(): AdminNotificationItem[] {
  return INITIAL_NOTIFICATIONS.map((item) => ({
    ...item,
    meta: { ...item.meta },
  }));
}

export function getNotificationGroupLabel(
  groupKey: AdminNotificationGroupKey,
): string {
  return NOTIFICATION_GROUP_LABELS[groupKey];
}

export function buildNotificationGroups(
  items: AdminNotificationItem[],
): NotificationGroup[] {
  return NOTIFICATION_GROUP_ORDER.map((groupKey) => ({
    key: groupKey,
    title: NOTIFICATION_GROUP_LABELS[groupKey],
    items: items
      .filter((item) => item.groupKey === groupKey)
      .map<NotificationItem>((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        time: item.time,
        read: item.read,
        meta: item.meta,
      })),
  })).filter((group) => group.items.length > 0);
}

export function countUnreadNotifications(
  items: AdminNotificationItem[],
  groupKey?: AdminNotificationGroupKey,
): number {
  return items.filter(
    (item) => !item.read && (!groupKey || item.groupKey === groupKey),
  ).length;
}

export function setNotificationReadState(
  items: AdminNotificationItem[],
  id: string | number,
  read: boolean,
): AdminNotificationItem[] {
  return items.map((item) =>
    item.id === String(id)
      ? {
          ...item,
          read,
        }
      : item,
  );
}

export function markNotificationsRead(
  items: AdminNotificationItem[],
  groupKey?: string | number,
): AdminNotificationItem[] {
  return items.map((item) =>
    groupKey && item.groupKey !== groupKey
      ? item
      : {
          ...item,
          read: true,
        },
  );
}

export function findNotificationById(
  items: AdminNotificationItem[],
  id: string | number,
): AdminNotificationItem | undefined {
  return items.find((item) => item.id === String(id));
}
