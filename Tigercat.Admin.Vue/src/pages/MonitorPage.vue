<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Message } from '@expcat/tigercat-vue/Message'
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
  ProgressStatus,
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
  fetchMonitorSnapshot,
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

const SEED_NODES: Array<Pick<MonitorNode, 'id' | 'name' | 'zone'>> = [
  { id: 'api-hz-1', name: 'api-hz-1', zone: '华东' },
  { id: 'api-bj-1', name: 'api-bj-1', zone: '华北' },
  { id: 'worker-hz-1', name: 'worker-hz-1', zone: '华东' },
  { id: 'cache-hz-1', name: 'cache-hz-1', zone: '华东' },
]

const SEED_QPS = [820, 846, 831, 874, 902, 888, 915, 940, 928, 961, 974, 952, 981, 996, 1012, 998, 1024, 1040, 1031, 1056]
const SEED_LATENCY = [38, 36, 41, 39, 42, 40, 44, 43, 41, 45, 47, 44, 46, 48, 45, 43, 42, 44, 46, 45]

function formatClock(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function healthFromLoad(cpu: number, memory: number): MonitorNodeStatus {
  const load = Math.max(cpu, memory)
  if (load >= 85) return 'critical'
  if (load >= 70) return 'warning'
  return 'healthy'
}

function progressStatus(value: number): ProgressStatus {
  if (value >= 85) return 'exception'
  if (value >= 70) return 'paused'
  return 'success'
}

function pushWindow(series: LineChartDatum[], point: LineChartDatum): LineChartDatum[] {
  return [...series, point].slice(-WINDOW_SIZE)
}

function seedWindow(values: number[], now: Date, intervalMs: number): LineChartDatum[] {
  return values.map((y, index) => ({
    x: formatClock(new Date(now.getTime() - (values.length - 1 - index) * intervalMs)),
    y,
  }))
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

function createSeedSnapshot(): MonitorViewState {
  const now = new Date()
  const intervalMs = Number(DEFAULT_INTERVAL) * 1000
  const nodes: MonitorNode[] = [
    { ...SEED_NODES[0], cpu: 46, memory: 58, status: 'healthy' },
    { ...SEED_NODES[1], cpu: 62, memory: 71, status: 'warning' },
    { ...SEED_NODES[2], cpu: 38, memory: 44, status: 'healthy' },
    { ...SEED_NODES[3], cpu: 51, memory: 63, status: 'healthy' },
  ].map((node) => ({ ...node, status: healthFromLoad(node.cpu, node.memory) }))

  return {
    cpu: 54,
    memory: 61,
    disk: 67,
    qps: SEED_QPS[SEED_QPS.length - 1],
    latency: SEED_LATENCY[SEED_LATENCY.length - 1],
    qpsSeries: seedWindow(SEED_QPS, now, intervalMs),
    latencySeries: seedWindow(SEED_LATENCY, now, intervalMs),
    nodes,
    events: [
      {
        id: 'evt-seed-1',
        title: 'API 网关流量升高',
        description: '入口 QPS 超过近窗均值',
        time: formatDisplayDateTime(new Date(now.getTime() - 9000)),
        status: { label: '告警', variant: 'warning' as TagVariant },
      },
      {
        id: 'evt-seed-2',
        title: '工作节点恢复',
        description: '心跳已恢复，流量重新接入',
        time: formatDisplayDateTime(new Date(now.getTime() - 6000)),
        status: { label: '恢复', variant: 'success' as TagVariant },
      },
      {
        id: 'evt-seed-3',
        title: '缓存命中率回升',
        description: '热点 key 预热完成',
        time: formatDisplayDateTime(new Date(now.getTime() - 3000)),
        status: { label: '正常', variant: 'success' as TagVariant },
      },
    ].reverse(),
    lastTickAt: formatClock(now),
    tickCount: 3,
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
const snapshot = ref<MonitorViewState>(createSeedSnapshot())
const loading = ref(false)
const errorMessage = ref('')
const initialized = ref(false)

let timer = 0

function clearTimer() {
  if (timer) {
    window.clearInterval(timer)
    timer = 0
  }
}

async function loadSnapshot() {
  if (!initialized.value) {
    loading.value = true
  }
  try {
    const payload = await fetchMonitorSnapshot()
    snapshot.value = applyRemoteSnapshot(snapshot.value, payload.data)
    errorMessage.value = ''
    initialized.value = true
  } catch (error: unknown) {
    const message = readErrorMessage(error, '监控快照加载失败，请稍后重试。')
    errorMessage.value = message
    Message.error({ content: message, duration: 3000 })
  } finally {
    loading.value = false
  }
}

function startTimer() {
  clearTimer()
  timer = window.setInterval(() => {
    void loadSnapshot()
  }, Number(intervalSec.value) * 1000)
}

watch(
  [paused, intervalSec],
  () => {
    if (paused.value) {
      clearTimer()
      return
    }
    void loadSnapshot()
    startTimer()
  },
  { immediate: true },
)

onUnmounted(() => {
  clearTimer()
})

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
      subtitle="轮询监控快照，展示资源水位、吞吐延迟与节点事件"
      :tags="[
        { label: '实时快照', variant: 'success' },
        { label: '登录可见', variant: 'info' },
      ]"
    />

    <PageActionPanel
      title="刷新控制"
      description="按 2 / 3 / 5 秒轮询 GET /api/monitor/snapshot，默认 3 秒；暂停后停止请求，卸载时清除定时器。"
    >
      <template #actions>
        <Segmented
          :model-value="intervalSec"
          :options="intervalOptions"
          @update:model-value="handleIntervalChange"
        />
        <Tag :variant="paused ? 'warning' : 'success'" size="sm">
          {{ paused ? '已暂停' : loading && !initialized ? '加载中' : '刷新中' }}
        </Tag>
        <Tag variant="info" size="sm">最近 {{ snapshot.lastTickAt }}</Tag>
        <Button variant="outline" @click="handleTogglePause">
          {{ paused ? '继续' : '暂停' }}
        </Button>
      </template>
    </PageActionPanel>

    <Card v-if="errorMessage">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Text color="secondary">{{ errorMessage }}</Text>
        <Button variant="outline" @click="loadSnapshot">
          重试
        </Button>
      </div>
    </Card>

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
            :status="progressStatus(gauge.value)"
            :format="formatGaugeProgress(gauge.label)"
          />
        </div>
      </Card>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <Statistic title="QPS" :value="snapshot.qps" suffix="req/s" group-separator />
        <div v-if="snapshot.qpsSeries.length" class="mt-3">
          <AreaChart :data="snapshot.qpsSeries" :height="140" responsive :x-ticks="6" />
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
            :x-ticks="6"
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
              :status="progressStatus(node.cpu)"
              :format="formatCpuProgress"
            />
            <Progress
              :percentage="node.memory"
              :status="progressStatus(node.memory)"
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

    <MutedPanel
      title="演示说明"
      description="本页轮询 GET /api/monitor/snapshot。服务端用内存步进生成指标，不读取真实主机。QPS 与延迟在前端拼接最近 20 点；事件流按接口返回封顶。暂停后不再发请求。"
    />
  </div>
</template>
