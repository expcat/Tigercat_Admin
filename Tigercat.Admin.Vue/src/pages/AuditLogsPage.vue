<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Empty } from '@expcat/tigercat-vue/Empty'
import { Input } from '@expcat/tigercat-vue/Input'
import { Loading } from '@expcat/tigercat-vue/Loading'
import { Pagination } from '@expcat/tigercat-vue/Pagination'
import { Message } from '@expcat/tigercat-vue/Message'
import { Modal } from '@expcat/tigercat-vue/Modal'
import { Select } from '@expcat/tigercat-vue/Select'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { ActivityFeed } from '@expcat/tigercat-vue/ActivityFeed'
import { Timeline } from '@expcat/tigercat-vue/Timeline'
import { DataExport } from '@expcat/tigercat-vue/DataExport'
import { CheckboxGroup } from '@expcat/tigercat-vue/CheckboxGroup'
import { Checkbox } from '@expcat/tigercat-vue/Checkbox'
import { Code } from '@expcat/tigercat-vue/Code'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import ChartEmptyState from '../components/ChartEmptyState.vue'
import MetricCard from '../components/MetricCard.vue'
import MetricGrid from '../components/MetricGrid.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
import { apiRequest, exportAuditLogs, getAuthHeaders, loadWorkbenchState, saveWorkbenchState } from '../utils'
import {
  AUDIT_EXPORT_FIELDS,
  DATA_EXPORT_TRIGGER_FORMATS,
  EXPORT_FORMAT_LABELS,
  EXPORT_FORMATS,
  toExportColumns,
  type ExportFormat,
} from '../utils/export'
import { usePermission } from '../utils/permission'
import type { AuditLogItem, AuditRetentionCleanupResult, AuditRetentionPolicy, PagedResult } from '../utils/types'

const categoryOptions = [
  { label: '全部分类', value: '' },
  { label: '认证', value: 'auth' },
  { label: '用户', value: 'user' },
  { label: '任务', value: 'task' },
  { label: '系统', value: 'system' },
]
const { has: hasPerm, loaded: permissionsLoaded } = usePermission()
const route = useRoute()
const savedWorkbench = loadWorkbenchState('audit-logs', {
  queryState: { keyword: '', category: '' },
})
const savedQuery = savedWorkbench.queryState
const canView = computed(() => hasPerm('audit:view'))
const eventId = computed(() => typeof route.query.eventId === 'string' ? route.query.eventId : '')
const page = ref(1)
const total = ref(0)
const detailError = ref('')
const detailReload = ref(0)
const detailLoading = ref(false)
const policyError = ref('')
const policyLoaded = ref(false)
const savingRetention = ref(false)
let listRequest: AbortController | null = null
const cleanupTrigger = ref<{ $el: HTMLButtonElement } | null>(null)
const canExport = computed(() => hasPerm('audit:export'))
const canSaveRetention = computed(() => hasPerm('setting:edit'))

const logs = ref<AuditLogItem[]>([])
const selectedLog = ref<AuditLogItem | null>(null)
const keyword = ref(savedQuery.keyword ?? '')
const category = ref(savedQuery.category ?? '')
const retentionDays = ref('')
const loading = ref(true)
const errorMessage = ref('')
const exportFields = ref<string[]>(AUDIT_EXPORT_FIELDS.map((field) => field.key))
const exportColumns = computed(() => toExportColumns(AUDIT_EXPORT_FIELDS))
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
  listRequest?.abort()
  if (!canView.value) { logs.value = []; selectedLog.value = null; loading.value = false; return }
  const controller = new AbortController()
  listRequest = controller
  loading.value = true
  errorMessage.value = ''
  logs.value = []
  if (!eventId.value) selectedLog.value = null
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: '30' })
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim())
    if (category.value) params.set('category', category.value)
    const payload = await apiRequest<PagedResult<AuditLogItem>>(`/api/audit-logs?${params}`, {
      headers: getAuthHeaders(), signal: controller.signal,
    })
    if (controller.signal.aborted) return
    const lastPage = Math.max(1, Math.ceil(payload.data.total / 30))
    if (page.value > lastPage) { page.value = lastPage; return }
    logs.value = payload.data.items
    total.value = payload.data.total
    if (!eventId.value) selectedLog.value = payload.data.items[0] ?? null
  } catch (error) {
    if (!controller.signal.aborted) { errorMessage.value = getFriendlyErrorMessage(error); total.value = 0 }
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

watch([canView, eventId, detailReload], async (_, __, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  selectedLog.value = null
  detailError.value = ''
  if (!canView.value || !eventId.value) { detailLoading.value = false; return }
  detailLoading.value = true
  try {
    const payload = await apiRequest<AuditLogItem>(`/api/audit-logs/${encodeURIComponent(eventId.value)}`, { headers: getAuthHeaders(), signal: controller.signal })
    if (!controller.signal.aborted) selectedLog.value = payload.data
  } catch (error) {
    if (!controller.signal.aborted) detailError.value = error instanceof Error ? error.message : '目标审计事件加载失败'
  } finally {
    if (!controller.signal.aborted) detailLoading.value = false
  }
}, { immediate: true })

const loadRetentionPolicy = async () => {
  if (!canView.value) return
  policyError.value = ''
  policyLoaded.value = false
  try {
    const payload = await apiRequest<AuditRetentionPolicy>('/api/audit-logs/retention-policy', {
      headers: getAuthHeaders()
    })
    retentionDays.value = String(payload.data.retentionDays)
    policyLoaded.value = true
  } catch (error) {
    policyError.value = error instanceof Error ? error.message : '保留策略加载失败'
  }
}

function setExportFields(value: unknown) {
  exportFields.value = Array.isArray(value) ? value.map(String) : []
}

const onExport = async (format: ExportFormat) => {
  if (!canExport.value || loading.value || exporting.value) return
  if (logs.value.length === 0) {
    errorMessage.value = '当前筛选没有可导出的结果'
    return
  }
  if (exportFields.value.length === 0) {
    errorMessage.value = '请至少选择一个导出字段'
    return
  }
  exporting.value = true
  try {
    await exportAuditLogs({
      format,
      fields: exportFields.value,
      query: {
        keyword: keyword.value.trim(),
        category: category.value,
      },
      headers: getAuthHeaders()
    })
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : '导出失败'
  } finally {
    exporting.value = false
  }
}

const handleSaveRetention = async () => {
  if (!canSaveRetention.value || !policyLoaded.value || savingRetention.value) return
  const nextRetentionDays = Number(retentionDays.value)
  if (!Number.isInteger(nextRetentionDays) || nextRetentionDays < 1 || nextRetentionDays > 3650) {
    policyError.value = '保留天数必须是 1–3650 的整数'; return
  }
  savingRetention.value = true
  policyError.value = ''
  try {
    await apiRequest<AuditRetentionPolicy>('/api/audit-logs/retention-policy', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ retentionDays: nextRetentionDays })
    })
    await loadRetentionPolicy()
    Message.success({ content: '保留策略已保存', duration: 2400 })
  } catch (error) {
    policyError.value = error instanceof Error ? error.message : '保留策略保存失败'
  } finally { savingRetention.value = false }
}

const runRetentionCleanup = async (dryRun: boolean) => {
  if (!canSaveRetention.value || !policyLoaded.value || cleaningRetention.value) return
  policyError.value = ''
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
    policyError.value = error instanceof Error ? error.message : '审计清理失败'
  } finally {
    cleaningRetention.value = false
  }
}

const handleKeywordChange = (value: unknown) => {
  keyword.value = String(value ?? '')
  page.value = 1
  saveWorkbenchState('audit-logs', {
    queryState: { keyword: keyword.value, category: category.value },
  })
}

const handleCategoryChange = (value: unknown) => {
  category.value = String(value ?? '')
  page.value = 1
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

watch([canView, keyword, category, page, eventId], () => void loadAuditLogs(), { immediate: true })
watch(canView, () => void loadRetentionPolicy(), { immediate: true })
onBeforeUnmount(() => listRequest?.abort())
function selectLog(id: unknown) {
  selectedLog.value = logs.value.find((log) => log.id === id) ?? null
  detailError.value = ''
}
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
      title="审计操作失败"
      :description="errorMessage"
      closable
      @close="errorMessage = ''"
    />

    <Alert v-if="!canView" type="warning" :title="permissionsLoaded ? '无权查看审计日志' : '审计权限尚未就绪'" description="需要 audit:view 权限；权限变化后刷新页面重试。" />
    <template v-else>
    <PageActionPanel
      title="审计事件查询"
      description="页面通过 API 查询 Redis Streams 聚合结果，支持分页、筛选、详情和导出。"
    >
      <template #actions>
          <Input
            :model-value="keyword"
            placeholder="筛选标题、说明或事件类型"
            @update:model-value="handleKeywordChange"
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
          <Tag variant="info" size="sm">当前页 {{ logs.length }} · 匹配 {{ total }}</Tag>
          <Button variant="outline" @click="loadAuditLogs">
            刷新日志
          </Button>
          <template v-if="canExport">
            <DataExport
              v-for="format in EXPORT_FORMATS"
              :key="format"
              :columns="exportColumns"
              :data-source="[]"
              :formats="DATA_EXPORT_TRIGGER_FORMATS"
              file-name="audit-logs"
              :labels="{
                xlsxText: `导出 ${EXPORT_FORMAT_LABELS[format]}`,
                exportingText: '导出中...',
                triggerAriaLabel: `导出 ${EXPORT_FORMAT_LABELS[format]}`,
              }"
              :disabled="exporting || loading"
              :custom-export="() => onExport(format)"
            />
            <CheckboxGroup
              orientation="horizontal"
              :model-value="exportFields"
              class-name="flex w-full flex-wrap gap-x-4 gap-y-2 sm:w-auto"
              @update:model-value="setExportFields"
            >
              <Checkbox v-for="field in AUDIT_EXPORT_FIELDS" :key="field.key" :value="field.key">
                {{ field.label }}
              </Checkbox>
            </CheckboxGroup>
          </template>
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

    <Pagination :current="page" :page-size="30" :total="total" @update:current="page = $event" />
    <Text size="sm" color="secondary">筛选与导出均作用于最近 1000 条可检索事件；导出包含全部匹配结果。</Text>
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card title="保留策略">
        <div v-if="policyError" class="space-y-2"><Alert type="error" title="保留策略操作失败" :description="policyError" />
          <Button v-if="!policyLoaded" variant="outline" @click="loadRetentionPolicy">重试策略</Button></div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            v-model="retentionDays"
            placeholder="保留天数"
            aria-label="保留天数"
            :disabled="!canSaveRetention || !policyLoaded || savingRetention || cleaningRetention"
          />
          <Button v-if="canSaveRetention" variant="outline" :disabled="!policyLoaded || savingRetention || cleaningRetention" @click="handleSaveRetention">
            保存策略
          </Button>
          <Button v-if="canSaveRetention" variant="outline" ref="cleanupTrigger" :disabled="!policyLoaded || savingRetention || cleaningRetention" @click="runRetentionCleanup(true)">
            预览清理
          </Button>
        </div>
      </Card>

      <Card title="事件详情">
        <div v-if="detailError" class="space-y-2"><Alert type="error" title="目标事件无法定位" :description="detailError" />
          <Button variant="outline" @click="detailReload++">重试详情</Button></div>
        <Select v-if="logs.length" aria-label="选择审计事件" :model-value="selectedLog?.id" :clearable="false"
          :options="logs.map((log) => ({ value: log.id, label: `${log.title} · ${log.id}` }))" @update:model-value="selectLog" />
        <Loading v-if="detailLoading" />
        <div v-else-if="selectedLog" class="space-y-3 break-words">
          <Text weight="bold">{{ selectedLog.title }}</Text>
          <Text size="sm" color="secondary">
            {{ selectedLog.description }}
          </Text>
          <Text size="sm" color="secondary">
            {{ selectedLog.eventType }} · {{ selectedLog.actor ?? '系统' }} · {{ formatDateTime(selectedLog.occurredAtUtc) }}
          </Text>
          <div class="max-h-72 max-w-full overflow-auto rounded bg-(--tiger-bg-hover,#f8fafc) p-3">
            <Code
              :code="JSON.stringify(selectedLog.data, null, 2)"
              copyable
              copy-label="复制"
              copied-label="已复制"
            />
          </div>
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
      :open="cleanupConfirmOpen"
      title="确认清理审计日志"
      @after-close="cleanupTrigger?.$el.focus()"
      @cancel="!cleaningRetention && (cleanupConfirmOpen = false)"
    >
      <template #footer>
        <Button variant="outline" :disabled="cleaningRetention" @click="cleanupConfirmOpen = false">关闭</Button>
        <Button v-if="cleanupResult?.dryRun" danger :disabled="cleaningRetention || !canSaveRetention" :loading="cleaningRetention" @click="runRetentionCleanup(false)">执行清理</Button>
      </template>
      <div class="space-y-3">
        <Alert v-if="policyError" type="error" title="清理失败" :description="policyError" />
        <Text color="secondary">
          当前保留 {{ cleanupResult?.retentionDays ?? retentionDays }} 天，截止时间
          {{ cleanupResult ? formatDateTime(cleanupResult.cutoffUtc) : '--' }}。
        </Text>
        <Text>
          预览匹配 {{ cleanupResult?.matchedCount ?? 0 }} 条，已删除 {{ cleanupResult?.deletedCount ?? 0 }} 条。
        </Text>
      </div>
    </Modal>
    </template>
  </div>
</template>
