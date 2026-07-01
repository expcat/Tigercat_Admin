<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card, Text, Tag, Button, Input, Message } from '@expcat/tigercat-vue'
import { Badge } from '@expcat/tigercat-vue/Badge'
import { Switch } from '@expcat/tigercat-vue/Switch'
import { Progress } from '@expcat/tigercat-vue/Progress'
import { Steps, StepsItem } from '@expcat/tigercat-vue/Steps'
import { Drawer } from '@expcat/tigercat-vue/Drawer'
import { CronEditor } from '@expcat/tigercat-vue/CronEditor'
import { Stepper } from '@expcat/tigercat-vue/Stepper'
import { InputGroup, InputGroupAddon } from '@expcat/tigercat-vue/InputGroup'
import { NumberKeyboard } from '@expcat/tigercat-vue/NumberKeyboard'
import { Gantt } from '@expcat/tigercat-vue/Gantt'
import type { GanttTask, CronPreset, TagVariant } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MetricGrid from '../components/MetricGrid.vue'
import MetricCard from '../components/MetricCard.vue'
import MutedPanel from '../components/MutedPanel.vue'
import Icon from '../components/Icon.vue'

type JobStatus = 'running' | 'paused' | 'failed'

interface Job {
  id: string
  name: string
  cron: string
  concurrency: number
  timeout: string
  batchSize: string
  enabled: boolean
  status: JobStatus
  lastRun: string
  nextRun: string
  progress: number
  phase: number
}

const RUN_PHASES = ['排队', '运行', '回调', '完成']

const STATUS_META: Record<JobStatus, { label: string; variant: TagVariant }> = {
  running: { label: '运行中', variant: 'success' },
  paused: { label: '已暂停', variant: 'default' },
  failed: { label: '失败', variant: 'danger' },
}

const CRON_PRESETS: CronPreset[] = [
  { label: '每分钟', value: '* * * * *', description: '每分钟执行一次' },
  { label: '每小时', value: '0 * * * *', description: '每小时整点执行' },
  { label: '每天 02:00', value: '0 2 * * *', description: '每天凌晨两点' },
  { label: '每周一 09:00', value: '0 9 * * 1', description: '每周一上午九点' },
]

// ── 任务数据（页面内内存数据）────────────────────────
const jobs = ref<Job[]>([
  {
    id: 'JOB-1001',
    name: '每日对账批处理',
    cron: '0 2 * * *',
    concurrency: 4,
    timeout: '120',
    batchSize: '2000',
    enabled: true,
    status: 'running',
    lastRun: '2026-07-01 02:00',
    nextRun: '2026-07-02 02:00',
    progress: 64,
    phase: 1,
  },
  {
    id: 'JOB-1002',
    name: '订单数据归档',
    cron: '0 3 * * 0',
    concurrency: 2,
    timeout: '300',
    batchSize: '5000',
    enabled: true,
    status: 'running',
    lastRun: '2026-06-29 03:00',
    nextRun: '2026-07-06 03:00',
    progress: 28,
    phase: 1,
  },
  {
    id: 'JOB-1003',
    name: '缓存预热',
    cron: '*/30 * * * *',
    concurrency: 8,
    timeout: '60',
    batchSize: '500',
    enabled: false,
    status: 'paused',
    lastRun: '2026-06-30 23:30',
    nextRun: '—',
    progress: 100,
    phase: 3,
  },
  {
    id: 'JOB-1004',
    name: '报表快照生成',
    cron: '0 6 * * *',
    concurrency: 1,
    timeout: '180',
    batchSize: '1000',
    enabled: true,
    status: 'failed',
    lastRun: '2026-07-01 06:00',
    nextRun: '2026-07-02 06:00',
    progress: 42,
    phase: 2,
  },
])

// ── Gantt 执行时间轴（近一周运行窗口）────────────────
const GANTT_RUNS: GanttTask[] = [
  { id: 'JOB-1001', label: '每日对账批处理', start: '2026-06-30', end: '2026-07-02', progress: 64, color: '#22c55e' },
  { id: 'JOB-1002', label: '订单数据归档', start: '2026-06-29', end: '2026-07-01', progress: 28, color: '#3b82f6' },
  { id: 'JOB-1003', label: '缓存预热', start: '2026-06-28', end: '2026-06-30', progress: 100, color: '#94a3b8' },
  { id: 'JOB-1004', label: '报表快照生成', start: '2026-07-01', end: '2026-07-03', progress: 42, color: '#ef4444' },
]

// ── 概览指标 ──────────────────────────────────────
const totalCount = computed(() => jobs.value.length)
const runningCount = computed(() => jobs.value.filter((j) => j.status === 'running').length)
const pausedCount = computed(() => jobs.value.filter((j) => j.status === 'paused').length)
const failedCount = computed(() => jobs.value.filter((j) => j.status === 'failed').length)

// ── 选中任务 ──────────────────────────────────────
const selectedId = ref<string | null>(jobs.value[0]?.id ?? null)
const selected = computed(() => jobs.value.find((j) => j.id === selectedId.value) ?? null)
function selectJob(id: string) {
  selectedId.value = id
}

function toggleJob(job: Job, next: boolean) {
  job.enabled = next
  job.status = next ? 'running' : 'paused'
  job.nextRun = next ? job.nextRun === '—' ? '待调度' : job.nextRun : '—'
  Message.success({ content: `任务「${job.name}」已${next ? '启用' : '暂停'}（演示）`, duration: 2000 })
}

// ── 新建 / 编辑任务 ────────────────────────────────
const drawerOpen = ref(false)
const editingId = ref<string | null>(null)
const form = ref({
  name: '',
  cron: '0 2 * * *',
  concurrency: 2,
  timeout: '60',
  batchSize: '500',
  enabled: true,
})

const drawerTitle = computed(() => (editingId.value ? '编辑任务' : '新建任务'))

function openCreate() {
  editingId.value = null
  form.value = { name: '', cron: '0 2 * * *', concurrency: 2, timeout: '60', batchSize: '500', enabled: true }
  drawerOpen.value = true
}
function openEdit(job: Job) {
  editingId.value = job.id
  form.value = {
    name: job.name,
    cron: job.cron,
    concurrency: job.concurrency,
    timeout: job.timeout,
    batchSize: job.batchSize,
    enabled: job.enabled,
  }
  drawerOpen.value = true
}

function submitJob() {
  const name = form.value.name.trim()
  if (!name) {
    Message.warning({ content: '请填写任务名称', duration: 2000 })
    return
  }
  if (editingId.value) {
    const job = jobs.value.find((j) => j.id === editingId.value)
    if (job) {
      job.name = name
      job.cron = form.value.cron
      job.concurrency = form.value.concurrency
      job.timeout = form.value.timeout
      job.batchSize = form.value.batchSize
      job.enabled = form.value.enabled
      job.status = form.value.enabled ? 'running' : 'paused'
    }
    Message.success({ content: `任务「${name}」已更新（演示）`, duration: 2200 })
  } else {
    const id = `JOB-${1004 + jobs.value.length + 1}`
    jobs.value = [
      {
        id,
        name,
        cron: form.value.cron,
        concurrency: form.value.concurrency,
        timeout: form.value.timeout,
        batchSize: form.value.batchSize,
        enabled: form.value.enabled,
        status: form.value.enabled ? 'running' : 'paused',
        lastRun: '—',
        nextRun: form.value.enabled ? '待调度' : '—',
        progress: 0,
        phase: 0,
      },
      ...jobs.value,
    ]
    selectedId.value = id
    Message.success({ content: `任务「${name}」已创建（演示）`, duration: 2400 })
  }
  drawerOpen.value = false
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="clock"
      title="定时任务"
      subtitle="调度表达式配置、启停控制与执行时间轴监控的运维工作台"
      :tags="[
        { label: '运维', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
      ]"
    />

    <MetricGrid :columns="4">
      <MetricCard title="任务总数" :value="totalCount" description="全部调度任务">
        <template #icon><Icon name="clock" :size="20" /></template>
      </MetricCard>
      <MetricCard title="运行中" :value="runningCount" description="正在调度执行">
        <template #icon><Icon name="zap" :size="20" /></template>
      </MetricCard>
      <MetricCard title="已暂停" :value="pausedCount" description="已停用调度">
        <template #icon><Icon name="ban" :size="20" /></template>
      </MetricCard>
      <MetricCard title="今日失败" :value="failedCount" description="需关注重试">
        <template #icon><Icon name="activity" :size="20" /></template>
      </MetricCard>
    </MetricGrid>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Text weight="bold">任务列表</Text>
        <Badge :content="runningCount" variant="success" standalone />
        <Text size="sm" color="secondary">个运行中</Text>
      </div>
      <Button @click="openCreate">
        <Icon name="plus" :size="16" class="mr-1" />
        新建任务
      </Button>
    </div>

    <Card class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-(--tiger-border,#e5e7eb) text-left text-(--tiger-text-secondary,#64748b)">
              <th class="px-3 py-2 font-medium">任务名称</th>
              <th class="px-3 py-2 font-medium">调度表达式</th>
              <th class="px-3 py-2 font-medium">状态</th>
              <th class="px-3 py-2 font-medium">上次 / 下次执行</th>
              <th class="px-3 py-2 font-medium">执行进度</th>
              <th class="px-3 py-2 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="job in jobs"
              :key="job.id"
              class="cursor-pointer border-b border-(--tiger-border,#e5e7eb) transition-colors"
              :class="
                job.id === selectedId
                  ? 'bg-(--tiger-primary,#3b82f6)/5'
                  : 'hover:bg-(--tiger-bg-hover,#f1f5f9)'
              "
              @click="selectJob(job.id)"
            >
              <td class="px-3 py-3">
                <Text weight="medium">{{ job.name }}</Text>
                <div class="text-xs text-(--tiger-text-secondary,#64748b)">{{ job.id }}</div>
              </td>
              <td class="px-3 py-3">
                <Tag variant="info" size="sm">{{ job.cron }}</Tag>
              </td>
              <td class="px-3 py-3" @click.stop>
                <div class="flex items-center gap-2">
                  <Switch :checked="job.enabled" @update:checked="(v: boolean) => toggleJob(job, v)" />
                  <Tag :variant="STATUS_META[job.status].variant" size="sm">
                    {{ STATUS_META[job.status].label }}
                  </Tag>
                </div>
              </td>
              <td class="px-3 py-3">
                <div class="text-xs text-(--tiger-text-secondary,#64748b)">上次 {{ job.lastRun }}</div>
                <div class="text-xs text-(--tiger-text-secondary,#64748b)">下次 {{ job.nextRun }}</div>
              </td>
              <td class="px-3 py-3">
                <div class="w-32">
                  <Progress
                    :percentage="job.progress"
                    :status="job.status === 'failed' ? 'exception' : undefined"
                    size="sm"
                  />
                </div>
              </td>
              <td class="px-3 py-3 text-right" @click.stop>
                <Button variant="outline" size="sm" @click="openEdit(job)">
                  <Icon name="edit" :size="14" class="mr-1" />
                  编辑
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card class="lg:col-span-2">
        <template #header><Text weight="bold">执行时间轴</Text></template>
        <div class="overflow-x-auto">
          <Gantt
            :data="GANTT_RUNS"
            :width="720"
            :height="240"
            scale="day"
            show-today
            show-progress
            :selected-id="selectedId"
            @task-click="(task: GanttTask) => selectJob(String(task.id))"
          />
        </div>
        <MutedPanel
          compact
          description="展示近一周各任务的运行窗口；今日高亮为参考线。点击色条可联动选中对应任务。"
        />
      </Card>

      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <Text weight="bold">运行阶段</Text>
            <Text v-if="selected" size="sm" color="secondary">{{ selected.name }}</Text>
          </div>
        </template>
        <Steps v-if="selected" :current="selected.phase" direction="vertical" size="small">
          <StepsItem
            v-for="(label, idx) in RUN_PHASES"
            :key="label"
            :title="label"
            :description="idx === selected.phase ? '当前阶段' : ''"
          />
        </Steps>
        <MutedPanel v-else description="请选择任务查看其运行阶段。" />
      </Card>
    </div>

    <!-- 新建 / 编辑任务 -->
    <Drawer
      placement="right"
      :open="drawerOpen"
      :title="drawerTitle"
      width="460px"
      :mask="true"
      :mask-closable="true"
      @update:open="(v: boolean) => (drawerOpen = v)"
      @close="drawerOpen = false"
    >
      <div class="space-y-4">
        <div>
          <Text weight="medium" class="mb-1 block">任务名称</Text>
          <Input v-model="form.name" placeholder="例如：每日对账批处理" />
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">调度表达式</Text>
          <CronEditor v-model="form.cron" :presets="CRON_PRESETS" />
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">并发数</Text>
          <Stepper v-model="form.concurrency" :min="1" :max="20" :step="1" />
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">超时时间</Text>
          <InputGroup>
            <Input v-model="form.timeout" placeholder="60" />
            <InputGroupAddon>秒</InputGroupAddon>
          </InputGroup>
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">每批处理条数</Text>
          <NumberKeyboard v-model="form.batchSize" mode="number" :max-length="6" />
        </div>
        <div class="flex items-center gap-2">
          <Switch v-model:checked="form.enabled" />
          <Text size="sm" color="secondary">保存后立即启用</Text>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="drawerOpen = false">取消</Button>
          <Button @click="submitJob">{{ editingId ? '保存修改' : '创建任务' }}</Button>
        </div>
      </div>
    </Drawer>
  </div>
</template>
