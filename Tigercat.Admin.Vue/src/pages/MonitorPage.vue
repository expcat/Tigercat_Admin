<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loading } from '@expcat/tigercat-vue/Loading'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Statistic } from '@expcat/tigercat-vue/Statistic'
import { Progress } from '@expcat/tigercat-vue/Progress'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { Badge } from '@expcat/tigercat-vue/Badge'
import { GaugeChart, AreaChart, LineChart } from '../utils/lazyTigercat'
import { ActivityFeed } from '@expcat/tigercat-vue/ActivityFeed'
import type {
  ActivityItem,
  LineChartDatum,
  ProgressVariant,
  SegmentedOption,
  TagVariant,
} from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MetricGrid from '../components/MetricGrid.vue'
import MetricCard from '../components/MetricCard.vue'
import MutedPanel from '../components/MutedPanel.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
import ChartEmptyState from '../components/ChartEmptyState.vue'
import Icon from '../components/Icon.vue'
import {
  startMonitorLive,
  type MonitorNode,
  type MonitorNodeStatus,
  type MonitorSnapshot,
} from '../utils/monitor'
import { formatDisplayDateTime } from '../utils/common'

type IntervalSec = '2' | '3' | '5'

interface MonitorViewState {
  cpu: number
  memory: number
  disk: number
  qps: number
  latency: number
  qpsSeries: LineChartDatum[]
  latencySeries: LineChartDatum[]
  nodes: MonitorNode[]
  events: ActivityItem[]
  lastTickAt: string
  tickCount: number
}

const DEFAULT_INTERVAL: IntervalSec = '3'
const WINDOW_SIZE = 20
const FEED_CAP = 20

const intervalOptions: SegmentedOption[] = [
  { value: '2', label: '2 秒' },
  { value: '3', label: '3 秒' },
  { value: '5', label: '5 秒' },
]

const GAUGE_SEGMENTS = [
  { range: [0, 70] as [number, number], color: 'var(--tiger-success)' },
  { range: [70, 85] as [number, number], color: 'var(--tiger-warning)' },
  { range: [85, 100] as [number, number], color: 'var(--tiger-error)' },
]

const NODE_STATUS_META: Record<MonitorNodeStatus, { label: string; variant: TagVariant }> = {
  healthy: { label: '健康', variant: 'success' },
  warning: { label: '告警', variant: 'warning' },
  critical: { label: '异常', variant: 'danger' },
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function progressVariant(value: number): ProgressVariant {
  if (value >= 85) return 'danger'
  if (value >= 70) return 'warning'
  return 'success'
}

function pushWindow(series: LineChartDatum[], point: LineChartDatum): LineChartDatum[] {
  return [...series, point].slice(-WINDOW_SIZE)
}

function chartTimeTicks(series: LineChartDatum[]) {
  const middle = Math.floor((series.length - 1) / 2)
  return series.filter((_, index) => index === 0 || index === middle || index === series.length - 1)
    .map(({ x }) => x)
}

function nodeStatus(value: string | undefined): MonitorNodeStatus {
  if (value === 'warning' || value === 'critical' || value === 'healthy') {
    return value
  }
  return 'healthy'
}

function toActivityItems(events: MonitorSnapshot['events']): ActivityItem[] {
  return events.slice(0, FEED_CAP).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    time: formatDisplayDateTime(item.time),
    status: item.status,
  }))
}

function createEmptySnapshot(): MonitorViewState {
  return {
    cpu: 0, memory: 0, disk: 0, qps: 0, latency: 0,
    qpsSeries: [], latencySeries: [], nodes: [], events: [], lastTickAt: '--', tickCount: 0,
  }
}

function applyRemoteSnapshot(prev: MonitorViewState, data: MonitorSnapshot): MonitorViewState {
  const at = data.serverTime ? new Date(data.serverTime) : new Date()
  const clock = Number.isNaN(at.getTime()) ? formatClock(new Date()) : formatClock(at)
  const nodes = (data.nodes ?? []).map((node) => ({
    ...node,
    status: nodeStatus(node.status),
  }))
  return {
    cpu: data.cpu,
    memory: data.memory,
    disk: data.disk,
    qps: data.qps,
    latency: data.latency,
    qpsSeries: pushWindow(prev.qpsSeries, { x: clock, y: data.qps }),
    latencySeries: pushWindow(prev.latencySeries, { x: clock, y: data.latency }),
    nodes,
    events: toActivityItems(data.events ?? []),
    lastTickAt: clock,
    tickCount: data.tickCount ?? prev.tickCount + 1,
  }
}

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const intervalSec = ref<IntervalSec>(DEFAULT_INTERVAL)
const paused = ref(false)
const snapshot = ref<MonitorViewState>(createEmptySnapshot())
const loading = ref(false)
const errorMessage = ref('')
const initialized = ref(false)

const reload = ref(0)
watch([paused, intervalSec, reload], (_, __, onCleanup) => {
  if (paused.value) {
    loading.value = false
    return
  }
  loading.value = true
  const stop = startMonitorLive(Number(intervalSec.value), (data) => {
    snapshot.value = applyRemoteSnapshot(snapshot.value, data)
    errorMessage.value = ''
    initialized.value = true
    loading.value = false
  }, (error) => {
    errorMessage.value = readErrorMessage(error, '监控快照加载失败，请稍后重试。')
    loading.value = false
  })
  onCleanup(stop)
}, { immediate: true })

function handleIntervalChange(value: string | number) {
  const next = String(value)
  if (next === '2' || next === '3' || next === '5') {
    intervalSec.value = next
  }
}

function handleTogglePause() {
  paused.value = !paused.value
}

const healthyCount = computed(
  () => snapshot.value.nodes.filter((node) => node.status === 'healthy').length,
)

const gauges = computed(() => [
  { key: 'cpu', label: 'CPU', value: snapshot.value.cpu },
  { key: 'memory', label: '内存', value: snapshot.value.memory },
  { key: 'disk', label: '磁盘', value: snapshot.value.disk },
])

function formatGaugeValue(value: number) {
  return `${Math.round(value)}%`
}

function formatCpuProgress(value: number) {
  return `CPU ${Math.round(value)}%`
}

function formatMemoryProgress(value: number) {
  return `内存 ${Math.round(value)}%`
}

function formatGaugeProgress(label: string) {
  return (value: number) => `${label} ${Math.round(value)}%`
}

function groupMonitorEvents(_item: ActivityItem) {
  return '最近事件'
}

function formatTickLabel(value: string | number) {
  return String(value)
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="monitor"
      title="实时监控"
      subtitle="演示监控快照，展示资源水位、吞吐延迟与节点事件"
      :tags="[
        { label: '实时快照', variant: 'success' },
        { label: '登录可见', variant: 'info' },
      ]"
    />

    <PageActionPanel
      title="刷新控制"
      description="按所选间隔更新演示快照，默认 3 秒。暂停后保留最后快照，继续时恢复更新。"
    >
      <template #actions>
        <Segmented
          :model-value="intervalSec"
          :options="intervalOptions"
          @update:model-value="handleIntervalChange"
        />
        <Tag :variant="paused ? 'warning' : 'success'" size="sm">
          {{ paused ? '已暂停' : errorMessage ? '连接失败' : loading ? '加载中' : '刷新中' }}
        </Tag>
        <Tag variant="info" size="sm">最近 {{ snapshot.lastTickAt }}</Tag>
        <Button variant="outline" @click="handleTogglePause">
          {{ paused ? '继续' : '暂停' }}
        </Button>
      </template>
    </PageActionPanel>

    <Card v-if="errorMessage">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="alert"><Text color="secondary">{{ errorMessage }}</Text></div>
        <Button variant="outline" @click="paused = false; reload++">
          重试
        </Button>
      </div>
    </Card>

    <div v-if="!initialized && loading" class="flex h-40 items-center justify-center" role="status" aria-label="监控加载中"><Loading /></div>
    <ChartEmptyState v-else-if="!initialized" :description="paused ? '监控已暂停，继续后加载快照' : '暂无监控快照，请重试'" />
    <template v-else>
    <MetricGrid :columns="4">
      <MetricCard title="当前 QPS" :value="snapshot.qps" description="近窗滚动">
        <template #icon><Icon name="zap" :size="20" /></template>
      </MetricCard>
      <MetricCard title="P95 延迟" :value="snapshot.latency" description="毫秒">
        <template #icon><Icon name="clock" :size="20" /></template>
      </MetricCard>
      <MetricCard
        title="健康节点"
        :value="healthyCount"
        :description="`共 ${snapshot.nodes.length} 个节点`"
        :badge="healthyCount"
      >
        <template #icon><Icon name="server" :size="20" /></template>
      </MetricCard>
      <MetricCard
        title="事件条数"
        :value="snapshot.events.length"
        :description="`环形缓冲 ${FEED_CAP} 条`"
      >
        <template #icon><Icon name="activity" :size="20" /></template>
      </MetricCard>
    </MetricGrid>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card v-for="gauge in gauges" :key="gauge.key">
        <template #header><Text weight="bold">{{ gauge.label }} 水位</Text></template>
        <GaugeChart
          :value="gauge.value"
          :min="0"
          :max="100"
          :height="180"
          :label="gauge.label"
          :segments="GAUGE_SEGMENTS"
          :value-formatter="formatGaugeValue"
        />
        <div class="mt-3">
          <Progress
            :percentage="gauge.value"
            :variant="progressVariant(gauge.value)"
            :format="formatGaugeProgress(gauge.label)"
          />
        </div>
      </Card>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <Statistic title="QPS" :value="snapshot.qps" suffix="req/s" group-separator />
        <div v-if="snapshot.qpsSeries.length" class="mt-3">
          <AreaChart
            :data="snapshot.qpsSeries"
            :height="140"
            responsive
            :x-tick-values="chartTimeTicks(snapshot.qpsSeries)"
            :y-ticks="3"
            hoverable
          />
        </div>
        <ChartEmptyState v-else description="暂无 QPS 滚动数据" height-class="h-36" />
      </Card>
      <Card>
        <Statistic title="P95 延迟" :value="snapshot.latency" suffix="ms" :precision="1" />
        <div v-if="snapshot.latencySeries.length" class="mt-3">
          <LineChart
            :data="snapshot.latencySeries"
            :height="140"
            responsive
            :x-tick-values="chartTimeTicks(snapshot.latencySeries)"
            :y-ticks="3"
            hoverable
            :show-area="false"
            :show-points="false"
            :include-zero="true"
            line-color="var(--tiger-primary)"
            :x-tick-format="formatTickLabel"
          />
        </div>
        <ChartEmptyState v-else description="暂无延迟滚动数据" height-class="h-36" />
      </Card>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <template #header><Text weight="bold">节点状态</Text></template>
        <div class="mb-3 flex items-center gap-2">
          <Badge :content="healthyCount" variant="success" standalone />
          <Text size="sm" color="secondary">个节点健康</Text>
        </div>
        <div class="space-y-3">
          <div
            v-for="node in snapshot.nodes"
            :key="node.id"
            class="p2-muted-panel flex flex-col gap-2 px-4 py-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0">
                <Text weight="bold">{{ node.name }}</Text>
                <Text size="sm" color="secondary">{{ node.zone }}</Text>
              </div>
              <Tag :variant="NODE_STATUS_META[node.status].variant" size="sm">
                {{ NODE_STATUS_META[node.status].label }}
              </Tag>
            </div>
            <Progress
              :percentage="node.cpu"
              :variant="progressVariant(node.cpu)"
              :format="formatCpuProgress"
            />
            <Progress
              :percentage="node.memory"
              :variant="progressVariant(node.memory)"
              :format="formatMemoryProgress"
            />
          </div>
        </div>
      </Card>

      <Card>
        <template #header><Text weight="bold">实时事件</Text></template>
        <div class="max-h-[420px] overflow-y-auto">
          <ActivityFeed
            v-if="snapshot.events.length"
            :items="snapshot.events"
            empty-text="暂无实时事件"
            :group-by="groupMonitorEvents"
          />
          <ChartEmptyState v-else description="暂无实时事件" height-class="min-h-40" />
        </div>
      </Card>
    </div>

    </template>
    <MutedPanel
      title="演示说明"
      description="指标由服务端生成演示快照，不读取真实主机。QPS 与延迟显示最近 20 个采样点；暂停后停止更新。"
    />
  </div>
</template>
