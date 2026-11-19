import type {
  NotificationGroup,
  NotificationItem,
} from '@expcat/tigercat-core';
import { apiRequest } from './request';
import { getAuthHeaders } from './auth';
import { formatDisplayDateTime } from './common';
import type {
  AdminNotificationGroupKey,
  AdminNotificationItem,
  AdminNotificationToastType,
  PagedResult,
} from './types';

export const NOTIFICATIONS_CHANGED_EVENT = 'tigercat-admin:notifications-changed';

export interface CreateNotificationPayload {
  groupKey: AdminNotificationGroupKey;
  title: string;
  description: string;
  toastType: AdminNotificationToastType;
  linkUrl?: string | null;
  meta?: Record<string, string>;
}

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
        time: formatDisplayDateTime(item.time),
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

export function findNotificationById(
  items: AdminNotificationItem[],
  id: string | number,
): AdminNotificationItem | undefined {
  return items.find((item) => item.id === String(id));
}

export function notifyNotificationsChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export function fetchNotifications(signal?: AbortSignal) {
  return apiRequest<PagedResult<AdminNotificationItem>>(
    '/api/notifications?page=1&pageSize=100',
    { headers: getAuthHeaders(), signal },
  );
}

export function createNotification(payload: CreateNotificationPayload) {
  return apiRequest<AdminNotificationItem>('/api/notifications', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

const LINK_PERMISSION_MAP: Array<[RegExp, string]> = [
  [/^\/users(?:[/?#]|$)/, 'user:view'],
  [/^\/roles(?:[/?#]|$)/, 'role:view'],
  [/^\/menus(?:[/?#]|$)/, 'menu:view'],
  [/^\/files(?:[/?#]|$)/, 'media:view'],
  [/^\/tasks(?:[/?#]|$)/, 'task:view'],
  [/^\/audit-logs(?:[/?#]|$)/, 'audit:view'],
  [/^\/settings(?:[/?#]|$)/, 'setting:view'],
];

export const getRequiredPermissionForLink = (linkUrl: string) =>
  LINK_PERMISSION_MAP.find(([pattern]) => pattern.test(linkUrl))?.[1] ?? null;

export const isSafeInternalLink = (linkUrl: string) =>
  linkUrl.startsWith('/') && !linkUrl.startsWith('//') && !/[\\\s]/.test(linkUrl);
