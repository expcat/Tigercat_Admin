<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Input } from '@expcat/tigercat-vue/Input'
import { Message } from '@expcat/tigercat-vue/Message'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Badge } from '@expcat/tigercat-vue/Badge'
import { Switch } from '@expcat/tigercat-vue/Switch'
import { Progress } from '@expcat/tigercat-vue/Progress'
import { Steps, StepsItem } from '@expcat/tigercat-vue/Steps'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Drawer } from '@expcat/tigercat-vue/Drawer'
import { CronEditor } from '@expcat/tigercat-vue/CronEditor'
import { InputNumber } from '@expcat/tigercat-vue/InputNumber'
import { InputGroup, InputGroupAddon } from '@expcat/tigercat-vue/InputGroup'
import { NumberKeyboard } from '@expcat/tigercat-vue/NumberKeyboard'
import { Gantt } from '../utils/lazyTigercat'
import { parseOptionalInt, validateCronExpression, type GanttTask, type CronPreset } from '@expcat/tigercat-core'
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
  validateJobForm,
  JOB_STATUS_META as STATUS_META,
  type Job,
  type JobForm,
} from '../utils/jobs'

const RUN_PHASES = ['排队', '运行', '回调', '完成']

const CRON_PRESETS: CronPreset[] = [
  { label: '每分钟', value: '* * * * *', description: '每分钟执行一次' },
  { label: '每小时', value: '0 * * * *', description: '每小时整点执行' },
  { label: '每天 02:00', value: '0 2 * * *', description: '每天凌晨两点' },
  { label: '每周一 09:00', value: '0 9 * * 1', description: '每周一上午九点' },
]

const jobs = ref<Job[]>([])
const loading = ref(true)
const errorMessage = ref('')
const formError = ref('')
const cronValid = ref(true)
const formRef = ref<HTMLFormElement | null>(null)
let listController: AbortController | null = null
let writePending = false
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

async function loadJobs(preferId?: string | null) {
  listController?.abort()
  const controller = new AbortController()
  listController = controller
  errorMessage.value = ''
  loading.value = true
  try {
    const payload = await fetchJobs(controller.signal)
    if (controller.signal.aborted) return
    const items = payload.data ?? []
    selectedId.value = preferId ?? selectedId.value
    jobs.value = items
    if (!selectedId.value || !items.some((item) => item.id === selectedId.value)) {
      selectedId.value = items[0]?.id ?? null
    }
  } catch (error: unknown) {
    if (!controller.signal.aborted) errorMessage.value = readErrorMessage(error, '任务列表加载失败')
  } finally {
    if (listController === controller) loading.value = false
  }
}

function selectJob(id: string) {
  selectedId.value = id
}

async function toggleJob(job: Job, next: boolean) {
  if (writePending) return
  writePending = true
  togglingId.value = job.id
  jobs.value = jobs.value.map(item => item.id === job.id ? { ...item, enabled: next } : item)
  try {
    const updated = await updateJob(job.id, { enabled: next })
    jobs.value = jobs.value.map(item => item.id === job.id ? updated.data : item)
    Message.success({ content: `任务「${job.name}」已${next ? '启用' : '暂停'}`, duration: 2000 })
    await loadJobs(job.id)
  } catch (error: unknown) {
    jobs.value = jobs.value.map(item => item.id === job.id ? job : item)
    Message.error({ content: readErrorMessage(error, '任务启停失败'), duration: 3000 })
  } finally {
    togglingId.value = null
    writePending = false
  }
}

const drawerOpen = ref(false)
const formVersion = ref(0)
const editingId = ref<string | null>(null)
const form = ref<JobForm>({
  name: '',
  cron: '0 2 * * *',
  concurrency: 2,
  timeout: '60',
  batchSize: '500',
  enabled: true,
})

const drawerTitle = computed(() => (editingId.value ? '编辑任务' : '新建任务'))

function setConcurrency(value: number | string | null) {
  form.value.concurrency = value === null || value === '' ? null : Number(value)
}

let drawerTrigger: HTMLElement | null = null
function captureDrawerTrigger() {
  drawerTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
}
function focusDrawerTrigger() {
  drawerTrigger?.focus()
}
function openCreate() {
  captureDrawerTrigger()
  formVersion.value += 1
  editingId.value = null
  formError.value = ''
  cronValid.value = true
  form.value = { name: '', cron: '0 2 * * *', concurrency: 2, timeout: '60', batchSize: '500', enabled: true }
  drawerOpen.value = true
}
function openEdit(job: Job) {
  captureDrawerTrigger()
  formVersion.value += 1
  editingId.value = job.id
  formError.value = ''
  cronValid.value = validateCronExpression(job.cron).valid
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
  if (writePending) return
  // rc.2 的非整数子字段草稿不会触发 validate，提交前仍需检查可见草稿。
  const invalidCronDraft = Array.from(formRef.value?.querySelectorAll<HTMLInputElement>('[data-job-field="cron"] input[inputmode="numeric"]') ?? [])
    .find(input => parseOptionalInt(input.value) === null)
  const error = validateJobForm(form.value, cronValid.value && !invalidCronDraft)
  if (error) {
    formError.value = error.message
    const field = error.field === 'cron' && invalidCronDraft ? invalidCronDraft
      : formRef.value?.querySelector<HTMLElement>(`[data-job-field="${error.field}"] input`)
        ?? formRef.value?.querySelector<HTMLElement>(`[data-job-field="${error.field}"] button`)
    field?.focus()
    return
  }
  const name = form.value.name.trim()
  const payload = { ...form.value, name, concurrency: Number(form.value.concurrency) }
  writePending = true
  formError.value = ''
  submitting.value = true
  try {
    const saved = editingId.value ? await updateJob(editingId.value, payload) : await createJob(payload)
    jobs.value = jobs.value.some(item => item.id === saved.data.id)
      ? jobs.value.map(item => item.id === saved.data.id ? saved.data : item)
      : [...jobs.value, saved.data].sort((a, b) => a.id.localeCompare(b.id))
    selectedId.value = saved.data.id
    Message.success({ content: `任务「${name}」配置已${editingId.value ? '更新' : '创建'}`, duration: 2200 })
    drawerOpen.value = false
    await loadJobs(saved.data.id)
  } catch (error: unknown) {
    formError.value = readErrorMessage(error, editingId.value ? '任务更新失败' : '任务创建失败')
  } finally {
    submitting.value = false
    writePending = false
  }
}
function closeDrawer() {
  if (!writePending) drawerOpen.value = false
}

onMounted(() => {
  void loadJobs()
})
onBeforeUnmount(() => listController?.abort())
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="clock"
      title="定时任务"
      subtitle="保存任务配置与启停标记；状态、进度和时间轴仅为示例"
      :tags="[
        { label: '运维', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
      ]"
    />

    <Alert type="info" title="任务配置展示" description="本页没有真实调度执行器或运行历史。保存和启停仅更新配置，不会触发执行；时间、进度与阶段为接口示例字段。" />

    <MetricGrid :columns="4">
      <MetricCard title="任务总数" :value="totalCount" description="已保存的任务配置">
        <template #icon><Icon name="clock" :size="20" /></template>
      </MetricCard>
      <MetricCard title="运行中（示例）" :value="runningCount" description="接口状态为 running">
        <template #icon><Icon name="zap" :size="20" /></template>
      </MetricCard>
      <MetricCard title="已暂停" :value="pausedCount" description="已停用配置">
        <template #icon><Icon name="ban" :size="20" /></template>
      </MetricCard>
      <MetricCard title="失败（示例）" :value="failedCount" description="接口状态为 failed，无日期统计">
        <template #icon><Icon name="activity" :size="20" /></template>
      </MetricCard>
    </MetricGrid>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Text weight="bold">任务列表</Text>
        <Badge :content="runningCount" variant="success" standalone />
        <Text size="sm" color="secondary">个 running 示例状态</Text>
      </div>
      <Button :disabled="loading || togglingId !== null || submitting" @click="openCreate">
        <Icon name="plus" :size="16" class="mr-1" />
        新建任务
      </Button>
    </div>

    <div v-if="errorMessage" role="alert"><Alert type="error" :title="errorMessage" /><Button :disabled="loading || togglingId !== null || submitting" @click="loadJobs()">重试任务列表</Button></div>

    <Card class="overflow-hidden">
      <MutedPanel v-if="loading && jobs.length === 0" compact description="正在加载任务…" />
      <MutedPanel v-else-if="jobs.length === 0" :description="errorMessage ? '任务列表尚未加载，请重试。' : '暂无任务配置，可新建任务。'" />
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-(--tiger-border,#e5e7eb) text-left text-(--tiger-text-secondary,#64748b)">
              <th class="px-3 py-2 font-medium">任务名称</th>
              <th class="px-3 py-2 font-medium">调度表达式</th>
              <th class="px-3 py-2 font-medium">状态</th>
              <th class="px-3 py-2 font-medium">上次 / 下次（示例）</th>
              <th class="px-3 py-2 font-medium">进度（示例）</th>
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
                <button type="button" class="text-left" :aria-label="`查看任务：${job.name}`" :aria-pressed="job.id === selectedId" @click="selectJob(job.id)"><Text weight="medium">{{ job.name }}</Text></button>
                <div class="text-xs text-(--tiger-text-secondary,#64748b)">{{ job.id }}</div>
              </td>
              <td class="px-3 py-3">
                <Tag variant="info" size="sm">{{ job.cron }}</Tag>
              </td>
              <td class="px-3 py-3" @click.stop>
                <div class="flex items-center gap-2">
                  <Switch
                    :aria-label="`启用任务：${job.name}`"
                    :model-value="job.enabled"
                    :disabled="loading || togglingId !== null || submitting"
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
                <Button variant="outline" size="sm" :disabled="loading || togglingId !== null || submitting" @click="openEdit(job)">
                  <Icon name="edit" :size="14" class="mr-1" />
                  编辑
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <div class="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
      <Card class="min-w-0 lg:col-span-2">
        <template #header><Text weight="bold">执行时间轴（示例）</Text></template>
        <MutedPanel v-if="loading && jobs.length === 0" description="正在加载时间轴…" />
        <MutedPanel v-else-if="ganttRuns.length === 0" :description="errorMessage ? '时间轴数据尚未加载。' : '暂无时间轴数据。'" />
        <div v-else class="overflow-x-auto">
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
          description="展示接口 start / end 的示例窗口，与 Cron 无联动，不是运行历史。今日高亮仅为参考线；点击色条可选中配置。"
        />
      </Card>

      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <Text weight="bold">运行阶段（示例）</Text>
            <Text v-if="selected" size="sm" color="secondary">{{ selected.name }}</Text>
          </div>
        </template>
        <Steps v-if="selected" :current="selected.phase" orientation="vertical" size="sm">
          <StepsItem
            v-for="(label, idx) in RUN_PHASES"
            :key="label"
            :title="label"
            :description="idx === selected.phase ? '接口示例阶段' : ''"
          />
        </Steps>
        <MutedPanel v-else description="请选择任务查看示例阶段。" />
      </Card>
    </div>

    <Drawer
      placement="right"
      :open="drawerOpen"
      :title="drawerTitle"
      width="460px"
      :mask="true"
      :mask-closable="!submitting"
      @update:open="(v: boolean) => { if (!v) closeDrawer() }"
      @close="closeDrawer"
      @after-close="focusDrawerTrigger"
    >
      <form ref="formRef" novalidate @submit.prevent="submitJob">
        <div v-if="formError" role="alert" class="mb-4"><Alert type="error" :title="formError" /></div>
        <fieldset :disabled="submitting" class="space-y-4">
        <div data-job-field="name">
          <label for="job-name" class="mb-1 block font-medium">任务名称</label>
          <Input id="job-name" v-model="form.name" :max-length="120" placeholder="例如：每日对账批处理" />
        </div>
        <div data-job-field="cron">
          <Text weight="medium" class="mb-1 block">调度表达式</Text>
          <CronEditor :key="formVersion" id="job-cron" aria-label="调度表达式" v-model="form.cron" :presets="CRON_PRESETS" :disabled="submitting" @validate="(validation) => (cronValid = validation.valid)" />
        </div>
        <div data-job-field="concurrency">
          <Text weight="medium" class="mb-1 block">并发数</Text>
          <InputNumber
            aria-label="并发数"
            :model-value="form.concurrency"
            :disabled="submitting"
            :min="1"
            :max="20"
            :step="1"
            controls-position="both"
            @update:model-value="setConcurrency"
          />
        </div>
        <div data-job-field="timeout">
          <label for="job-timeout" class="mb-1 block font-medium">超时时间</label>
          <InputGroup>
            <Input id="job-timeout" v-model="form.timeout" :max-length="16" placeholder="60" />
            <InputGroupAddon>秒</InputGroupAddon>
          </InputGroup>
        </div>
        <div data-job-field="batchSize" role="group" aria-label="每批处理条数">
          <Text weight="medium" class="mb-1 block">每批处理条数</Text>
          <Text size="sm" color="secondary" class="mb-2 block">当前值：{{ form.batchSize || '空（保存时沿用接口默认值）' }}</Text>
          <NumberKeyboard v-model="form.batchSize" mode="number" :max-length="16" :disabled="submitting" />
        </div>
        <div class="flex items-center gap-2">
          <Switch v-model="form.enabled" :disabled="submitting" aria-label="保存为启用配置" />
          <Text size="sm" color="secondary">保存为启用配置（不会触发执行）</Text>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" :disabled="submitting" @click="closeDrawer">取消</Button>
          <Button type="submit" :disabled="submitting">{{ editingId ? '保存修改' : '创建任务' }}</Button>
        </div>
        </fieldset>
      </form>
    </Drawer>
  </div>
</template>
