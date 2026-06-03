<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Alert, Button, Card, Input, Tag, Text } from '@expcat/tigercat-vue'
import { ActivityFeed } from '@expcat/tigercat-vue/ActivityFeed'
import { Timeline } from '@expcat/tigercat-vue/Timeline'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import ChartEmptyState from '../components/ChartEmptyState.vue'
import MetricCard from '../components/MetricCard.vue'
import MetricGrid from '../components/MetricGrid.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
import { apiRequest, getAuthHeaders } from '../utils'
import type { AuditLogItem, AuditRetentionPolicy, PagedResult } from '../utils/types'

const logs = ref<AuditLogItem[]>([])
const selectedLog = ref<AuditLogItem | null>(null)
const keyword = ref('')
const retentionDays = ref('90')
const loading = ref(true)
const errorMessage = ref('')

const CONTAINS_CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/

const getFriendlyErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    if (CONTAINS_CHINESE_CHAR_REGEX.test(error.message)) {
      return error.message
    }
  }

  return '审计日志加载失败，请稍后重试。'
}

const formatDateGroup = (value: string) =>
  new Date(value).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  })

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

const getTimelineColor = (category: AuditLogItem['category']) => {
  switch (category) {
    case 'auth':
      return 'blue'
    case 'user':
      return 'green'
    default:
      return 'purple'
  }
}

const loadAuditLogs = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '60'
    })
    if (keyword.value.trim()) {
      params.set('keyword', keyword.value.trim())
    }

    const payload = await apiRequest<PagedResult<AuditLogItem>>(`/api/audit-logs?${params}`, {
      headers: getAuthHeaders()
    })
    logs.value = payload.data.items
    selectedLog.value = selectedLog.value && logs.value.some(log => log.id === selectedLog.value?.id)
      ? selectedLog.value
      : logs.value[0] ?? null
  } catch (error: unknown) {
    errorMessage.value = getFriendlyErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const loadRetentionPolicy = async () => {
  try {
    const payload = await apiRequest<AuditRetentionPolicy>('/api/audit-logs/retention-policy', {
      headers: getAuthHeaders()
    })
    retentionDays.value = String(payload.data.retentionDays)
  } catch {
    retentionDays.value = '90'
  }
}

const handleExport = async () => {
  const params = new URLSearchParams()
  if (keyword.value.trim()) {
    params.set('keyword', keyword.value.trim())
  }

  try {
    const response = await fetch(`/api/audit-logs/export?${params}`, {
      headers: getAuthHeaders()
    })
    if (!response.ok) {
      throw new Error(response.statusText || '导出失败')
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : '导出失败'
  }
}

const handleSaveRetention = async () => {
  try {
    await apiRequest<AuditRetentionPolicy>('/api/audit-logs/retention-policy', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ retentionDays: Number(retentionDays.value) })
    })
    await loadRetentionPolicy()
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : '保留策略保存失败'
  }
}

const activityItems = computed(() =>
  logs.value.map((log) => ({
    id: log.id,
    title: log.title,
    description: log.description,
    time: log.occurredAtUtc,
    user: log.actor ? { name: log.actor } : undefined,
    meta: {
      eventType: log.eventType,
      stream: log.stream,
      category: log.category
    }
  }))
)

const timelineItems = computed(() =>
  logs.value.map((log) => ({
    label: formatDateTime(log.occurredAtUtc),
    color: getTimelineColor(log.category),
    content: `${log.title} · ${log.description} · ${log.eventType}`
  }))
)

const authCount = computed(() => logs.value.filter(log => log.category === 'auth').length)
const userCount = computed(() => logs.value.filter(log => log.category === 'user').length)

onMounted(async () => {
  await Promise.all([loadAuditLogs(), loadRetentionPolicy()])
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="审计日志"
      subtitle="查看认证与用户管理事件的最近活动轨迹"
      icon="activity"
      :tags="[
        { label: 'ActivityFeed', color: 'blue' },
        { label: 'Timeline', color: 'purple' }
      ]"
    />

    <Alert
      v-if="errorMessage"
      type="error"
      title="日志加载失败"
      :description="errorMessage"
      closable
      @close="errorMessage = ''"
    />

    <PageActionPanel
      title="审计事件查询"
      description="页面通过 API 查询 Redis Streams 聚合结果，支持分页、筛选、详情和导出。"
    >
      <template #actions>
          <Input
            :value="keyword"
            placeholder="筛选标题、说明或事件类型"
            @change="(value) => keyword = String(value ?? '')"
          />
          <Tag color="blue" size="sm">认证事件 {{ authCount }}</Tag>
          <Tag color="green" size="sm">用户事件 {{ userCount }}</Tag>
          <Tag color="purple" size="sm">总计 {{ logs.length }}</Tag>
          <Button variant="outline" @click="loadAuditLogs">
            刷新日志
          </Button>
          <Button variant="outline" @click="handleExport">
            导出 CSV
          </Button>
      </template>
    </PageActionPanel>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card title="活动分组视图">
        <ActivityFeed
          :items="activityItems"
          :loading="loading"
          empty-text="暂无审计事件"
          :group-by="(item) => formatDateGroup(String(item.time || ''))"
        />
      </Card>

      <Card title="事件时间线">
        <Text v-if="loading" color="secondary">正在读取最新事件...</Text>
        <ChartEmptyState
          v-else-if="timelineItems.length === 0"
          description="暂无可展示的时间线数据。"
          height-class="min-h-40"
        />
        <Timeline v-else :items="timelineItems" />
      </Card>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card title="保留策略">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            :value="retentionDays"
            placeholder="保留天数"
            @change="(value) => retentionDays = String(value ?? '')"
          />
          <Button variant="outline" @click="handleSaveRetention">
            保存策略
          </Button>
        </div>
      </Card>

      <Card title="事件详情">
        <div v-if="selectedLog" class="space-y-3">
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="log in logs.slice(0, 5)"
              :key="log.id"
              variant="outline"
              @click="selectedLog = log"
            >
              {{ selectedLog.id === log.id ? `当前：${log.title}` : log.title }}
            </Button>
          </div>
          <Text weight="bold">{{ selectedLog.title }}</Text>
          <Text size="sm" color="secondary">
            {{ selectedLog.description }}
          </Text>
          <Text size="sm" color="secondary">
            {{ selectedLog.eventType }} · {{ selectedLog.actor ?? '系统' }} · {{ formatDateTime(selectedLog.occurredAtUtc) }}
          </Text>
          <pre class="max-h-72 max-w-full overflow-auto rounded bg-(--tiger-bg-hover,#f8fafc) p-3 text-sm">{{ JSON.stringify(selectedLog.data, null, 2) }}</pre>
        </div>
        <Text v-else color="secondary">暂无可查看的审计详情。</Text>
      </Card>
    </div>

    <MetricGrid>
      <MetricCard title="认证链路" description="覆盖注册、登录、改密、退出等认证事件。">
        <template #icon><Icon name="shieldCheck" :size="20" /></template>
      </MetricCard>
      <MetricCard title="用户管理" description="覆盖用户创建、更新、删除、批量删除与密码重置。">
        <template #icon><Icon name="users" :size="20" /></template>
      </MetricCard>
      <MetricCard title="实时回看" description="当前以最近事件窗口为主，后续可继续扩展筛选与通知联动。">
        <template #icon><Icon name="checkCircle" :size="20" /></template>
      </MetricCard>
    </MetricGrid>
  </div>
</template>
