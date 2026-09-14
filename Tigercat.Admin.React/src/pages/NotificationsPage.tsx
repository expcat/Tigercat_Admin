import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationItem } from '@expcat/tigercat-core';
import { notification } from '@expcat/tigercat-react';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Form } from '@expcat/tigercat-react/Form';
import { FormItem } from '@expcat/tigercat-react/FormItem';
import { Input } from '@expcat/tigercat-react/Input';
import { Message } from '@expcat/tigercat-react/Message';
import { Modal } from '@expcat/tigercat-react/Modal';
import { Select } from '@expcat/tigercat-react/Select';
import { Text } from '@expcat/tigercat-react/Text';
import { NotificationCenter } from '@expcat/tigercat-react/NotificationCenter';
import { Textarea } from '@expcat/tigercat-react/Textarea';
import { PageHeader } from '../components/PageHeader';
import { PermissionGuard } from '../components/PermissionGuard';
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
  createNotification,
  fetchNotifications,
  findNotificationById,
  getNotificationGroupLabel,
  notifyNotificationsChanged,
  setNotificationReadState,
} from '../utils/notifications';
import { apiRequest, getAuthHeaders, normalizeInput } from '../utils';
import { usePermission } from '../utils/permission';
import type {
  AdminNotificationGroupKey,
  AdminNotificationItem,
  AdminNotificationToastType,
} from '../utils/types';

type CreateFormState = {
  title: string;
  description: string;
  groupKey: AdminNotificationGroupKey;
  toastType: AdminNotificationToastType;
  linkUrl: string;
};

const EMPTY_CREATE_FORM: CreateFormState = {
  title: '',
  description: '',
  groupKey: 'ops',
  toastType: 'info',
  linkUrl: '',
};

const GROUP_OPTIONS = [
  { label: '系统运维', value: 'ops' },
  { label: '安全提醒', value: 'security' },
  { label: '版本动态', value: 'release' },
];

const TOAST_OPTIONS = [
  { label: '信息', value: 'info' },
  { label: '成功', value: 'success' },
  { label: '警告', value: 'warning' },
  { label: '错误', value: 'error' },
];

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const LINK_PERMISSION_MAP: Array<[RegExp, string]> = [
  [/^\/users(?:[/?#]|$)/, 'user:view'],
  [/^\/roles(?:[/?#]|$)/, 'role:view'],
  [/^\/files(?:[/?#]|$)/, 'media:view'],
  [/^\/tasks(?:[/?#]|$)/, 'task:view'],
  [/^\/audit-logs(?:[/?#]|$)/, 'audit:view'],
  [/^\/settings(?:[/?#]|$)/, 'setting:view'],
];

const getRequiredPermissionForLink = (linkUrl: string) =>
  LINK_PERMISSION_MAP.find(([pattern]) => pattern.test(linkUrl))?.[1] ?? null;

const isSafeInternalLink = (linkUrl: string) =>
  linkUrl.startsWith('/') && !linkUrl.startsWith('//');

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
  const navigate = useNavigate();
  const { has: hasPerm } = usePermission();
  const canCreate = hasPerm('notification:create');
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({ ...EMPTY_CREATE_FORM });

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = await fetchNotifications();
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

  const persistReadState = useCallback(async (id: string, read: boolean) => {
    await apiRequest<AdminNotificationItem>(
      `/api/notifications/${id}/read`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ read }),
      },
    );
  }, []);

  const handleItemClick = useCallback(
    async (item: NotificationItem) => {
      const currentItem = findNotificationById(notifications, item.id);
      if (!currentItem) {
        return;
      }

      if (currentItem.linkUrl) {
        if (!isSafeInternalLink(currentItem.linkUrl)) {
          showNotification('error', '无法打开通知链接', '通知链接不是安全的站内路径。');
          return;
        }

        const requiredPermission = getRequiredPermissionForLink(currentItem.linkUrl);
        if (requiredPermission && !hasPerm(requiredPermission)) {
          showNotification('warning', '权限不足', '当前账号无权访问这条通知指向的页面。');
          return;
        }

        if (!currentItem.read) {
          setNotifications((prev) => setNotificationReadState(prev, item.id, true));
          try {
            await persistReadState(String(item.id), true);
            notifyNotificationsChanged();
          } catch {
            setNotifications((prev) => setNotificationReadState(prev, item.id, false));
          }
        }

        navigate(currentItem.linkUrl);
        return;
      }

      showNotification(
        currentItem.toastType,
        currentItem.title,
        currentItem.description,
      );
    },
    [hasPerm, navigate, notifications, persistReadState],
  );

  const handleItemReadChange = useCallback(
    async (item: NotificationItem, read: boolean) => {
      const currentItem = findNotificationById(notifications, item.id);
      setNotifications((prev) => setNotificationReadState(prev, item.id, read));

      try {
        await persistReadState(String(item.id), read);
        notifyNotificationsChanged();
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
    [notifications, persistReadState],
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
        notifyNotificationsChanged();
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

  const openCreateModal = () => {
    setCreateForm({ ...EMPTY_CREATE_FORM });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const title = createForm.title.trim();
    if (!title) {
      Message.warning({ content: '请填写通知标题', duration: 2000 });
      return;
    }
    const linkUrl = createForm.linkUrl?.trim() ?? '';
    if (linkUrl && !isSafeInternalLink(linkUrl)) {
      Message.error({ content: '通知链接必须是站内路径', duration: 3000 });
      return;
    }
    setSubmitting(true);
    try {
      await createNotification({
        groupKey: createForm.groupKey,
        title,
        description: createForm.description.trim(),
        toastType: createForm.toastType,
        linkUrl: linkUrl || null,
      });
      setCreateOpen(false);
      notifyNotificationsChanged();
      showNotification('success', '通知已创建', title);
      await loadNotifications();
    } catch (error) {
      Message.error({
        content: error instanceof Error ? error.message : '创建通知失败',
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="通知中心"
        subtitle="集中查看系统运维、安全提醒与版本动态，并在同一页验证 Badge 与 Notification 交互。"
        icon={<BellIcon size={24} className="text-white" />}
        tags={[
          { label: 'NotificationCenter', variant: 'primary' },
          { label: 'Badge', variant: 'warning' },
          { label: 'Notification', variant: 'success' },
        ]}
      />

      <PageActionPanel
        title="通知收件箱"
        description="通知来自后端数据源，未读状态、分组和批量已读会持久化保存。"
        actions={
          <>
            {canCreate && (
              <PermissionGuard code="notification:create">
                <Button onClick={openCreateModal}>创建通知</Button>
              </PermissionGuard>
            )}
            <Button variant="outline" onClick={loadNotifications}>
              刷新通知
            </Button>
          </>
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

      <Modal
        open={createOpen}
        title="创建通知"
        showDefaultFooter
        okText={submitting ? '创建中...' : '创建'}
        cancelText="取消"
        onOk={() => void submitCreate()}
        onCancel={() => setCreateOpen(false)}>
        <div className="p2-modal-scroll">
          <Form value={createForm as Record<string, unknown>} labelWidth={88}>
            <FormItem label="标题" name="title">
              <Input
                value={createForm.title}
                placeholder="请输入通知标题"
                onChange={(val) =>
                  setCreateForm((prev) => ({ ...prev, title: normalizeInput(val) }))
                }
              />
            </FormItem>
            <FormItem label="描述" name="description">
              <Textarea
                value={createForm.description}
                rows={4}
                placeholder="请输入通知描述（选填）"
                onChange={(v) =>
                  setCreateForm((prev) => ({ ...prev, description: String(v) }))
                }
              />
            </FormItem>
            <FormItem label="分组" name="groupKey">
              <Select
                value={createForm.groupKey}
                options={GROUP_OPTIONS}
                placeholder="请选择分组"
                onChange={(val) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    groupKey: (val as AdminNotificationGroupKey) ?? 'ops',
                  }))
                }
              />
            </FormItem>
            <FormItem label="类型" name="toastType">
              <Select
                value={createForm.toastType}
                options={TOAST_OPTIONS}
                placeholder="请选择类型"
                onChange={(val) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    toastType: (val as AdminNotificationToastType) ?? 'info',
                  }))
                }
              />
            </FormItem>
            <FormItem label="链接" name="linkUrl">
              <Input
                value={createForm.linkUrl ?? ''}
                placeholder="站内路径，例如 /monitor（选填）"
                onChange={(val) =>
                  setCreateForm((prev) => ({ ...prev, linkUrl: normalizeInput(val) }))
                }
              />
            </FormItem>
          </Form>
        </div>
      </Modal>
    </div>
  );
}

export default NotificationsPage;
