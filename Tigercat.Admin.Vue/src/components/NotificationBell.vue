<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { notification } from '@expcat/tigercat-vue/notification'

import { Badge } from '@expcat/tigercat-vue/Badge'
import { Button } from '@expcat/tigercat-vue/Button'
import { Text } from '@expcat/tigercat-vue/Text'
import { Popover } from '@expcat/tigercat-vue/Popover'
import Icon from './Icon.vue'
import { apiRequest, getAuthHeaders } from '../utils'
import {
  countUnreadNotifications,
  fetchNotifications,
  notifyNotificationsChanged,
  NOTIFICATIONS_CHANGED_EVENT,
} from '../utils/notifications'
import type { AdminNotificationItem } from '../utils/types'
import { usePermission } from '../utils/permission'

const router = useRouter()
const permission = usePermission()
const canEdit = computed(() => permission.has('notification:edit'))

const open = ref(false)
const loading = ref(false)
const items = ref<AdminNotificationItem[]>([])
const errorMessage = ref('')
const savingRead = ref(false)
const panelRef = ref<HTMLDivElement | null>(null)
let loadController: AbortController | null = null

const unreadCount = computed(() => countUnreadNotifications(items.value))
const recentItems = computed(() => items.value.slice(0, 5))

const formatTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

const loadNotifications = async () => {
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  loading.value = true
  errorMessage.value = ''
  try {
    const payload = await fetchNotifications(controller.signal)
    if (controller.signal.aborted) return
    items.value = payload.data.items
  } catch (error: unknown) {
    if (controller.signal.aborted) return
    errorMessage.value = error instanceof Error && error.message
      ? error.message
      : '通知加载失败，请稍后重试。'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

const handleItemClick = (item: AdminNotificationItem) => {
  open.value = false
  const goNotifications = () => {
    void router.push({ name: 'notifications' })
  }
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
  }
  switch (item.toastType) {
    case 'success':
      notification.success(config)
      break
    case 'warning':
      notification.warning(config)
      break
    case 'error':
      notification.error(config)
      break
    default:
      notification.info(config)
      break
  }
}

const handleMarkAllRead = async () => {
  if (!canEdit.value) {
    notification.warning({
      title: '权限不足',
      description: '当前账号没有修改通知已读状态的权限。',
    })
    return
  }
  if (!unreadCount.value || savingRead.value) {
    return
  }
  savingRead.value = true
  try {
    await apiRequest('/api/notifications/mark-read', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ groupKey: null }),
    })
    notifyNotificationsChanged()
    notification.success({
      title: '通知已全部标记为已读',
      description: '所有分组的未读通知已清空。',
    })
  } catch (error: unknown) {
    notification.error({
      title: '批量已读失败',
      description: error instanceof Error ? error.message : '请稍后重试。',
    })
  } finally {
    savingRead.value = false
  }
}

const handleViewAll = () => {
  open.value = false
  router.push({ name: 'notifications' })
}

watch(open, async (isOpen) => {
  if (isOpen) {
    void loadNotifications()
    await nextTick()
    requestAnimationFrame(() => {
      panelRef.value
        ?.querySelector<HTMLButtonElement>('button:not([disabled])')
        ?.focus()
    })
  }
})

function onNotificationsChanged() {
  void loadNotifications()
}

onMounted(() => {
  void loadNotifications()
  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged)
})

onUnmounted(() => {
  window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged)
  loadController?.abort()
})
</script>

<template>
  <Popover
    v-model:open="open"
    trigger="click"
    placement="bottom-end"
    aria-label="通知"
    :width="360"
  >
    <template #trigger="{ open: triggerOpen }">
      <button
        type="button"
        data-tour="notification-bell"
        aria-label="通知"
        class="flex h-10 w-10 items-center justify-center rounded-lg text-(--tiger-text,#1f2937) transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)"
        :class="{ 'bg-(--tiger-bg-hover,#f1f5f9)': triggerOpen }"
      >
        <Badge
          :content="unreadCount"
          :max="99"
          :show-zero="false"
          :standalone="false"
          variant="danger"
        >
          <Icon name="bell" :size="20" />
        </Badge>
      </button>
    </template>

    <template #content>
      <div ref="panelRef" class="flex max-h-[26rem] flex-col">
        <div class="flex items-center justify-between border-b border-(--tiger-border,#e5e7eb) px-4 py-3">
          <Text weight="bold">通知</Text>
          <Button
            variant="link"
            class="!px-0"
            :disabled="!unreadCount"
            :loading="savingRead"
            @click="handleMarkAllRead"
          >
            全部已读
          </Button>
        </div>

        <div class="min-h-0 flex-1 overflow-auto">
          <div
            v-if="errorMessage"
            role="alert"
            class="border-b border-(--tiger-border,#e5e7eb) px-4 py-3"
          >
            <Text size="sm" color="danger">{{ errorMessage }}</Text>
          </div>
          <div v-if="loading && !recentItems.length" class="px-4 py-6 text-center">
            <Text color="secondary">正在加载通知...</Text>
          </div>
          <div v-else-if="!recentItems.length && !errorMessage" class="px-4 py-6 text-center">
            <Text color="secondary">暂无通知</Text>
          </div>
          <ul v-else-if="recentItems.length" class="divide-y divide-(--tiger-border,#e5e7eb)">
            <li v-for="item in recentItems" :key="item.id">
              <button
                type="button"
                class="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)"
                @click="handleItemClick(item)"
              >
                <span class="flex items-center gap-2">
                  <span v-if="!item.read" class="sr-only">未读通知：</span>
                  <span
                    v-if="!item.read"
                    class="h-2 w-2 shrink-0 rounded-full bg-(--tiger-primary,#3b82f6)"
                    aria-hidden="true"
                  />
                  <Text size="sm" weight="medium" class="min-w-0 truncate">{{ item.title }}</Text>
                </span>
                <Text size="sm" color="secondary" class="line-clamp-2">{{ item.description }}</Text>
                <Text size="xs" color="secondary">{{ formatTime(item.time) }}</Text>
              </button>
            </li>
          </ul>
        </div>

        <div class="border-t border-(--tiger-border,#e5e7eb) px-4 py-2">
          <Button variant="ghost" class="w-full" @click="handleViewAll">
            查看全部通知
          </Button>
        </div>
      </div>
    </template>
  </Popover>
</template>
