import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Text, notification } from '@expcat/tigercat-react';
import { Popover } from '@expcat/tigercat-react/Popover';
import { BellIcon } from './Icons';
import { apiRequest, getAuthHeaders } from '../utils';
import { countUnreadNotifications } from '../utils/notifications';
import type { AdminNotificationItem, PagedResult } from '../utils/types';

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

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AdminNotificationItem[]>([]);

  const unreadCount = useMemo(() => countUnreadNotifications(items), [items]);
  const recentItems = useMemo(() => items.slice(0, 5), [items]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest<PagedResult<AdminNotificationItem>>(
        '/api/notifications?page=1&pageSize=100',
        { headers: getAuthHeaders() },
      );
      setItems(payload.data.items);
    } catch {
      // 顶部铃铛失败时保持静默，通知中心页面会展示详细错误。
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleItemClick = (item: AdminNotificationItem) => {
    setOpen(false);
    const config = {
      title: item.title,
      description: item.description,
      onClick: () => navigate('/notifications'),
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
    if (!unreadCount) {
      return;
    }
    try {
      await apiRequest('/api/notifications/mark-read', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ groupKey: null }),
      });
      await loadNotifications();
      notification.success({
        title: '通知已全部标记为已读',
        description: '所有分组的未读通知已清空。',
      });
    } catch (error) {
      notification.error({
        title: '批量已读失败',
        description: error instanceof Error ? error.message : '请稍后重试。',
      });
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/notifications');
  };

  const panel = (
    <div className="flex max-h-[26rem] flex-col">
      <div className="flex items-center justify-between border-b border-(--tiger-border,#e5e7eb) px-4 py-3">
        <Text weight="bold">通知</Text>
        <Button
          variant="link"
          className="!px-0"
          disabled={!unreadCount}
          onClick={handleMarkAllRead}
        >
          全部已读
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="px-4 py-6 text-center">
            <Text color="secondary">正在加载通知...</Text>
          </div>
        ) : recentItems.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <Text color="secondary">暂无通知</Text>
          </div>
        ) : (
          <ul className="divide-y divide-(--tiger-border,#e5e7eb)">
            {recentItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)"
                  onClick={() => handleItemClick(item)}
                >
                  <span className="flex items-center gap-2">
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
        )}
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
      onOpenChange={setOpen}
      trigger="click"
      placement="bottom-end"
      width={360}
      contentContent={panel}
    >
      <button
        type="button"
        data-tour="notification-bell"
        aria-label="通知"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-(--tiger-text,#1f2937) transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)"
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
