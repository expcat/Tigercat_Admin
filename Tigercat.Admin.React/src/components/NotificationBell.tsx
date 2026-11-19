import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notification } from '@expcat/tigercat-react/notification';
import { Badge } from '@expcat/tigercat-react/Badge';
import { Button } from '@expcat/tigercat-react/Button';
import { Text } from '@expcat/tigercat-react/Text';
import { Popover } from '@expcat/tigercat-react/Popover';
import { BellIcon } from './Icons';
import { apiRequest, getAuthHeaders } from '../utils';
import {
  countUnreadNotifications,
  fetchNotifications,
  notifyNotificationsChanged,
  NOTIFICATIONS_CHANGED_EVENT,
} from '../utils/notifications';
import type { AdminNotificationItem } from '../utils/types';
import { usePermission } from '../utils/permission';

const formatTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export function NotificationBell() {
  const navigate = useNavigate();
  const { has: hasPerm } = usePermission();
  const canEdit = hasPerm('notification:edit');

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [savingRead, setSavingRead] = useState(false);
  const loadController = useRef<AbortController | null>(null);
  const savingReadRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => countUnreadNotifications(items), [items]);
  const recentItems = useMemo(() => items.slice(0, 5), [items]);

  const loadNotifications = useCallback(async () => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    setErrorMessage('');
    try {
      const payload = await fetchNotifications(controller.signal);
      if (controller.signal.aborted) return;
      setItems(payload.data.items);
    } catch (error) {
      if (controller.signal.aborted) return;
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : '通知加载失败，请稍后重试。',
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    return () => loadController.current?.abort();
  }, [loadNotifications]);

  useEffect(() => {
    const onChanged = () => {
      void loadNotifications();
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
  }, [loadNotifications]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      void loadNotifications();
      requestAnimationFrame(() => {
        panelRef.current
          ?.querySelector<HTMLButtonElement>('button:not([disabled])')
          ?.focus();
      });
    }
  };

  const handleItemClick = (item: AdminNotificationItem) => {
    setOpen(false);
    const goNotifications = () => navigate('/notifications');
    const config = {
      title: item.title,
      description: item.description,
      actions: [
        {
          key: 'view',
          label: '查看',
          type: 'primary' as const,
          closeOnClick: true,
          onClick: goNotifications,
        },
      ],
    };
    switch (item.toastType) {
      case 'success':
        notification.success(config);
        break;
      case 'warning':
        notification.warning(config);
        break;
      case 'error':
        notification.error(config);
        break;
      default:
        notification.info(config);
        break;
    }
  };

  const handleMarkAllRead = async () => {
    if (!canEdit) {
      notification.warning({
        title: '权限不足',
        description: '当前账号没有修改通知已读状态的权限。',
      });
      return;
    }
    if (!unreadCount || savingReadRef.current) {
      return;
    }
    savingReadRef.current = true;
    setSavingRead(true);
    try {
      await apiRequest('/api/notifications/mark-read', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ groupKey: null }),
      });
      notifyNotificationsChanged();
      notification.success({
        title: '通知已全部标记为已读',
        description: '所有分组的未读通知已清空。',
      });
    } catch (error) {
      notification.error({
        title: '批量已读失败',
        description: error instanceof Error ? error.message : '请稍后重试。',
      });
    } finally {
      savingReadRef.current = false;
      setSavingRead(false);
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/notifications');
  };

  const panel = (
    <div ref={panelRef} className="flex max-h-[26rem] flex-col">
      <div className="flex items-center justify-between border-b border-(--tiger-border,#e5e7eb) px-4 py-3">
        <Text weight="bold">通知</Text>
        <Button
          variant="link"
          className="!px-0"
          disabled={!unreadCount}
          loading={savingRead}
          onClick={handleMarkAllRead}
        >
          全部已读
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {errorMessage && (
          <div role="alert" className="border-b border-(--tiger-border,#e5e7eb) px-4 py-3">
            <Text size="sm" color="danger">{errorMessage}</Text>
          </div>
        )}
        {loading && recentItems.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <Text color="secondary">正在加载通知...</Text>
          </div>
        ) : recentItems.length === 0 && !errorMessage ? (
          <div className="px-4 py-6 text-center">
            <Text color="secondary">暂无通知</Text>
          </div>
        ) : recentItems.length > 0 ? (
          <ul className="divide-y divide-(--tiger-border,#e5e7eb)">
            {recentItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)"
                  onClick={() => handleItemClick(item)}
                >
                  <span className="flex items-center gap-2">
                    {!item.read && <span className="sr-only">未读通知：</span>}
                    {!item.read && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-(--tiger-primary,#3b82f6)"
                        aria-hidden="true"
                      />
                    )}
                    <Text size="sm" weight="medium" className="min-w-0 truncate">
                      {item.title}
                    </Text>
                  </span>
                  <Text size="sm" color="secondary" className="line-clamp-2">
                    {item.description}
                  </Text>
                  <Text size="xs" color="secondary">
                    {formatTime(item.time)}
                  </Text>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="border-t border-(--tiger-border,#e5e7eb) px-4 py-2">
        <Button variant="ghost" className="w-full" onClick={handleViewAll}>
          查看全部通知
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottom-end"
      ariaLabel="通知"
      width={360}
      content={panel}
    >
      <button
        type="button"
        data-tour="notification-bell"
        aria-label="通知"
        className={`flex h-10 w-10 items-center justify-center rounded-lg text-(--tiger-text,#1f2937) transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9) ${open ? 'bg-(--tiger-bg-hover,#f1f5f9)' : ''}`}
      >
        <Badge
          content={unreadCount}
          max={99}
          showZero={false}
          standalone={false}
          variant="danger"
        >
          <BellIcon size={20} />
        </Badge>
      </button>
    </Popover>
  );
}
