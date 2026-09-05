<script setup lang="ts">
import { inject, ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Card } from '@expcat/tigercat-vue/Card'
import { Loading } from '@expcat/tigercat-vue/Loading'
import { Message } from '@expcat/tigercat-vue/Message'
import { Select } from '@expcat/tigercat-vue/Select'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { LineChart, BarChart, PieChart } from '../utils/lazyTigercat'
import { Marquee } from '@expcat/tigercat-vue/Marquee'
import { DataExport } from '@expcat/tigercat-vue/DataExport'
import type { Session, StatsOverview, StatsTrend } from '../utils'
import { apiRequest, getAuthHeaders } from '../utils'
import {
  DATA_EXPORT_PLACEHOLDER_ROWS,
  DATA_EXPORT_TRIGGER_FORMATS,
  EXPORT_FORMAT_LABELS,
  EXPORT_FORMATS,
  OVERVIEW_EXPORT_FIELDS,
  exportOverview,
  handleDataExportError,
  skipClientDataExport,
  toExportColumns,
  type ExportFormat,
} from '../utils/export'
import Icon from '../components/Icon.vue'
import AppLogo from '../components/AppLogo.vue'
import MetricCard from '../components/MetricCard.vue'
import MetricGrid from '../components/MetricGrid.vue'
import ChartEmptyState from '../components/ChartEmptyState.vue'

const homeMessage = inject<import('vue').Ref<string>>('homeMessage', ref(''))
const homeError = inject<import('vue').Ref<string>>('homeError', ref(''))
const session = inject<import('vue').Ref<Session | null>>('session', ref(null))

// 认证 headers
const authHeaders = computed<Record<string, string>>(() => {
  const headers: Record<string, string> = {}
  if (session.value?.token) headers.Authorization = `Bearer ${session.value.token}`
  return headers
})

// --- 统计数据状态 ---
const overview = ref<StatsOverview | null>(null)
const trend = ref<StatsTrend | null>(null)
const statsLoading = ref(false)
const trendLoading = ref(false)
const statsError = ref('')
let trendRequestId = 0

// 时间范围（天数）
const trendDays = ref<number>(7)
const exporting = ref(false)
const exportColumns = computed(() => toExportColumns(OVERVIEW_EXPORT_FIELDS))
const trendDaysOptions = [
  { value: 7, label: '近 7 天' },
  { value: 14, label: '近 14 天' },
  { value: 30, label: '近 30 天' },
  { value: 90, label: '近 90 天' },
]

// --- 统计卡片（基于真实概览数据） ---
const statsCards = computed(() => {
  const o = overview.value
  return [
    { label: '总用户数', value: o ? String(o.totalUsers) : '-', icon: 'users' },
    { label: '活跃用户', value: o ? String(o.activeUsers) : '-', icon: 'activity' },
    { label: '总角色数', value: o ? String(o.totalRoles) : '-', icon: 'shield' },
    { label: '总权限数', value: o ? String(o.totalPermissions) : '-', icon: 'shieldCheck' },
  ]
})

// --- 图表数据 ---
const trendChartData = computed(() => {
  if (!trend.value) return []
  return trend.value.points.map(p => ({ x: p.date, y: p.count }))
})

const distributionChartData = computed(() => {
  if (!overview.value) return []
  return [
    { value: overview.value.activeUsers, label: '启用' },
    { value: overview.value.disabledUsers, label: '停用' },
  ]
})

const trendXTicks = computed(() => (trendDays.value <= 14 ? Math.min(trendDays.value, 8) : 6))
const chartPrimary = 'var(--tiger-primary)'
const chartError = 'var(--tiger-error, #dc2626)'
const chartSuccess = 'var(--tiger-success, #16a34a)'
const chartWarning = 'var(--tiger-warning, #d97706)'
const chartInfo = 'var(--tiger-info, #3b82f6)'

// --- API 请求 ---
async function fetchOverview() {
  const res = await apiRequest<StatsOverview>('/api/stats/overview', {
    headers: authHeaders.value,
  })
  overview.value = res.data
}

async function fetchTrend() {
  const id = ++trendRequestId
  const res = await apiRequest<StatsTrend>(`/api/stats/trend?days=${trendDays.value}`, {
    headers: authHeaders.value,
  })
  // 仅当此请求仍是最新请求时才更新数据，避免竞态
  if (id === trendRequestId) {
    trend.value = res.data
  }
}

async function loadStats() {
  statsLoading.value = true
  statsError.value = ''
  try {
    await Promise.all([fetchOverview(), fetchTrend()])
  } catch (e: any) {
    statsError.value = e.message || '加载统计数据失败'
  } finally {
    statsLoading.value = false
  }
}

// 切换时间范围时重新加载趋势
watch(trendDays, async () => {
  trendLoading.value = true
  try {
    await fetchTrend()
  } catch (e: any) {
    statsError.value = e.message || '加载趋势数据失败'
  } finally {
    trendLoading.value = false
  }
})

async function onExport(format: ExportFormat) {
  exporting.value = true
  try {
    await exportOverview({
      format,
      days: trendDays.value,
      headers: getAuthHeaders(),
    })
    Message.success({ content: '导出成功', duration: 3000 })
  } catch (error: unknown) {
    Message.error({ content: error instanceof Error ? error.message : '导出失败', duration: 3000 })
  } finally {
    exporting.value = false
  }
}

onMounted(loadStats)

const router = useRouter()

function handleQuickAction(key: string) {
  if (key === 'users') router.push('/users')
  else if (key === 'roles') router.push('/roles')
  else if (key === 'settings') router.push('/settings')
  else if (key === 'logs') router.push('/audit-logs')
}

// 快捷操作
const quickActions = [
  { label: '用户管理', icon: 'users', key: 'users' },
  { label: '角色配置', icon: 'shield', key: 'roles' },
  { label: '系统设置', icon: 'settings', key: 'settings' },
  { label: '查看日志', icon: 'fileText', key: 'logs' },
]

const ANNOUNCEMENTS = [
  '今晚 22:00–23:00 计划维护，仪表盘指标可能延迟刷新。',
  '每日 02:00 自动备份已完成，可在审计日志核对结果。',
  '媒体存储用量接近 80%，请及时清理过期文件。',
  '演示环境将于本周日重启缓存节点，会话可能被重置。',
]
</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎区域 -->
    <Card class="overflow-hidden">
      <div class="relative">
        <div class="p2-page-accent absolute inset-0 -m-4"></div>
        <div class="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <AppLogo :size="48" class="drop-shadow-sm" />
              <div class="min-w-0">
                <Text size="lg" weight="bold" class="p2-text-primary">
                  欢迎回来，{{ session?.username || 'Admin' }}！
                </Text>
                <Text size="sm" color="secondary">
                  {{ homeMessage || '今天是个好日子，让我们开始工作吧！' }}
                </Text>
              </div>
            </div>
          </div>
          <div class="hidden sm:flex items-center gap-2">
            <Tag variant="primary" size="sm">管理员</Tag>
            <Tag variant="success" size="sm">已认证</Tag>
          </div>
        </div>
      </div>
    </Card>

    <!-- 加载错误提示 -->
    <Alert
      v-if="homeError || statsError"
      type="error"
      title="数据加载失败"
      :description="homeError || statsError"
      closable
    />

    <Marquee
      direction="left"
      :duration="28000"
      :pause-on-hover="true"
      :gap="24"
      :repeat="2"
      aria-label="运维公告"
      class-name="rounded-lg border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-card,#ffffff) px-3 py-2"
    >
      <span
        v-for="item in ANNOUNCEMENTS"
        :key="item"
        class="inline-flex items-center gap-2 whitespace-nowrap text-sm text-(--tiger-text,#0f172a)"
      >
        <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-(--tiger-primary,#3b82f6)"></span>
        <span class="text-(--tiger-text-secondary,#64748b)">{{ item }}</span>
      </span>
    </Marquee>

    <div class="flex flex-wrap items-center justify-end gap-2">
      <DataExport
        v-for="format in EXPORT_FORMATS"
        :key="format"
        :columns="exportColumns"
        :data-source="DATA_EXPORT_PLACEHOLDER_ROWS"
        :formats="DATA_EXPORT_TRIGGER_FORMATS"
        file-name="overview"
        :labels="{
          xlsxText: `导出 ${EXPORT_FORMAT_LABELS[format]}`,
          exportingText: '导出中...',
          triggerAriaLabel: `导出 ${EXPORT_FORMAT_LABELS[format]}`,
        }"
        :disabled="exporting"
        :cell-formatter="skipClientDataExport"
        @error="(error: unknown) => handleDataExportError(error, format, onExport, (message) => Message.error({ content: message, duration: 3000 }))"
      />
    </div>

    <!-- 统计卡片 -->
    <MetricGrid :columns="4">
      <MetricCard
        v-for="stat in statsCards"
        :key="stat.label"
        :title="stat.label"
        :value="stat.value"
        :loading="statsLoading"
      >
        <template #icon>
          <Icon :name="stat.icon" :size="20" />
        </template>
      </MetricCard>
    </MetricGrid>

    <!-- 图表区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 用户创建趋势（折线图） -->
      <Card class="lg:col-span-2">
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Text size="base" weight="bold">用户创建趋势</Text>
            <div class="w-full sm:w-36">
              <Select
                v-model="trendDays"
                :options="trendDaysOptions"
                size="sm"
                :clearable="false"
              />
            </div>
          </div>
        </template>
        <div v-if="statsLoading || trendLoading" class="flex items-center justify-center h-52">
          <Loading />
        </div>
        <LineChart
          v-else-if="trendChartData.length"
          :data="trendChartData"
          :height="220"
          responsive
          :show-area="true"
          :area-opacity="0.15"
          :show-points="true"
          :point-size="4"
          :include-zero="true"
          :line-color="chartPrimary"
          :animated="true"
          x-axis-label="日期"
          y-axis-label="新增用户"
          :x-ticks="trendXTicks"
          :x-tick-format="(v: string | number) => String(v).slice(5)"
          :stroke-gradient="true"
          :point-gradient="true"
        />
        <ChartEmptyState v-else description="暂无趋势数据" />
      </Card>

      <!-- 用户状态分布（饼图） -->
      <Card class="lg:col-span-1 overflow-visible">
        <template #header>
          <Text size="base" weight="bold">用户状态分布</Text>
        </template>
        <div v-if="statsLoading" class="flex items-center justify-center h-52">
          <Loading />
        </div>
        <PieChart
          v-else-if="distributionChartData.length"
          :data="distributionChartData"
          :height="220"
          responsive
          :colors="[chartPrimary, chartError]"
          :show-labels="true"
          label-position="inside"
          :show-legend="true"
          legend-position="bottom"
          :shadow="true"
          :gradient="true"
        />
        <ChartEmptyState v-else description="暂无分布数据" />
      </Card>
    </div>

    <!-- 内容区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 快捷操作 -->
      <Card class="lg:col-span-1">
        <template #header>
          <Text size="base" weight="bold">快捷操作</Text>
        </template>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="action in quickActions"
            :key="action.key"
            @click="handleQuickAction(action.key)"
            class="p2-action-tile group flex min-h-24 flex-col items-center justify-center p-4 transition-all duration-300 hover:shadow-md"
          >
            <div class="mb-2 transition-transform group-hover:scale-110">
              <Icon :name="action.icon" :size="24" class="text-(--tiger-primary,#3b82f6)" />
            </div>
            <Text size="sm" weight="medium">{{ action.label }}</Text>
          </button>
        </div>
      </Card>

      <!-- 概览详情（柱状图） -->
      <Card class="lg:col-span-2">
        <template #header>
          <Text size="base" weight="bold">用户概览</Text>
        </template>
        <div v-if="statsLoading" class="flex items-center justify-center h-52">
          <Loading />
        </div>
        <BarChart
          v-else-if="overview"
          :data="[
            { x: '总用户', y: overview.totalUsers, color: chartPrimary },
            { x: '活跃', y: overview.activeUsers, color: chartSuccess },
            { x: '禁用', y: overview.disabledUsers, color: chartError },
            { x: '角色', y: overview.totalRoles, color: chartInfo },
            { x: '权限', y: overview.totalPermissions, color: chartWarning },
          ]"
          :height="220"
          responsive
          :show-grid="true"
          :animated="true"
          :bar-radius="6"
          y-axis-label="数量"
          :gradient="true"
        />
        <ChartEmptyState v-else description="暂无概览数据" />
      </Card>
    </div>

    <!-- 系统信息 -->
    <Card>
      <template #header>
        <Text size="base" weight="bold">系统信息</Text>
      </template>
      <MetricGrid :columns="4">
        <MetricCard title="系统版本" value="v1.0.0" :framed="false">
          <template #icon><Icon name="package" :size="20" /></template>
        </MetricCard>
        <MetricCard title="运行环境" value=".NET 10 + Vue 3" :framed="false">
          <template #icon><Icon name="zap" :size="20" /></template>
        </MetricCard>
        <MetricCard title="最后更新" value="2026-01-28" :framed="false">
          <template #icon><Icon name="calendar" :size="20" /></template>
        </MetricCard>
        <MetricCard title="API 状态" value="在线" :framed="false">
          <template #icon><Icon name="globe" :size="20" /></template>
        </MetricCard>
      </MetricGrid>
    </Card>
  </div>
</template>
