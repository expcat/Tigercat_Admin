<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
import type { GanttTask, CronPreset } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MetricGrid from '../components/MetricGrid.vue'
import MetricCard from '../components/MetricCard.vue'
import MutedPanel from '../components/MutedPanel.vue'
import Icon from '../components/Icon.vue'
import {
  createJob,
  fetchJobs,
  toGanttTasks,
  updateJob,
  JOB_STATUS_META as STATUS_META,
  type Job,
} from '../utils/jobs'

const RUN_PHASES = ['排队', '运行', '回调', '完成']

const CRON_PRESETS: CronPreset[] = [
  { label: '每分钟', value: '* * * * *', description: '每分钟执行一次' },
  { label: '每小时', value: '0 * * * *', description: '每小时整点执行' },
  { label: '每天 02:00', value: '0 2 * * *', description: '每天凌晨两点' },
  { label: '每周一 09:00', value: '0 9 * * 1', description: '每周一上午九点' },
]

const jobs = ref<Job[]>([])
const loading = ref(false)
const togglingId = ref<string | null>(null)
const submitting = ref(false)
const selectedId = ref<string | null>(null)
const selected = computed(() => jobs.value.find((j) => j.id === selectedId.value) ?? null)

const ganttRuns = computed(() => toGanttTasks(jobs.value))

const totalCount = computed(() => jobs.value.length)
const runningCount = computed(() => jobs.value.filter((j) => j.status === 'running').length)
const pausedCount = computed(() => jobs.value.filter((j) => j.status === 'paused').length)
const failedCount = computed(() => jobs.value.filter((j) => j.status === 'failed').length)

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

async function loadJobs() {
  loading.value = true
  try {
    const payload = await fetchJobs()
    const items = payload.data ?? []
    jobs.value = items
    if (!selectedId.value || !items.some((item) => item.id === selectedId.value)) {
      selectedId.value = items[0]?.id ?? null
    }
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '任务列表加载失败'), duration: 3000 })
  } finally {
    loading.value = false
  }
}

function selectJob(id: string) {
  selectedId.value = id
}

async function toggleJob(job: Job, next: boolean) {
  togglingId.value = job.id
  try {
    await updateJob(job.id, { enabled: next })
    Message.success({ content: `任务「${job.name}」已${next ? '启用' : '暂停'}`, duration: 2000 })
    await loadJobs()
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '任务启停失败'), duration: 3000 })
  } finally {
    togglingId.value = null
  }
}

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

async function submitJob() {
  const name = form.value.name.trim()
  if (!name) {
    Message.warning({ content: '请填写任务名称', duration: 2000 })
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await updateJob(editingId.value, {
        name,
        cron: form.value.cron,
        concurrency: form.value.concurrency,
        timeout: form.value.timeout,
        batchSize: form.value.batchSize,
        enabled: form.value.enabled,
      })
      Message.success({ content: `任务「${name}」已更新`, duration: 2200 })
    } else {
      const created = await createJob({
        name,
        cron: form.value.cron,
        concurrency: form.value.concurrency,
        timeout: form.value.timeout,
        batchSize: form.value.batchSize,
        enabled: form.value.enabled,
      })
      selectedId.value = created.data.id
      Message.success({ content: `任务「${name}」已创建`, duration: 2400 })
    }
    drawerOpen.value = false
    await loadJobs()
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, editingId.value ? '任务更新失败' : '任务创建失败'), duration: 3000 })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadJobs()
})
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
      <MutedPanel v-if="loading && jobs.length === 0" compact description="正在加载任务…" />
      <div v-else class="overflow-x-auto">
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
                  <Switch
                    :model-value="job.enabled"
                    :disabled="togglingId === job.id"
                    @update:model-value="(v: boolean) => toggleJob(job, v)"
                  />
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
            :data="ganttRuns"
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
          description="展示近一周各任务的运行窗口（时间来自接口的 start / end）；今日高亮为参考线。点击色条可联动选中对应任务。"
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
          <Switch v-model="form.enabled" />
          <Text size="sm" color="secondary">保存后立即启用</Text>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="drawerOpen = false">取消</Button>
          <Button :disabled="submitting" @click="submitJob">{{ editingId ? '保存修改' : '创建任务' }}</Button>
        </div>
      </div>
    </Drawer>
  </div>
</template>
