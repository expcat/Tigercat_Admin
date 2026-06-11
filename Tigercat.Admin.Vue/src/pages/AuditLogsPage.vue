<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Alert, Button, Card, Empty, Input, Loading, Modal, Select, Tag, Text } from '@expcat/tigercat-vue'
import { ActivityFeed } from '@expcat/tigercat-vue/ActivityFeed'
import { Timeline } from '@expcat/tigercat-vue/Timeline'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import ChartEmptyState from '../components/ChartEmptyState.vue'
import MetricCard from '../components/MetricCard.vue'
import MetricGrid from '../components/MetricGrid.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
import { apiRequest, exportAuditLogs, getAuthHeaders, loadWorkbenchState, saveWorkbenchState } from '../utils'
import { usePermission } from '../utils/permission'
import type { AuditLogItem, AuditRetentionCleanupResult, AuditRetentionPolicy, PagedResult } from '../utils/types'

const categoryOptions = [
  { label: '全部分类', value: '' },
  { label: '认证', value: 'auth' },
  { label: '用户', value: 'user' },
  { label: '任务', value: 'task' },
  { label: '系统', value: 'system' },
]
const { has: hasPerm } = usePermission()
const route = useRoute()
const savedWorkbench = loadWorkbenchState('audit-logs', {
  queryState: { keyword: '', category: '' },
})
const savedQuery = savedWorkbench.queryState
const canExport = computed(() => hasPerm('audit:export'))
const canSaveRetention = computed(() => hasPerm('setting:edit'))

const logs = ref<AuditLogItem[]>([])
const selectedLog = ref<AuditLogItem | null>(null)
const keyword = ref(savedQuery.keyword ?? '')
const category = ref(savedQuery.category ?? '')
const retentionDays = ref('90')
const loading = ref(true)
const errorMessage = ref('')
const exportConfirmOpen = ref(false)
const exporting = ref(false)
const cleanupConfirmOpen = ref(false)
const cleanupResult = ref<AuditRetentionCleanupResult | null>(null)
const cleaningRetention = ref(false)

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
    if (category.value) {
      params.set('category', category.value)
    }

    const payload = await apiRequest<PagedResult<AuditLogItem>>(`/api/audit-logs?${params}`, {
      headers: getAuthHeaders()
    })
    logs.value = payload.data.items
    const eventId = typeof route.query.eventId === 'string' ? route.query.eventId : ''
    if (eventId) {
      const target = logs.value.find(log => log.id === eventId)
      if (target) {
        selectedLog.value = target
        return
      }
    }
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

const handleConfirmExport = async () => {
  if (logs.value.length === 0) {
    errorMessage.value = '当前筛选没有可导出的结果'
    exportConfirmOpen.value = false
    return
  }
  exporting.value = true
  try {
    await exportAuditLogs({
      query: {
        keyword: keyword.value,
        category: category.value,
      },
      headers: getAuthHeaders()
    })
    exportConfirmOpen.value = false
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : '导出失败'
  } finally {
    exporting.value = false
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

const runRetentionCleanup = async (dryRun: boolean) => {
  cleaningRetention.value = true
  try {
    const payload = await apiRequest<AuditRetentionCleanupResult>('/api/audit-logs/retention/cleanup', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dryRun })
    })
    cleanupResult.value = payload.data
    cleanupConfirmOpen.value = true
    if (!dryRun) {
      await loadAuditLogs()
    }
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : '审计清理失败'
  } finally {
    cleaningRetention.value = false
  }
}

const handleKeywordChange = (value: unknown) => {
  keyword.value = String(value ?? '')
  saveWorkbenchState('audit-logs', {
    queryState: { keyword: keyword.value, category: category.value },
  })
}

const handleCategoryChange = (value: unknown) => {
  category.value = String(value ?? '')
  saveWorkbenchState('audit-logs', {
    queryState: { keyword: keyword.value, category: category.value },
  })
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
        { label: 'ActivityFeed', variant: 'primary' },
        { label: 'Timeline', variant: 'info' }
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
            @change="handleKeywordChange"
          />
          <Select
            :model-value="category"
            :options="categoryOptions"
            placeholder="筛选分类"
            :clearable="false"
            @update:model-value="handleCategoryChange"
          />
          <Tag variant="primary" size="sm">认证事件 {{ authCount }}</Tag>
          <Tag variant="success" size="sm">用户事件 {{ userCount }}</Tag>
          <Tag variant="info" size="sm">总计 {{ logs.length }}</Tag>
          <Button variant="outline" @click="loadAuditLogs">
            刷新日志
          </Button>
          <Button v-if="canExport" variant="outline" @click="exportConfirmOpen = true">
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
        <div v-if="loading" class="flex min-h-40 items-center justify-center">
          <Loading size="md" />
        </div>
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
          <Button v-if="canSaveRetention" variant="outline" @click="handleSaveRetention">
            保存策略
          </Button>
          <Button v-if="canSaveRetention" variant="outline" @click="runRetentionCleanup(true)">
            预览清理
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
        <Empty v-else description="暂无可查看的审计详情" :show-image="false" />
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

    <Modal
      v-model:open="exportConfirmOpen"
      title="确认导出审计日志"
      show-default-footer
      :ok-text="exporting ? '导出中…' : '导出 CSV'"
      cancel-text="取消"
      :confirm-loading="exporting"
      @ok="handleConfirmExport"
      @cancel="exportConfirmOpen = false"
    >
      <Text color="secondary">
        将按当前关键词和分类筛选导出最近审计窗口中的 {{ logs.length }} 条记录。
      </Text>
    </Modal>

    <Modal
      v-model:open="cleanupConfirmOpen"
      title="确认清理审计日志"
      show-default-footer
      :ok-text="cleaningRetention ? '清理中...' : '执行清理'"
      cancel-text="关闭"
      :confirm-loading="cleaningRetention"
      @ok="runRetentionCleanup(false)"
      @cancel="cleanupConfirmOpen = false"
    >
      <div class="space-y-3">
        <Text color="secondary">
          当前保留 {{ cleanupResult?.retentionDays ?? retentionDays }} 天，截止时间
          {{ cleanupResult ? formatDateTime(cleanupResult.cutoffUtc) : '--' }}。
        </Text>
        <Text>
          预览匹配 {{ cleanupResult?.matchedCount ?? 0 }} 条，已删除 {{ cleanupResult?.deletedCount ?? 0 }} 条。
        </Text>
      </div>
    </Modal>
  </div>
</template>
