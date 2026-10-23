<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Loading } from '@expcat/tigercat-vue/Loading'
import { Message } from '@expcat/tigercat-vue/Message'
import { Text } from '@expcat/tigercat-vue/Text'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { PrintLayout } from '@expcat/tigercat-vue/PrintLayout'
import { Watermark } from '@expcat/tigercat-vue/Watermark'
import { DataExport } from '@expcat/tigercat-vue/DataExport'
import type { PrintLayoutInstance } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
import ChartEmptyState from '../components/ChartEmptyState.vue'
import { apiRequest, getAuthHeaders } from '../utils'
import type { StatsOverview, StatsTrend } from '../utils/types'
import {
  DATA_EXPORT_TRIGGER_FORMATS, EXPORT_FORMAT_LABELS, EXPORT_FORMATS,
  OVERVIEW_EXPORT_FIELDS, exportOverview, toExportColumns, type ExportFormat,
} from '../utils/export'

const REPORT_DAYS = [1, 7, 30, 90].map((value) => ({ value, label: `近 ${value} 天` }))
const trendDays = ref(7)
const overview = ref<StatsOverview | null>(null)
const trend = ref<StatsTrend | null>(null)
const generatedAt = ref('')
const loading = ref(true)
const errorMessage = ref('')
const exporting = ref(false)
const reload = ref(0)
const printRef = ref<PrintLayoutInstance | null>(null)
const exportColumns = toExportColumns(OVERVIEW_EXPORT_FIELDS)

watch([trendDays, reload], async (_, __, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  errorMessage.value = ''
  overview.value = null
  trend.value = null
  try {
    const [stats, series] = await Promise.all([
      apiRequest<StatsOverview>('/api/stats/overview', { headers: getAuthHeaders(), signal: controller.signal }),
      apiRequest<StatsTrend>(`/api/stats/trend?days=${trendDays.value}`, { headers: getAuthHeaders(), signal: controller.signal }),
    ])
    if (controller.signal.aborted) return
    overview.value = stats.data
    trend.value = series.data
    generatedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })
  } catch (error) {
    if (!controller.signal.aborted) errorMessage.value = error instanceof Error ? error.message : '报表加载失败'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}, { immediate: true })

const rows = computed(() => overview.value && trend.value ? [
  ...[
    ['totalUsers', '总用户数'], ['activeUsers', '活跃用户'], ['disabledUsers', '禁用用户'],
    ['totalRoles', '总角色数'], ['totalPermissions', '总权限数'],
  ].map(([key, label]) => ({ section: 'overview', key, label, value: String(overview.value![key as keyof StatsOverview]) })),
  ...trend.value.points.map(({ date, count }) => ({ section: 'trend', key: date, label: date, value: String(count) })),
] : [])
const period = computed(() => trend.value?.points.length ? `${trend.value.points[0].date} ~ ${trend.value.points[trend.value.points.length - 1].date}` : '暂无趋势数据')
const ready = computed(() => !loading.value && !errorMessage.value && rows.value.length > 0)

async function onExport(format: ExportFormat) {
  if (!ready.value || exporting.value) return
  exporting.value = true
  try {
    await exportOverview({ format, days: trendDays.value, headers: getAuthHeaders() })
    Message.success({ content: '导出成功', duration: 3000 })
  } catch (error) {
    Message.error({ content: error instanceof Error ? error.message : '导出失败', duration: 3000 })
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader icon="fileText" title="报表打印"
      subtitle="当前系统概览与用户创建趋势，预览、打印和导出使用相同数据域与天数"
      :tags="[{ label: '系统统计', variant: 'primary' }]" />
    <PageActionPanel title="报表参数"
      description="概览为当前累计值；天数仅筛选按 UTC 日期统计的用户创建趋势。打印可另存为 PDF。">
      <template #actions>
        <Segmented :model-value="trendDays" :options="REPORT_DAYS" :disabled="exporting" @update:model-value="trendDays = Number($event)" />
        <Button variant="outline" :disabled="loading || exporting" @click="reload++">刷新报表</Button>
        <Button :disabled="!ready || exporting" @click="printRef?.print()">打印</Button>
        <DataExport v-for="format in EXPORT_FORMATS" :key="format" :columns="exportColumns" :data-source="[]"
          :formats="DATA_EXPORT_TRIGGER_FORMATS" file-name="overview"
          :labels="{ xlsxText: `导出 ${EXPORT_FORMAT_LABELS[format]}`, exportingText: '导出中...', triggerAriaLabel: `导出 ${EXPORT_FORMAT_LABELS[format]}` }"
          :disabled="!ready || exporting" :custom-export="() => onExport(format)" />
      </template>
    </PageActionPanel>
    <div v-if="errorMessage" class="space-y-3"><Alert type="error" title="报表加载失败" :description="errorMessage" />
      <Button variant="outline" @click="reload++">重试</Button></div>
    <div v-if="loading" class="flex h-40 items-center justify-center" role="status" aria-label="报表加载中"><Loading /></div>
    <Card v-else-if="ready" class="overflow-x-auto print:overflow-visible">
      <PrintLayout ref="printRef" class="p2-print-paper" page-size="A4" orientation="portrait"
        show-header show-footer header-text="Tigercat 后台 · 系统概览与用户创建趋势"
        :footer-text="`用户创建趋势（UTC）：${period}`">
        <Watermark content="Tigercat · 系统统计" :font="{ color: 'rgba(71,85,105,0.12)' }">
          <div class="space-y-5 p-2">
            <div>
              <Text size="lg" weight="bold">系统概览与用户创建趋势</Text>
              <p>趋势区间（UTC）：<span data-testid="report-period">{{ period }}</span> · 最近 {{ trendDays }} 天</p>
              <p>生成时间：{{ generatedAt }} · 概览为当前累计值</p>
              <p class="text-sm">数据来源：系统用户、角色与权限统计。导出按相同天数重新查询；数据变更后可刷新报表。</p>
            </div>
            <table class="p2-report-table w-full border-collapse text-sm" data-testid="report-data">
              <caption class="mb-3 text-left font-medium">当前概览与按日新增用户明细</caption>
              <thead><tr><th v-for="field in OVERVIEW_EXPORT_FIELDS" :key="field.key" class="border-b px-3 py-2 text-left font-medium">{{ field.label }}</th></tr></thead>
              <tbody><tr v-for="row in rows" :key="`${row.section}-${row.key}`" :data-section="row.section">
                <td class="border-b px-3 py-2">{{ row.section }}</td><td class="border-b px-3 py-2">{{ row.key }}</td>
                <td class="border-b px-3 py-2">{{ row.label }}</td><td class="border-b px-3 py-2 text-right tabular-nums">{{ row.value }}</td>
              </tr></tbody>
            </table>
            <p class="text-sm">overview：当前累计概览；trend：对应 UTC 日期的新增用户数，包含零值日期。</p>
          </div>
        </Watermark>
      </PrintLayout>
    </Card>
    <ChartEmptyState v-else-if="!errorMessage" description="暂无可生成的报表数据" />
  </div>
</template>
