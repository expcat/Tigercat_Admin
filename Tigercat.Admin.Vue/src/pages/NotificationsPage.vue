<script setup lang="ts">
import type { NotificationItem } from '@expcat/tigercat-core'
import {
  Button,
  Card,
  Text,
  notification
} from '@expcat/tigercat-vue'
import { NotificationCenter } from '@expcat/tigercat-vue/NotificationCenter'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import MetricCard from '../components/MetricCard.vue'
import MetricGrid from '../components/MetricGrid.vue'
import MutedPanel from '../components/MutedPanel.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
import {
  buildNotificationGroups,
  countUnreadNotifications,
  findNotificationById,
  getNotificationGroupLabel,
  setNotificationReadState
} from '../utils/notifications'
import { apiRequest, getAuthHeaders } from '../utils'
import { usePermission } from '../utils/permission'
import type {
  AdminNotificationGroupKey,
  AdminNotificationItem,
  AdminNotificationToastType,
  PagedResult
} from '../utils/types'

const notifications = ref<AdminNotificationItem[]>([])
const loading = ref(true)
const errorMessage = ref('')
const router = useRouter()
const permission = usePermission()

const LINK_PERMISSION_MAP: Array<[RegExp, string]> = [
  [/^\/users(?:[/?#]|$)/, 'user:view'],
  [/^\/roles(?:[/?#]|$)/, 'role:view'],
  [/^\/files(?:[/?#]|$)/, 'media:view'],
  [/^\/tasks(?:[/?#]|$)/, 'task:view'],
  [/^\/audit-logs(?:[/?#]|$)/, 'audit:view'],
  [/^\/settings(?:[/?#]|$)/, 'setting:view']
]

const getRequiredPermissionForLink = (linkUrl: string) =>
  LINK_PERMISSION_MAP.find(([pattern]) => pattern.test(linkUrl))?.[1] ?? null

const isSafeInternalLink = (linkUrl: string) =>
  linkUrl.startsWith('/') && !linkUrl.startsWith('//')

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
  loading.value = true
  errorMessage.value = ''

  try {
    const payload = await apiRequest<PagedResult<AdminNotificationItem>>('/api/notifications?page=1&pageSize=100', {
      headers: getAuthHeaders()
    })
    notifications.value = payload.data.items
  } catch (error: unknown) {
    const message = error instanceof Error && error.message
      ? error.message
      : '通知加载失败，请稍后重试。'
    errorMessage.value = message
    showNotification('error', '通知加载失败', message)
  } finally {
    loading.value = false
  }
}

const persistReadState = async (id: string, read: boolean) => {
  await apiRequest<AdminNotificationItem>(`/api/notifications/${id}/read`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ read })
  })
}

const handleItemClick = async (item: NotificationItem) => {
  const currentItem = findNotificationById(notifications.value, item.id)
  if (!currentItem) {
    return
  }

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

    if (!currentItem.read) {
      notifications.value = setNotificationReadState(notifications.value, item.id, true)
      try {
        await persistReadState(String(item.id), true)
      } catch {
        notifications.value = setNotificationReadState(notifications.value, item.id, false)
      }
    }

    await router.push(currentItem.linkUrl)
    return
  }

  showNotification(
    currentItem.toastType,
    currentItem.title,
    currentItem.description
  )
}

const handleItemReadChange = async (item: NotificationItem, read: boolean) => {
  const currentItem = findNotificationById(notifications.value, item.id)
  notifications.value = setNotificationReadState(notifications.value, item.id, read)

  try {
    await persistReadState(String(item.id), read)
  } catch (error: unknown) {
    notifications.value = setNotificationReadState(notifications.value, item.id, !read)
    showNotification(
      'error',
      '通知状态保存失败',
      error instanceof Error ? error.message : '请稍后重试。'
    )
    return
  }

  if (currentItem) {
    showNotification(
      'info',
      read ? '通知已标记为已读' : '通知已恢复为未读',
      currentItem.title
    )
  }
}

const handleMarkAllRead = async (groupKey: string | number | undefined, items: NotificationItem[]) => {
  try {
    await apiRequest('/api/notifications/mark-read', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        groupKey: groupKey ? String(groupKey) : null
      })
    })
    await loadNotifications()
  } catch (error: unknown) {
    showNotification(
      'error',
      '批量已读失败',
      error instanceof Error ? error.message : '请稍后重试。'
    )
    return
  }

  const groupTitle = groupKey
    ? getNotificationGroupLabel(groupKey as AdminNotificationGroupKey)
    : '全部通知'
  showNotification(
    'success',
    `${groupTitle}已全部标记为已读`,
    `本次共处理 ${items.length} 条通知。`
  )
}

onMounted(loadNotifications)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="通知中心"
      subtitle="集中查看系统运维、安全提醒与版本动态，并在同一页验证 Badge 与 Notification 交互。"
      icon="bell"
      :tags="[
        { label: 'NotificationCenter', color: 'blue' },
        { label: 'Badge', color: 'orange' },
        { label: 'Notification', color: 'green' }
      ]"
    />

    <PageActionPanel
      title="通知收件箱"
      description="通知来自后端数据源，未读状态、分组和批量已读会持久化保存。"
    >
      <template #actions>
        <Button variant="outline" @click="loadNotifications">
          刷新通知
        </Button>
      </template>
    </PageActionPanel>

    <Card v-if="errorMessage">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Text color="secondary">{{ errorMessage }}</Text>
        <Button variant="outline" @click="loadNotifications">
          重试
        </Button>
      </div>
    </Card>

    <MetricGrid :columns="4">
      <MetricCard
        title="未读总数"
        :description="`全部分组合计 ${unreadCount} 条未读通知。`"
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
  </div>
</template>
