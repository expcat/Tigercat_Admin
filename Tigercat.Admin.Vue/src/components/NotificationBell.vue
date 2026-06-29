<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Badge, Button, Text, notification } from '@expcat/tigercat-vue'
import { Popover } from '@expcat/tigercat-vue/Popover'
import Icon from './Icon.vue'
import { apiRequest, getAuthHeaders } from '../utils'
import { countUnreadNotifications } from '../utils/notifications'
import type { AdminNotificationItem, PagedResult } from '../utils/types'

const router = useRouter()

const open = ref(false)
const loading = ref(false)
const items = ref<AdminNotificationItem[]>([])

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
  loading.value = true
  try {
    const payload = await apiRequest<PagedResult<AdminNotificationItem>>(
      '/api/notifications?page=1&pageSize=100',
      { headers: getAuthHeaders() },
    )
    items.value = payload.data.items
  } catch {
    // 顶部铃铛失败时保持静默，通知中心页面会展示详细错误。
  } finally {
    loading.value = false
  }
}

const handleItemClick = (item: AdminNotificationItem) => {
  open.value = false
  const config = {
    title: item.title,
    description: item.description,
    onClick: () => router.push({ name: 'notifications' }),
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
  if (!unreadCount.value) {
    return
  }
  try {
    await apiRequest('/api/notifications/mark-read', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ groupKey: null }),
    })
    await loadNotifications()
    notification.success({
      title: '通知已全部标记为已读',
      description: '所有分组的未读通知已清空。',
    })
  } catch (error: unknown) {
    notification.error({
      title: '批量已读失败',
      description: error instanceof Error ? error.message : '请稍后重试。',
    })
  }
}

const handleViewAll = () => {
  open.value = false
  router.push({ name: 'notifications' })
}

onMounted(loadNotifications)
</script>

<template>
  <Popover
    v-model:open="open"
    trigger="click"
    placement="bottom-end"
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
      <div class="flex max-h-[26rem] flex-col">
        <div class="flex items-center justify-between border-b border-(--tiger-border,#e5e7eb) px-4 py-3">
          <Text weight="bold">通知</Text>
          <Button
            variant="link"
            class="!px-0"
            :disabled="!unreadCount"
            @click="handleMarkAllRead"
          >
            全部已读
          </Button>
        </div>

        <div class="min-h-0 flex-1 overflow-auto">
          <div v-if="loading" class="px-4 py-6 text-center">
            <Text color="secondary">正在加载通知...</Text>
          </div>
          <div v-else-if="!recentItems.length" class="px-4 py-6 text-center">
            <Text color="secondary">暂无通知</Text>
          </div>
          <ul v-else class="divide-y divide-(--tiger-border,#e5e7eb)">
            <li v-for="item in recentItems" :key="item.id">
              <button
                type="button"
                class="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)"
                @click="handleItemClick(item)"
              >
                <span class="flex items-center gap-2">
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
