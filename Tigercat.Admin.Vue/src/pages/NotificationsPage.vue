<script setup lang="ts">
import type { NotificationItem } from '@expcat/tigercat-core'
import {
  Badge,
  Button,
  Card,
  NotificationCenter,
  Text,
  notification
} from '@expcat/tigercat-vue'
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import {
  buildNotificationGroups,
  countUnreadNotifications,
  findNotificationById,
  getNotificationGroupLabel,
  setNotificationReadState
} from '../utils/notifications'
import { apiRequest, getAuthHeaders } from '../utils'
import type {
  AdminNotificationGroupKey,
  AdminNotificationItem,
  AdminNotificationToastType,
  PagedResult
} from '../utils/types'

const notifications = ref<AdminNotificationItem[]>([])
const loading = ref(true)
const errorMessage = ref('')

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

const handleItemClick = (item: NotificationItem) => {
  const currentItem = findNotificationById(notifications.value, item.id)
  if (!currentItem) {
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
    await apiRequest<AdminNotificationItem>(`/api/notifications/${item.id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ read })
    })
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

    <Card>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Text weight="bold">通知收件箱</Text>
          <Text size="sm" color="secondary">
            通知来自后端数据源，未读状态、分组和批量已读会持久化保存。
          </Text>
        </div>
        <Button variant="outline" @click="loadNotifications">
          刷新通知
        </Button>
      </div>
    </Card>

    <Card v-if="errorMessage">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Text color="secondary">{{ errorMessage }}</Text>
        <Button variant="outline" @click="loadNotifications">
          重试
        </Button>
      </div>
    </Card>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
      <Card>
        <div class="flex items-center gap-3">
          <Badge :content="unreadCount" type="number" :show-zero="true" :max="99" :standalone="false">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Icon name="bell" :size="20" />
            </div>
          </Badge>
          <div>
            <Text weight="bold">未读总数</Text>
            <Text size="sm" color="secondary">
              全部分组合计 {{ unreadCount }} 条未读通知。
            </Text>
          </div>
        </div>
      </Card>

      <Card>
        <div class="flex items-center gap-3">
          <Badge :content="opsUnreadCount" type="number" :show-zero="true" :standalone="false">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Icon name="server" :size="20" />
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
        <div class="flex items-center gap-3">
          <Badge :content="securityUnreadCount" type="number" :show-zero="true" :standalone="false">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Icon name="shieldCheck" :size="20" />
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
        <div class="flex items-center gap-3">
          <Badge :content="releaseUnreadCount" type="number" :show-zero="true" :standalone="false">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Icon name="checkCircle" :size="20" />
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
        <div
          v-for="item in notifications.slice(0, 2)"
          :key="item.id"
          class="rounded-2xl border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-hover,#f8fafc) p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <Text weight="bold">{{ item.title }}</Text>
            <Text size="sm" color="secondary">
              {{ formatDateTime(item.time) }}
            </Text>
          </div>
          <Text size="sm" color="secondary" class="mt-2">
            {{ item.description }}
          </Text>
          <Text size="sm" color="secondary" class="mt-3">
            来源：{{ item.meta.source ?? 'backend' }} · 级别：{{ item.meta.severity ?? 'normal' }}
          </Text>
        </div>
      </div>
    </Card>
  </div>
</template>
