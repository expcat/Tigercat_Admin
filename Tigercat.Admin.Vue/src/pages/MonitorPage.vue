<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Button, Card, Tag, Text } from '@expcat/tigercat-vue'
import { Statistic } from '@expcat/tigercat-vue/Statistic'
import { Progress } from '@expcat/tigercat-vue/Progress'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { Badge } from '@expcat/tigercat-vue/Badge'
import { GaugeChart } from '@expcat/tigercat-vue/GaugeChart'
import { AreaChart } from '@expcat/tigercat-vue/AreaChart'
import { LineChart } from '@expcat/tigercat-vue/LineChart'
import { ActivityFeed } from '@expcat/tigercat-vue/ActivityFeed'
import type {
  ActivityItem,
  AreaChartDatum,
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

type IntervalSec = '2' | '3' | '5'
type NodeHealth = 'healthy' | 'warning' | 'critical'

interface MonitorNode {
  id: string
  name: string
  zone: string
  cpu: number
  memory: number
  status: NodeHealth
}

interface MonitorSnapshot {
  cpu: number
  memory: number
  disk: number
  qps: number
  latency: number
  qpsSeries: AreaChartDatum[]
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
  { range: [0, 70] as [number, number], color: '#22c55e' },
  { range: [70, 85] as [number, number], color: '#f59e0b' },
  { range: [85, 100] as [number, number], color: '#ef4444' },
]

const NODE_STATUS_META: Record<NodeHealth, { label: string; variant: TagVariant }> = {
  healthy: { label: '健康', variant: 'success' },
  warning: { label: '告警', variant: 'warning' },
  critical: { label: '异常', variant: 'danger' },
}

const EVENT_TEMPLATES: Array<{
  title: string
  description: string
  status: { label: string; variant: TagVariant }
}> = [
  { title: 'API 网关流量升高', description: '入口 QPS 超过近窗均值', status: { label: '告警', variant: 'warning' } },
  { title: '工作节点恢复', description: '心跳已恢复，流量重新接入', status: { label: '恢复', variant: 'success' } },
  { title: '缓存命中率回升', description: '热点 key 预热完成', status: { label: '正常', variant: 'success' } },
  { title: 'CPU 水位抖动', description: '瞬时计算任务推高水位', status: { label: '抖动', variant: 'info' } },
  { title: '磁盘清理完成', description: '临时文件回收，可用空间回升', status: { label: '运维', variant: 'primary' } },
  { title: '延迟回落到基线', description: 'P95 延迟已回到滚动窗口中位', status: { label: '正常', variant: 'success' } },
  { title: '节点探活超时', description: '单次探活未响应，已自动重试', status: { label: '异常', variant: 'danger' } },
  { title: '自动扩容触发', description: '副本数 +1，等待就绪', status: { label: '扩容', variant: 'info' } },
]

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function walk(current: number, min: number, max: number, step: number): number {
  return clamp(current + (Math.random() * 2 - 1) * step, min, max)
}

function round0(value: number): number {
  return Math.round(value)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function healthFromLoad(cpu: number, memory: number): NodeHealth {
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

function pushWindow(series: AreaChartDatum[], point: AreaChartDatum): AreaChartDatum[] {
  return [...series, point].slice(-WINDOW_SIZE)
}

function seedWindow(values: number[], now: Date, intervalMs: number): AreaChartDatum[] {
  return values.map((y, index) => ({
    x: formatClock(new Date(now.getTime() - (values.length - 1 - index) * intervalMs)),
    y,
  }))
}

function pickEvent(tickCount: number, now: Date): ActivityItem {
  const template = EVENT_TEMPLATES[tickCount % EVENT_TEMPLATES.length]
  const jittered = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]
  const chosen = tickCount < EVENT_TEMPLATES.length ? template : jittered
  return {
    id: `evt-${tickCount}-${now.getTime()}`,
    title: chosen.title,
    description: chosen.description,
    time: now.toISOString(),
    status: chosen.status,
  }
}

function createSeedSnapshot(): MonitorSnapshot {
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
      pickEvent(1, new Date(now.getTime() - 9000)),
      pickEvent(2, new Date(now.getTime() - 6000)),
      pickEvent(3, new Date(now.getTime() - 3000)),
    ].reverse(),
    lastTickAt: formatClock(now),
    tickCount: 3,
  }
}

function applyTick(prev: MonitorSnapshot): MonitorSnapshot {
  const now = new Date()
  const cpu = round0(walk(prev.cpu, 18, 96, 5))
  const memory = round0(walk(prev.memory, 28, 92, 4))
  const disk = round0(walk(prev.disk, 40, 88, 2))
  const qps = round0(walk(prev.qps, 720, 1480, 48))
  const latency = round1(walk(prev.latency, 18, 86, 3.5))
  const clock = formatClock(now)
  const tickCount = prev.tickCount + 1
  const nodes = prev.nodes.map((node, index) => {
    const nextCpu = round0(walk(node.cpu, 16, 96, 6 + index))
    const nextMemory = round0(walk(node.memory, 24, 94, 5))
    return {
      ...node,
      cpu: nextCpu,
      memory: nextMemory,
      status: healthFromLoad(nextCpu, nextMemory),
    }
  })

  return {
    cpu,
    memory,
    disk,
    qps,
    latency,
    qpsSeries: pushWindow(prev.qpsSeries, { x: clock, y: qps }),
    latencySeries: pushWindow(prev.latencySeries, { x: clock, y: latency }),
    nodes,
    events: [pickEvent(tickCount, now), ...prev.events].slice(0, FEED_CAP),
    lastTickAt: clock,
    tickCount,
  }
}

const intervalSec = ref<IntervalSec>(DEFAULT_INTERVAL)
const paused = ref(false)
const snapshot = ref<MonitorSnapshot>(createSeedSnapshot())

let timer = 0

function clearTimer() {
  if (timer) {
    window.clearInterval(timer)
    timer = 0
  }
}

function startTimer() {
  clearTimer()
  timer = window.setInterval(() => {
    snapshot.value = applyTick(snapshot.value)
  }, Number(intervalSec.value) * 1000)
}

watch(
  [paused, intervalSec],
  () => {
    if (paused.value) {
      clearTimer()
      return
    }
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
      subtitle="定时器驱动的资源水位、吞吐延迟与节点事件演示，数据仅存在于当前页面"
      :tags="[
        { label: '实时演示', variant: 'success' },
        { label: '内存数据', variant: 'info' },
      ]"
    />

    <PageActionPanel
      title="刷新控制"
      description="页内 setInterval 模拟实时流，默认 3 秒一拍；暂停后停止 tick，卸载时清除定时器。"
    >
      <template #actions>
        <Segmented
          :model-value="intervalSec"
          :options="intervalOptions"
          @update:model-value="handleIntervalChange"
        />
        <Tag :variant="paused ? 'warning' : 'success'" size="sm">
          {{ paused ? '已暂停' : '刷新中' }}
        </Tag>
        <Tag variant="info" size="sm">最近 {{ snapshot.lastTickAt }}</Tag>
        <Button variant="outline" @click="handleTogglePause">
          {{ paused ? '继续' : '暂停' }}
        </Button>
      </template>
    </PageActionPanel>

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
      <Card v-for="gauge in gauges" :key="gauge.key" :title="`${gauge.label} 水位`">
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
          <AreaChart :data="snapshot.qpsSeries" :height="140" />
        </div>
        <ChartEmptyState v-else description="暂无 QPS 滚动数据" height-class="h-36" />
      </Card>
      <Card>
        <Statistic title="P95 延迟" :value="snapshot.latency" suffix="ms" :precision="1" />
        <div v-if="snapshot.latencySeries.length" class="mt-3">
          <LineChart
            :data="snapshot.latencySeries"
            :height="140"
            :show-area="false"
            :show-points="false"
            :include-zero="true"
            line-color="#3b82f6"
            :x-tick-format="formatTickLabel"
          />
        </div>
        <ChartEmptyState v-else description="暂无延迟滚动数据" height-class="h-36" />
      </Card>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card title="节点状态">
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

      <Card title="实时事件">
        <ActivityFeed
          v-if="snapshot.events.length"
          :items="snapshot.events"
          empty-text="暂无实时事件"
          :group-by="groupMonitorEvents"
        />
        <ChartEmptyState v-else description="暂无实时事件" height-class="min-h-40" />
      </Card>
    </div>

    <MutedPanel
      title="演示说明"
      description="本页不请求后端，也不走 MockApi。CPU / 内存 / 磁盘做随机游走，QPS 与延迟维护固定长度滚动窗口，事件流按上限裁剪。切换刷新间隔会重置定时器；离开页面时 interval 会被清除。"
    />
  </div>
</template>
