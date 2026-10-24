<script setup lang="ts">
import type { NotificationItem } from '@expcat/tigercat-core'
import { notification } from '@expcat/tigercat-vue/notification'

import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Form } from '@expcat/tigercat-vue/Form'
import { FormItem } from '@expcat/tigercat-vue/FormItem'
import { Input } from '@expcat/tigercat-vue/Input'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Modal } from '@expcat/tigercat-vue/Modal'
import { Select } from '@expcat/tigercat-vue/Select'
import { Text } from '@expcat/tigercat-vue/Text'
import { NotificationCenter } from '@expcat/tigercat-vue/NotificationCenter'
import { Textarea } from '@expcat/tigercat-vue/Textarea'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import MetricCard from '../components/MetricCard.vue'
import MetricGrid from '../components/MetricGrid.vue'
import MutedPanel from '../components/MutedPanel.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
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
  NOTIFICATIONS_CHANGED_EVENT,
  setNotificationReadState
} from '../utils/notifications'
import { apiRequest, getAuthHeaders } from '../utils'
import { usePermission } from '../utils/permission'
import type {
  AdminNotificationGroupKey,
  AdminNotificationItem,
  AdminNotificationToastType,
  NotificationCreateForm
} from '../utils/types'

const EMPTY_CREATE_FORM: NotificationCreateForm = {
  title: '',
  description: '',
  groupKey: 'ops',
  toastType: 'info',
  linkUrl: ''
}

const GROUP_OPTIONS = [
  { label: '系统运维', value: 'ops' },
  { label: '安全提醒', value: 'security' },
  { label: '版本动态', value: 'release' }
]

const TOAST_OPTIONS = [
  { label: '信息', value: 'info' },
  { label: '成功', value: 'success' },
  { label: '警告', value: 'warning' },
  { label: '错误', value: 'error' }
]

const notifications = ref<AdminNotificationItem[]>([])
const loading = ref(true)
const errorMessage = ref('')
const createOpen = ref(false)
const submitting = ref(false)
const createForm = ref<NotificationCreateForm>({ ...EMPTY_CREATE_FORM })
const router = useRouter()
const permission = usePermission()
const canCreate = computed(() => permission.has('notification:create'))
const canEdit = computed(() => permission.has('notification:edit'))
let loadController: AbortController | null = null
let createTrigger: HTMLElement | null = null
const savingRead = ref(false)
const total = ref(0)
const createError = ref('')


const notificationGroups = computed(() => buildNotificationGroups(notifications.value))
const unreadCount = computed(() => countUnreadNotifications(notifications.value))
const opsUnreadCount = computed(() => countUnreadNotifications(notifications.value, 'ops'))
const securityUnreadCount = computed(() => countUnreadNotifications(notifications.value, 'security'))
const releaseUnreadCount = computed(() => countUnreadNotifications(notifications.value, 'release'))

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

function showNotification(
  type: AdminNotificationToastType,
  title: string,
  description: string
) {
  switch (type) {
    case 'success':
      notification.success({ title, description })
      break
    case 'warning':
      notification.warning({ title, description })
      break
    case 'error':
      notification.error({ title, description })
      break
    default:
      notification.info({ title, description })
      break
  }
}

const loadNotifications = async () => {
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  loading.value = true
  errorMessage.value = ''
  notifications.value = []
  total.value = 0

  try {
    const payload = await fetchNotifications(controller.signal)
    if (controller.signal.aborted) return
    notifications.value = payload.data.items
    total.value = payload.data.total
  } catch (error: unknown) {
    if (controller.signal.aborted) return
    const message = error instanceof Error && error.message
      ? error.message
      : '通知加载失败，请稍后重试。'
    errorMessage.value = message
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

const persistReadState = async (id: string, read: boolean) => {
  await apiRequest<AdminNotificationItem>(`/api/notifications/${id}/read`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ read })
  })
}

const handleItemReadChange = async (item: NotificationItem, read: boolean): Promise<boolean> => {
  if (!canEdit.value) {
    showNotification('warning', '权限不足', '当前账号没有修改通知已读状态的权限。')
    return false
  }
  const currentItem = findNotificationById(notifications.value, item.id)
  if (!currentItem || loading.value || submitting.value || savingRead.value) return false
  savingRead.value = true
  try {
    await persistReadState(String(item.id), read)
    notifications.value = setNotificationReadState(notifications.value, item.id, read)
    notifyNotificationsChanged()
    return true
  } catch (error) {
    showNotification('error', '通知状态保存失败', error instanceof Error ? error.message : '请重试。')
    return false
  } finally {
    savingRead.value = false
  }
}

const handleItemClick = async (item: NotificationItem) => {
  if (loading.value || submitting.value || savingRead.value) return
  const currentItem = findNotificationById(notifications.value, item.id)
  if (!currentItem) return
  if (currentItem.linkUrl) {
    if (!isSafeInternalLink(currentItem.linkUrl)) {
      showNotification('error', '无法打开通知链接', '通知链接不是安全的站内路径。')
      return
    }
    const requiredPermission = getRequiredPermissionForLink(currentItem.linkUrl)
    if (requiredPermission && !permission.has(requiredPermission)) {
      showNotification('warning', '权限不足', '当前账号无权访问这条通知指向的页面。')
      return
    }
    if (!currentItem.read && canEdit.value && !await handleItemReadChange(item, true)) return
    await router.push(currentItem.linkUrl)
    return
  }
  showNotification(currentItem.toastType, currentItem.title, currentItem.description)
}

const handleMarkAllRead = async (groupKey: string | number | undefined) => {
  if (!canEdit.value) {
    showNotification('warning', '权限不足', '当前账号没有修改通知已读状态的权限。')
    return
  }
  if (loading.value || submitting.value || savingRead.value) return
  savingRead.value = true
  try {
    await apiRequest('/api/notifications/mark-read', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ groupKey: groupKey ? String(groupKey) : null })
    })
    notifyNotificationsChanged()
    await loadNotifications()
    const groupTitle = groupKey ? getNotificationGroupLabel(groupKey as AdminNotificationGroupKey) : '全部通知'
    showNotification('success', `${groupTitle}已全部标记为已读`, '已保存共享通知的已读状态。')
  } catch (error) {
    showNotification('error', '批量已读失败', error instanceof Error ? error.message : '请重试。')
  } finally {
    savingRead.value = false
  }
}

function openCreateModal() {
  if (!canCreate.value) return
  createTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  createError.value = ''
  createForm.value = { ...EMPTY_CREATE_FORM }
  createOpen.value = true
}

async function submitCreate() {
  if (!canCreate.value || submitting.value) return
  createError.value = ''
  const title = createForm.value.title.trim()
  if (!title) {
    createError.value = '请填写通知标题'
    document.getElementById('notification-title')?.focus()
    return
  }
  const linkUrl = createForm.value.linkUrl?.trim() ?? ''
  if (linkUrl && !isSafeInternalLink(linkUrl)) {
    createError.value = '通知链接必须是安全站内路径'
    document.getElementById('notification-link')?.focus()
    return
  }
  submitting.value = true
  try {
    await createNotification({
      groupKey: createForm.value.groupKey,
      title,
      description: createForm.value.description.trim(),
      toastType: createForm.value.toastType,
      linkUrl: linkUrl || null
    })
    createOpen.value = false
    notifyNotificationsChanged()
    showNotification('success', '通知已创建', title)
    await loadNotifications()
  } catch (error: unknown) {
    createError.value = error instanceof Error ? error.message : '创建通知失败'
  } finally {
    submitting.value = false
  }
}

const onNotificationsChanged = () => { void loadNotifications() }
onMounted(() => {
  void loadNotifications()
  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged)
})
onBeforeUnmount(() => {
  window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged)
  loadController?.abort()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="通知中心"
      subtitle="查看系统运维、安全提醒与版本动态。通知及已读状态由所有账号共享。"
      icon="bell"
      :tags="[
        { label: 'NotificationCenter', variant: 'primary' },
        { label: 'Badge', variant: 'warning' },
        { label: 'Notification', variant: 'success' }
      ]"
    />

    <PageActionPanel
      title="通知收件箱"
      :description="`共 ${total} 条共享通知，当前加载前 ${notifications.length} 条；下方未读统计仅覆盖这些记录。${canEdit ? '' : '当前账号仅可查看。'}`"
    >
      <template #actions>
        <Button
          v-if="canCreate"
          :disabled="savingRead || submitting"
          v-permission="'notification:create'"
          @click="openCreateModal"
        >
          创建通知
        </Button>
        <Button variant="outline" :disabled="loading || savingRead || submitting" @click="loadNotifications">
          刷新通知
        </Button>
      </template>
    </PageActionPanel>

    <Card v-if="errorMessage">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Text color="danger">{{ errorMessage }}</Text>
        <Button variant="outline" :disabled="loading || savingRead || submitting" @click="loadNotifications">
          重试
        </Button>
      </div>
    </Card>

    <MetricGrid :columns="4">
      <MetricCard
        title="当前加载未读"
        :description="`已加载记录中 ${unreadCount} 条未读通知。`"
        :badge="unreadCount"
      >
        <template #icon><Icon name="bell" :size="20" /></template>
      </MetricCard>
      <MetricCard title="系统运维" description="缓存、发布窗口和服务健康类提醒。" :badge="opsUnreadCount">
        <template #icon><Icon name="server" :size="20" /></template>
      </MetricCard>
      <MetricCard title="安全提醒" description="密码策略、权限复核和风险检查提醒。" :badge="securityUnreadCount">
        <template #icon><Icon name="shieldCheck" :size="20" /></template>
      </MetricCard>
      <MetricCard title="版本动态" description="记录 UI 升级、审计能力上线和里程碑变更。" :badge="releaseUnreadCount">
        <template #icon><Icon name="checkCircle" :size="20" /></template>
      </MetricCard>
    </MetricGrid>

    <Card title="通知中心组件验证">
      <NotificationCenter
        title="后台通知"
        :loading="loading || savingRead || submitting"
        :manage-read-state="false"
        :groups="notificationGroups"
        :empty-text="loading ? '正在加载通知...' : '暂无通知'"
        mark-all-read-text="全部标记为已读"
        mark-read-text="设为已读"
        mark-unread-text="恢复未读"
        all-label="全部"
        unread-label="未读"
        read-label="已读"
        @item-click="handleItemClick"
        @item-read-change="handleItemReadChange"
        @mark-all-read="handleMarkAllRead"
      />
    </Card>

    <Card>
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <MutedPanel
          v-for="item in notifications.slice(0, 2)"
          :key="item.id"
          :title="item.title"
          :description="`${formatDateTime(item.time)} · ${item.description} · 来源：${item.meta.source ?? 'backend'} · 级别：${item.meta.severity ?? 'normal'}`"
        />
      </div>
    </Card>

    <Modal
      v-model:open="createOpen"
      title="创建通知"
      :closable="!submitting"
      :mask-closable="!submitting"
      :keyboard="!submitting"
      @cancel="!submitting && (createOpen = false)"
      @after-close="createTrigger?.focus()"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="submitting" @click="createOpen = false">取消</Button>
          <Button :loading="submitting" @click="submitCreate">创建</Button>
        </div>
      </template>
      <div class="p2-modal-scroll">
        <Alert v-if="createError" type="error" title="通知尚未创建" :description="createError" />
        <Form :model-value="createForm" label-position="top" :disabled="submitting">
          <FormItem label="标题" name="title">
            <Input id="notification-title" v-model="createForm.title" placeholder="请输入通知标题" />
          </FormItem>
          <FormItem label="描述" name="description">
            <Textarea v-model="createForm.description" :rows="4" placeholder="请输入通知描述（选填）" />
          </FormItem>
          <FormItem label="分组" name="groupKey">
            <Select v-model="createForm.groupKey" :options="GROUP_OPTIONS" placeholder="请选择分组" />
          </FormItem>
          <FormItem label="类型" name="toastType">
            <Select v-model="createForm.toastType" :options="TOAST_OPTIONS" placeholder="请选择类型" />
          </FormItem>
          <FormItem label="链接" name="linkUrl">
            <Input id="notification-link" v-model="createForm.linkUrl" placeholder="站内路径，例如 /monitor（选填）" />
          </FormItem>
        </Form>
      </div>
    </Modal>
  </div>
</template>
