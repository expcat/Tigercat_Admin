import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationItem } from '@expcat/tigercat-core';
import { notification } from '@expcat/tigercat-react/notification';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Form } from '@expcat/tigercat-react/Form';
import { FormItem } from '@expcat/tigercat-react/FormItem';
import { Input } from '@expcat/tigercat-react/Input';
import { Alert } from '@expcat/tigercat-react/Alert';
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
  getRequiredPermissionForLink,
  isSafeInternalLink,
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
  NotificationCreateForm,
} from '../utils/types';

const EMPTY_CREATE_FORM: NotificationCreateForm = {
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
  const canEdit = hasPerm('notification:edit');
  const loadController = useRef<AbortController | null>(null);
  const readLocked = useRef(false);
  const submittingRef = useRef(false);
  const createTrigger = useRef<HTMLElement | null>(null);
  const [savingRead, setSavingRead] = useState(false);
  const [total, setTotal] = useState(0);
  const [createError, setCreateError] = useState('');
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<NotificationCreateForm>({ ...EMPTY_CREATE_FORM });

  const loadNotifications = useCallback(async () => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    setErrorMessage('');
    setNotifications([]);
    setTotal(0);

    try {
      const payload = await fetchNotifications(controller.signal);
      if (controller.signal.aborted) return;
      setNotifications(payload.data.items);
      setTotal(payload.data.total);
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof Error && error.message
          ? error.message
          : '通知加载失败，请稍后重试。';
      setErrorMessage(message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    return () => loadController.current?.abort();
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

  const handleItemReadChange = async (item: NotificationItem, read: boolean): Promise<boolean> => {
    if (!canEdit) {
      showNotification('warning', '权限不足', '当前账号没有修改通知已读状态的权限。');
      return false;
    }
    const currentItem = findNotificationById(notifications, item.id);
    if (!currentItem || loading || submittingRef.current || readLocked.current) return false;
    readLocked.current = true;
    setSavingRead(true);
    try {
      await persistReadState(String(item.id), read);
      setNotifications((prev) => setNotificationReadState(prev, item.id, read));
      notifyNotificationsChanged();
      return true;
    } catch (error) {
      showNotification('error', '通知状态保存失败', error instanceof Error ? error.message : '请重试。');
      return false;
    } finally {
      readLocked.current = false;
      setSavingRead(false);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (loading || submittingRef.current || readLocked.current) return;
    const currentItem = findNotificationById(notifications, item.id);
    if (!currentItem) return;
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
      if (!currentItem.read && canEdit && !await handleItemReadChange(item, true)) return;
      navigate(currentItem.linkUrl);
      return;
    }
    showNotification(currentItem.toastType, currentItem.title, currentItem.description);
  };

  const handleMarkAllRead = async (groupKey: string | number | undefined) => {
    if (!canEdit) {
      showNotification('warning', '权限不足', '当前账号没有修改通知已读状态的权限。');
      return;
    }
    if (loading || submittingRef.current || readLocked.current) return;
    readLocked.current = true;
    setSavingRead(true);
    try {
      await apiRequest('/api/notifications/mark-read', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ groupKey: groupKey ? String(groupKey) : null }),
      });
      notifyNotificationsChanged();
      await loadNotifications();
      const groupTitle = groupKey ? getNotificationGroupLabel(groupKey as AdminNotificationGroupKey) : '全部通知';
      showNotification('success', `${groupTitle}已全部标记为已读`, '已保存共享通知的已读状态。');
    } catch (error) {
      showNotification('error', '批量已读失败', error instanceof Error ? error.message : '请重试。');
    } finally {
      readLocked.current = false;
      setSavingRead(false);
    }
  };

  const openCreateModal = () => {
    if (!canCreate) return;
    createTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCreateError('');
    setCreateForm({ ...EMPTY_CREATE_FORM });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!canCreate || submittingRef.current) return;
    setCreateError('');
    const title = createForm.title.trim();
    if (!title) {
      setCreateError('请填写通知标题');
      document.getElementById('notification-title')?.focus();
      return;
    }
    const linkUrl = createForm.linkUrl?.trim() ?? '';
    if (linkUrl && !isSafeInternalLink(linkUrl)) {
      setCreateError('通知链接必须是安全站内路径');
      document.getElementById('notification-link')?.focus();
      return;
    }
    submittingRef.current = true;
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
      setCreateError(error instanceof Error ? error.message : '创建通知失败');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="通知中心"
        subtitle="查看系统运维、安全提醒与版本动态。通知及已读状态由所有账号共享。"
        icon={<BellIcon size={24} className="text-white" />}
        tags={[
          { label: 'NotificationCenter', variant: 'primary' },
          { label: 'Badge', variant: 'warning' },
          { label: 'Notification', variant: 'success' },
        ]}
      />

      <PageActionPanel
        title="通知收件箱"
        description={`共 ${total} 条共享通知，当前加载前 ${notifications.length} 条；下方未读统计仅覆盖这些记录。${canEdit ? '' : '当前账号仅可查看。'}`}
        actions={
          <>
            {canCreate && (
              <PermissionGuard code="notification:create">
                <Button disabled={savingRead || submitting} onClick={openCreateModal}>创建通知</Button>
              </PermissionGuard>
            )}
            <Button variant="outline" disabled={loading || savingRead || submitting} onClick={() => void loadNotifications()}>
              刷新通知
            </Button>
          </>
        }
      />

      {errorMessage && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Text color="danger">{errorMessage}</Text>
            <Button variant="outline" disabled={loading || savingRead || submitting} onClick={() => void loadNotifications()}>
              重试
            </Button>
          </div>
        </Card>
      )}

      <MetricGrid columns={4}>
        <MetricCard
          title="当前加载未读"
          description={`已加载记录中 ${unreadCount} 条未读通知。`}
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
          loading={loading || savingRead || submitting}
          manageReadState={false}
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
        closable={!submitting}
        maskClosable={!submitting}
        keyboard={!submitting}
        onCancel={() => { if (!submittingRef.current) setCreateOpen(false); }}
        onAfterClose={() => createTrigger.current?.focus()}
        footer={<div className="flex justify-end gap-2">
          <Button variant="outline" disabled={submitting} onClick={() => setCreateOpen(false)}>取消</Button>
          <Button loading={submitting} onClick={() => void submitCreate()}>创建</Button>
        </div>}>
        <div className="p2-modal-scroll">
          {createError && <Alert type="error" title="通知尚未创建" description={createError} />}
          <Form value={createForm as unknown as Record<string, unknown>} labelPosition="top" disabled={submitting}>
            <FormItem label="标题" name="title">
              <Input
                id="notification-title"
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
                id="notification-link"
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
