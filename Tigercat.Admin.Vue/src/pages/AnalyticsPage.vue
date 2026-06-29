<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Card, Button, Message } from '@expcat/tigercat-vue'
import { Statistic } from '@expcat/tigercat-vue/Statistic'
import { Progress } from '@expcat/tigercat-vue/Progress'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { ButtonGroup } from '@expcat/tigercat-vue/ButtonGroup'
import { Pagination } from '@expcat/tigercat-vue/Pagination'
import { Table } from '@expcat/tigercat-vue/Table'
import { Skeleton } from '@expcat/tigercat-vue/Skeleton'
import { DatePicker } from '@expcat/tigercat-vue/DatePicker'
import { AreaChart } from '@expcat/tigercat-vue/AreaChart'
import { DonutChart } from '@expcat/tigercat-vue/DonutChart'
import { FunnelChart } from '@expcat/tigercat-vue/FunnelChart'
import { GaugeChart } from '@expcat/tigercat-vue/GaugeChart'
import { HeatmapChart } from '@expcat/tigercat-vue/HeatmapChart'
import { RadarChart } from '@expcat/tigercat-vue/RadarChart'
import { ScatterChart } from '@expcat/tigercat-vue/ScatterChart'
import { TreeMapChart } from '@expcat/tigercat-vue/TreeMapChart'
import { SunburstChart } from '@expcat/tigercat-vue/SunburstChart'
import { OrgChart } from '@expcat/tigercat-vue/OrgChart'
import { ChartCanvas } from '@expcat/tigercat-vue/ChartCanvas'
import { ChartAxis } from '@expcat/tigercat-vue/ChartAxis'
import { ChartGrid } from '@expcat/tigercat-vue/ChartGrid'
import { ChartSeries } from '@expcat/tigercat-vue/ChartSeries'
import { ChartLegend } from '@expcat/tigercat-vue/ChartLegend'
import { ChartTooltip } from '@expcat/tigercat-vue/ChartTooltip'
import { createLinearScale, createBandScale } from '@expcat/tigercat-core'
import type {
  SegmentedOption,
  AreaChartDatum,
  DonutChartDatum,
  FunnelChartDatum,
  RadarChartDatum,
  ScatterChartDatum,
  HeatmapChartDatum,
  TreeMapChartDatum,
  SunburstChartDatum,
  OrgChartNode,
  ChartSeriesPoint,
  ChartLegendItem,
  TableColumn,
  DatePickerRangeModelValue,
} from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'

// ── 时间范围与加载 ──────────────────────────────
const range = ref<string | number>('30')
const rangeOptions: SegmentedOption[] = [
  { value: '7', label: '近 7 天' },
  { value: '30', label: '近 30 天' },
  { value: '90', label: '近 90 天' },
]
const dateRange = ref<DatePickerRangeModelValue | null>(null)
const loading = ref(true)

const factor = computed(() => {
  const v = String(range.value)
  return v === '7' ? 0.4 : v === '90' ? 2.2 : 1
})

function triggerLoading() {
  loading.value = true
  window.setTimeout(() => {
    loading.value = false
  }, 420)
}
function handleRangeChange(value: string | number) {
  range.value = value
  page.value = 1
  triggerLoading()
}
function handleDateRangeChange(value: unknown) {
  dateRange.value = value as DatePickerRangeModelValue | null
}
function handleRefresh() {
  page.value = 1
  triggerLoading()
}
function handleExport() {
  Message.success({ content: '报表已导出（演示）', duration: 2400 })
}

onMounted(() => {
  window.setTimeout(() => {
    loading.value = false
  }, 500)
})

// ── KPI ────────────────────────────────────────
const kpis = computed(() => [
  { label: '访问量', value: Math.round(128400 * factor.value), suffix: '', percentage: 72, icon: '#3b82f6' },
  { label: '转化率', value: 3.8, suffix: '%', percentage: 38 },
  { label: '订单数', value: Math.round(2360 * factor.value), suffix: '', percentage: 64 },
  { label: '收入', value: Math.round(486000 * factor.value), suffix: '元', percentage: 81 },
])

// ── 各类图表数据 ────────────────────────────────
const months = ['1月', '2月', '3月', '4月', '5月', '6月']
const baseTrend = [120, 200, 150, 260, 300, 260]
const areaData = computed<AreaChartDatum[]>(() =>
  months.map((m, i) => ({ x: m, y: Math.round(baseTrend[i] * factor.value) })),
)

const donutData = computed<DonutChartDatum[]>(() => [
  { value: Math.round(42 * factor.value), label: '直接访问' },
  { value: Math.round(28 * factor.value), label: '搜索引擎' },
  { value: Math.round(18 * factor.value), label: '社交媒体' },
  { value: Math.round(12 * factor.value), label: '推荐' },
])
const donutTotal = computed(() => donutData.value.reduce((sum, d) => sum + d.value, 0))

const funnelData = computed<FunnelChartDatum[]>(() => [
  { label: '曝光', value: Math.round(1000 * factor.value) },
  { label: '点击', value: Math.round(620 * factor.value) },
  { label: '加购', value: Math.round(340 * factor.value) },
  { label: '下单', value: Math.round(180 * factor.value) },
  { label: '支付', value: Math.round(120 * factor.value) },
])

const gaugeValue = computed(() => Math.min(100, Math.round(68 * (factor.value > 1 ? 1.1 : factor.value < 1 ? 0.8 : 1))))

const radarData: RadarChartDatum[] = [
  { label: '性能', value: 80 },
  { label: '可用性', value: 90 },
  { label: '体验', value: 70 },
  { label: '安全', value: 85 },
  { label: '生态', value: 60 },
]

const scatterData: ScatterChartDatum[] = [
  { x: 12, y: 22, size: 8 },
  { x: 28, y: 46, size: 12 },
  { x: 42, y: 30, size: 10 },
  { x: 55, y: 68, size: 16 },
  { x: 70, y: 50, size: 9 },
  { x: 84, y: 78, size: 14 },
]

const heatmapX = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const heatmapY = ['00:00', '06:00', '12:00', '18:00']
const heatmapData = computed<HeatmapChartDatum[]>(() => {
  const out: HeatmapChartDatum[] = []
  heatmapY.forEach((y, yi) => {
    heatmapX.forEach((x, xi) => {
      out.push({ x, y, value: Math.round((((xi * 7 + yi * 13 + 20) % 90) + 5) * factor.value) })
    })
  })
  return out
})

const treeMapData = computed<TreeMapChartDatum[]>(() => [
  { label: '华东', value: Math.round(380 * factor.value) },
  { label: '华北', value: Math.round(260 * factor.value) },
  { label: '华南', value: Math.round(220 * factor.value) },
  { label: '西部', value: Math.round(140 * factor.value) },
])

const sunburstData = computed<SunburstChartDatum[]>(() => [
  {
    label: '线上',
    value: Math.round(400 * factor.value),
    children: [
      { label: 'App', value: Math.round(220 * factor.value) },
      { label: 'Web', value: Math.round(180 * factor.value) },
    ],
  },
  {
    label: '线下',
    value: Math.round(200 * factor.value),
    children: [
      { label: '门店', value: Math.round(120 * factor.value) },
      { label: '代理', value: Math.round(80 * factor.value) },
    ],
  },
])

const orgData: OrgChartNode = {
  id: 'root',
  label: '总部',
  title: 'CEO',
  children: [
    {
      id: 'tech',
      label: '技术中心',
      title: 'CTO',
      children: [
        { id: 'fe', label: '前端组' },
        { id: 'be', label: '后端组' },
      ],
    },
    {
      id: 'ops',
      label: '运营中心',
      title: 'COO',
      children: [
        { id: 'mkt', label: '市场组' },
        { id: 'sup', label: '客服组' },
      ],
    },
  ],
}

// ── 自定义图表（图表基元组合，点到为止）──────────
const CANVAS_W = 560
const CANVAS_H = 240
const CANVAS_PAD = 32
const innerW = CANVAS_W - CANVAS_PAD * 2
const innerH = CANVAS_H - CANVAS_PAD * 2
const customLabels = ['1月', '2月', '3月', '4月', '5月', '6月']
const customValues = computed(() => [30, 52, 41, 67, 58, 72].map((v) => Math.round(v * factor.value)))
const xScale = computed(() =>
  createBandScale(customLabels, [0, innerW], { paddingInner: 0.3, paddingOuter: 0.2 }),
)
const yScale = computed(() => createLinearScale([0, Math.max(...customValues.value, 1)], [innerH, 0]))
const seriesPoints = computed<ChartSeriesPoint[]>(() =>
  customLabels.map((label, i) => ({
    x: (xScale.value.map(label) ?? 0) + (xScale.value.bandwidth ?? 0) / 2,
    y: yScale.value.map(customValues.value[i]) ?? 0,
    label,
    value: customValues.value[i],
  })),
)
const legendItems: ChartLegendItem[] = [{ index: 0, label: '月度转化', color: '#3b82f6' }]

// ── 明细表 + 客户端分页 ─────────────────────────
const baseChannels = [
  { name: '直接访问', visits: 38400, orders: 920, conversion: 2.4, trend: '上升' },
  { name: '搜索引擎', visits: 31200, orders: 760, conversion: 2.1, trend: '上升' },
  { name: '社交媒体', visits: 24800, orders: 540, conversion: 1.8, trend: '持平' },
  { name: '邮件营销', visits: 12600, orders: 410, conversion: 3.2, trend: '上升' },
  { name: '付费广告', visits: 18900, orders: 620, conversion: 2.9, trend: '下降' },
  { name: '内容推荐', visits: 9800, orders: 280, conversion: 2.0, trend: '持平' },
  { name: '合作渠道', visits: 7400, orders: 190, conversion: 1.6, trend: '上升' },
  { name: '线下活动', visits: 4200, orders: 130, conversion: 2.7, trend: '下降' },
]
const tableColumns: TableColumn[] = [
  { key: 'channel', title: '渠道' },
  { key: 'visits', title: '访问量', align: 'right' },
  { key: 'orders', title: '订单数', align: 'right' },
  { key: 'conversion', title: '转化率', align: 'right' },
  { key: 'trend', title: '趋势' },
]
const allRows = computed<Record<string, unknown>[]>(() =>
  baseChannels.map((c) => ({
    channel: c.name,
    visits: Math.round(c.visits * factor.value).toLocaleString(),
    orders: Math.round(c.orders * factor.value).toLocaleString(),
    conversion: `${c.conversion}%`,
    trend: c.trend,
  })),
)
const page = ref(1)
const pageSize = 5
const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize
  return allRows.value.slice(start, start + pageSize)
})
function handlePageChange(value: number) {
  page.value = value
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="trendingUp"
      title="数据分析"
      subtitle="一站式 BI 看板，聚合趋势、构成、转化与渠道明细"
      :tags="[
        { label: '实时演示', variant: 'success' },
        { label: 'BI', variant: 'primary' },
      ]"
    />

    <!-- 工具栏 -->
    <Card>
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          :model-value="range"
          @update:model-value="handleRangeChange"
          :options="rangeOptions"
        />
        <div class="flex flex-wrap items-center gap-3">
          <DatePicker
            :model-value="dateRange"
            @update:model-value="handleDateRangeChange"
            range
            placeholder="自定义区间"
            clearable
          />
          <ButtonGroup>
            <Button variant="outline" @click="handleRefresh">刷新</Button>
            <Button variant="outline" @click="handleExport">导出</Button>
          </ButtonGroup>
        </div>
      </div>
    </Card>

    <!-- KPI -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="kpi in kpis" :key="kpi.label">
        <Skeleton v-if="loading" :rows="2" />
        <template v-else>
          <Statistic :title="kpi.label" :value="kpi.value" :suffix="kpi.suffix" group-separator />
          <div class="mt-3">
            <Progress :percentage="kpi.percentage" />
          </div>
        </template>
      </Card>
    </div>

    <!-- 图表网格 -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="访问趋势">
        <Skeleton v-if="loading" :rows="4" />
        <AreaChart v-else :data="areaData" :height="240" />
      </Card>

      <Card title="流量构成">
        <Skeleton v-if="loading" :rows="4" />
        <DonutChart
          v-else
          :data="donutData"
          :height="240"
          :center-value="donutTotal"
          center-label="总访问"
          :show-legend="true"
        />
      </Card>

      <Card title="转化漏斗">
        <Skeleton v-if="loading" :rows="4" />
        <FunnelChart v-else :data="funnelData" :height="240" />
      </Card>

      <Card title="目标达成率">
        <Skeleton v-if="loading" :rows="4" />
        <GaugeChart v-else :value="gaugeValue" :min="0" :max="100" :height="240" />
      </Card>

      <Card title="能力雷达">
        <Skeleton v-if="loading" :rows="4" />
        <RadarChart v-else :data="radarData" :height="240" />
      </Card>

      <Card title="访问分布">
        <Skeleton v-if="loading" :rows="4" />
        <ScatterChart v-else :data="scatterData" :height="240" />
      </Card>

      <Card title="活跃热力">
        <Skeleton v-if="loading" :rows="4" />
        <HeatmapChart
          v-else
          :data="heatmapData"
          :x-labels="heatmapX"
          :y-labels="heatmapY"
          :height="240"
        />
      </Card>

      <Card title="区域份额">
        <Skeleton v-if="loading" :rows="4" />
        <TreeMapChart v-else :data="treeMapData" :height="240" />
      </Card>

      <Card title="渠道层级构成">
        <Skeleton v-if="loading" :rows="4" />
        <SunburstChart v-else :data="sunburstData" :height="240" />
      </Card>

      <Card title="组织 / 渠道分布">
        <Skeleton v-if="loading" :rows="4" />
        <div v-else class="overflow-auto">
          <OrgChart :data="orgData" :height="240" />
        </div>
      </Card>
    </div>

    <!-- 自定义图表（图表基元组合） -->
    <Card title="自定义图表（图表基元组合）">
      <Skeleton v-if="loading" :rows="4" />
      <template v-else>
        <div class="overflow-auto">
          <ChartCanvas :width="CANVAS_W" :height="CANVAS_H" :padding="CANVAS_PAD">
            <ChartGrid :x-scale="xScale" :y-scale="yScale" />
            <ChartAxis orientation="bottom" :scale="xScale" />
            <ChartAxis orientation="left" :scale="yScale" />
            <ChartSeries :data="seriesPoints" type="line" color="#3b82f6" />
            <ChartTooltip content="月度转化趋势" :visible="false" />
          </ChartCanvas>
        </div>
        <ChartLegend :items="legendItems" class="mt-2" />
      </template>
    </Card>

    <!-- 明细表 -->
    <Card title="渠道明细">
      <Skeleton v-if="loading" :rows="6" />
      <template v-else>
        <Table :columns="tableColumns" :data-source="pagedRows" :pagination="false" striped />
        <div class="mt-4 flex justify-end">
          <Pagination
            :current="page"
            :total="allRows.length"
            :page-size="pageSize"
            @update:current="handlePageChange"
          />
        </div>
      </template>
    </Card>
  </div>
</template>
