<script setup lang="ts">
import type { CalendarEvent, CalendarEventType } from '../utils/types'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Message } from '@expcat/tigercat-vue/Message'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Calendar } from '@expcat/tigercat-vue/Calendar'
import { Countdown } from '@expcat/tigercat-vue/Countdown'
import { Statistic } from '@expcat/tigercat-vue/Statistic'
import { Badge } from '@expcat/tigercat-vue/Badge'
import { Popover } from '@expcat/tigercat-vue/Popover'
import { List } from '@expcat/tigercat-vue/List'
import { Drawer } from '@expcat/tigercat-vue/Drawer'
import { DatePicker } from '@expcat/tigercat-vue/DatePicker'
import { TimePicker } from '@expcat/tigercat-vue/TimePicker'
import { RadioGroup } from '@expcat/tigercat-vue/RadioGroup'
import { Radio } from '@expcat/tigercat-vue/Radio'
import { Input } from '@expcat/tigercat-vue/Input'
import {
  calendarDateCellDotClasses,
  calendarDateCellExtraClasses,
  getCalendarEventDotStyle,
  type DatePickerModelValue,
  type ListItem,
  type TimePickerModelValue,
} from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'
import Icon from '../components/Icon.vue'
import {
  calendarQueryRange,
  createCalendarEvent,
  fetchCalendarEvents,
  formatCalendarDate,
  parseCalendarDate,
  toCalendarCellEvents,
} from '../utils/calendar'

const TYPE_META: Record<CalendarEventType, { label: string; variant: 'primary' | 'warning' | 'danger' | 'info' }> = {
  meeting: { label: '会议', variant: 'primary' },
  review: { label: '评审', variant: 'warning' },
  release: { label: '发布', variant: 'danger' },
  reminder: { label: '提醒', variant: 'info' },
}

const events = ref<CalendarEvent[]>([])
const loading = ref(true)
const submitting = ref(false)
const loadError = ref('')
const submitError = ref('')
const reloadVersion = ref(0)
const clockNow = ref(Date.now())
const formRef = ref<HTMLFormElement | null>(null)
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
let eventsRequest: AbortController | null = null
const route = useRoute()
const queryDate = computed(() => typeof route.query.date === 'string' ? route.query.date : null)
const queryEventId = computed(() => typeof route.query.eventId === 'string' ? route.query.eventId : null)
const selectedDate = ref<Date>(parseCalendarDate(queryDate.value) ?? new Date())
const activeEventId = ref<string | null>(null)

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

function onDateChange(value: unknown) {
  if (value instanceof Date) { selectedDate.value = value; activeEventId.value = null }
}

const selectedKey = computed(() => formatCalendarDate(selectedDate.value))
const eventsForSelected = computed(() =>
  events.value
    .filter((e) => e.date === selectedKey.value)
    .sort((a, b) => a.start.localeCompare(b.start)),
)

watch([queryDate, queryEventId], () => {
  selectedDate.value = parseCalendarDate(queryDate.value) ?? new Date()
  activeEventId.value = null
})
watch([events, loading, loadError, selectedKey, queryDate, queryEventId], async () => {
  if (loading.value || loadError.value || !parseCalendarDate(queryDate.value) || selectedKey.value !== queryDate.value || !queryEventId.value) return
  const target = events.value.find(event => event.id === queryEventId.value && event.date === queryDate.value)
  if (!target) return
  await nextTick()
  const trigger = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-calendar-event]'))
    .find(button => button.dataset.calendarEvent === target.id)
  trigger?.scrollIntoView({ block: 'nearest' })
  trigger?.focus()
  activeEventId.value = target.id
})
const targetError = computed(() => (queryDate.value !== null || queryEventId.value !== null) && !parseCalendarDate(queryDate.value)
  ? '日程定位日期无效，已显示今天。'
  : queryEventId.value && !loading.value && !loadError.value && selectedKey.value === queryDate.value && !events.value.some(event => event.id === queryEventId.value && event.date === queryDate.value)
    ? '指定日程不存在于该日期或已被移除，请核对链接。' : '')

const todayCount = computed(() => events.value.filter((e) => e.date === formatCalendarDate(new Date())).length)
const monthCount = computed(() => {
  const ym = selectedKey.value.slice(0, 7)
  return events.value.filter((e) => e.date.startsWith(ym)).length
})

const upcoming = computed(() =>
  events.value
    .map((e) => ({ ...e, ts: new Date(`${e.date}T${e.start}:00`).getTime() }))
    .sort((a, b) => a.ts - b.ts),
)
const nextEvent = computed(() => upcoming.value.find((e) => e.ts > clockNow.value) ?? null)
const countdownTarget = computed(() => (nextEvent.value ? new Date(nextEvent.value.ts) : null))
function handleCountdownFinish() {
  clockNow.value = Date.now()
  Message.info({ content: '有一个日程已到开始时间', duration: 2600 })
}

const cellEvents = computed(() => toCalendarCellEvents(events.value))

const upcomingList = computed<ListItem[]>(() =>
  upcoming.value
    .filter((e) => e.ts > clockNow.value)
    .slice(0, 5)
    .map((e) => ({
      key: e.id,
      title: `${e.date} ${e.start} · ${e.title}`,
      description: `${TYPE_META[e.type].label} · ${e.location}`,
    })),
)

const drawerOpen = ref(false)
const form = ref({
  title: '',
  date: new Date() as DatePickerModelValue,
  start: '10:00' as TimePickerModelValue,
  end: '11:00' as TimePickerModelValue,
  type: 'meeting' as CalendarEventType,
  location: '',
})
let drawerTrigger: HTMLElement | null = null
function focusDrawerTrigger() {
  drawerTrigger?.focus()
}
function openDrawer() {
  drawerTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  submitError.value = ''
  form.value = {
    title: '',
    date: selectedDate.value,
    start: '10:00',
    end: '11:00',
    type: 'meeting',
    location: '',
  }
  drawerOpen.value = true
}
function toDateStr(value: DatePickerModelValue): string {
  const single = Array.isArray(value) ? value[0] : value
  if (!single) return ''
  const date = single instanceof Date ? single : new Date(`${single}T00:00:00`)
  return Number.isFinite(date.getTime()) ? formatCalendarDate(date) : ''
}
function asTime(value: TimePickerModelValue): string {
  const single = Array.isArray(value) ? value[0] : value
  return typeof single === 'string' ? single : ''
}

async function loadEvents() {
  eventsRequest?.abort()
  const controller = new AbortController()
  eventsRequest = controller
  loading.value = true
  loadError.value = ''
  events.value = []
  try {
    const range = calendarQueryRange(selectedDate.value)
    const payload = await fetchCalendarEvents(range.from, range.to, controller.signal)
    if (!controller.signal.aborted) events.value = payload.data ?? []
  } catch (error: unknown) {
    if (!controller.signal.aborted) loadError.value = readErrorMessage(error, '日程加载失败')
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

async function submitEvent() {
  if (submitting.value) return
  const title = form.value.title.trim()
  const date = toDateStr(form.value.date)
  const start = asTime(form.value.start)
  const end = asTime(form.value.end)
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
  const invalidField = !title || title.length > 120 ? 'title' : !date ? 'date'
    : !timePattern.test(start) ? 'start' : !timePattern.test(end) || end <= start ? 'end'
    : form.value.location.trim().length > 200 ? 'location' : ''
  if (invalidField) {
    submitError.value = invalidField === 'title' ? '请填写 1–120 字的日程标题' : invalidField === 'date' ? '请选择有效日期'
      : invalidField === 'location' ? '地点长度不能超过 200' : '请填写有效时间，结束时间必须晚于开始时间（同一天）'
    formRef.value?.querySelector<HTMLElement>(`[data-field="${invalidField}"] input`)?.focus()
    return
  }
  submitError.value = ''
  submitting.value = true
  try {
    await createCalendarEvent({ date, start, end, title, type: form.value.type, location: form.value.location.trim() || '—' })
    selectedDate.value = new Date(`${date}T00:00:00`)
    drawerOpen.value = false
    reloadVersion.value += 1
    clockNow.value = Date.now()
    Message.success({ content: `日程「${title}」已创建`, duration: 2400 })
  } catch (error: unknown) {
    submitError.value = readErrorMessage(error, '创建日程失败，请重试')
  } finally {
    submitting.value = false
  }
}
function closeDrawer() { if (!submitting.value) drawerOpen.value = false }
watch([() => `${selectedDate.value.getFullYear()}-${selectedDate.value.getMonth()}`, reloadVersion], () => void loadEvents(), { immediate: true })
onBeforeUnmount(() => eventsRequest?.abort())
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="calendar"
      title="团队日历"
      subtitle="查看团队日程、倒计时下一场会议，并快速新建事件"
      :tags="[
        { label: '协作', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
      ]"
    />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <template v-if="nextEvent && countdownTarget">
          <Countdown
            :value="countdownTarget"
            format="DD 天 HH:mm:ss"
            :title="`距离「${nextEvent.title}」`"
            size="lg"
            @finish="handleCountdownFinish"
          />
          <Text size="sm" color="secondary" class="mt-1 block">
            {{ nextEvent.date }} {{ nextEvent.start }} · {{ TYPE_META[nextEvent.type].label }}
          </Text>
        </template>
        <Statistic v-else :title="loading ? '正在加载日程…' : loadError ? '日程加载失败' : '暂无即将到来的日程'" value="—" />
      </Card>
      <Card><Statistic title="今日日程" :value="loading || loadError ? '—' : todayCount" suffix="项" /></Card>
      <Card><Statistic title="所选月日程" :value="loading || loadError ? '—' : monthCount" suffix="项" /></Card>
    </div>

    <MutedPanel compact :description="`共享日程按填写的日期与时间展示，不自动换算时区；倒计时按本机时区 ${timeZone} 计算。`" />
    <Text v-if="targetError" tag="p" role="alert" color="danger">{{ targetError }}</Text>
    <div v-if="loadError" role="alert" class="flex flex-wrap items-center gap-3"><Text color="danger">{{ loadError }}</Text><Button variant="outline" @click="loadEvents">重试日程</Button></div>
    <div class="flex items-center justify-end">
      <Button @click="openDrawer">
        <Icon name="plus" :size="16" class="mr-1" />
        新建事件
      </Button>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card class="lg:col-span-2">
        <template #header><Text weight="bold">日历</Text></template>
        <Calendar
          :model-value="selectedDate"
          mode="month"
          :fullscreen="true"
          :events="cellEvents"
          @update:model-value="onDateChange"
          @panel-change="onDateChange"
        >
          <template #dateCell="{ extra }">
            <span
              v-if="extra.events.length"
              :class="[calendarDateCellExtraClasses, 'flex-col']"
              aria-hidden="true"
            >
              <span :class="calendarDateCellExtraClasses">
                <span
                  v-for="(event, index) in extra.events.slice(0, 3)"
                  :key="event.key ?? `${extra.iso}-${index}`"
                  :class="calendarDateCellDotClasses"
                  :style="getCalendarEventDotStyle(event.color)"
                />
              </span>
              <span class="text-[10px] leading-none">{{ extra.events.length }}</span>
            </span>
          </template>
        </Calendar>
        <MutedPanel
          compact
          class="mt-3"
          description="格子内的色点和数量表示当天事件；点击日期查看日程详情。"
        />
      </Card>

      <div class="space-y-6">
        <Card>
          <template #header>
            <div class="flex items-center gap-2">
              <Text weight="bold">{{ selectedKey }} 日程</Text>
              <Badge :content="eventsForSelected.length" variant="primary" standalone />
            </div>
          </template>

          <MutedPanel v-if="loadError" compact description="日程尚未加载，请重试。" />
          <MutedPanel v-else-if="loading" compact description="正在加载日程…" />
          <div v-else-if="eventsForSelected.length" class="space-y-2">
            <Popover
              v-for="e in eventsForSelected"
              :key="e.id"
              :open="activeEventId === e.id"
              @update:open="(open) => { activeEventId = open ? e.id : null }"
              trigger="click"
              placement="left"
              :width="260"
            >
              <template #trigger>
                <button type="button" :data-calendar-event="e.id"
                  class="flex w-full items-center gap-3 rounded-lg border border-(--tiger-border,#e5e7eb) p-3 text-left transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)"
                >
                  <Badge type="dot" :variant="TYPE_META[e.type].variant" />
                  <div class="min-w-0 flex-1">
                    <Text weight="medium" class="truncate block">{{ e.title }}</Text>
                    <Text size="sm" color="secondary">{{ e.start }}–{{ e.end }}</Text>
                  </div>
                  <Tag :variant="TYPE_META[e.type].variant" size="sm">
                    {{ TYPE_META[e.type].label }}
                  </Tag>
                </button>
              </template>
              <template #content>
                <div class="space-y-1 p-3 text-sm">
                  <Text weight="bold" class="block">{{ e.title }}</Text>
                  <div>时间：{{ e.date }} {{ e.start }}–{{ e.end }}</div>
                  <div>类型：{{ TYPE_META[e.type].label }}</div>
                  <div>地点：{{ e.location }}</div>
                </div>
              </template>
            </Popover>
          </div>
          <MutedPanel v-else compact description="当天暂无日程，点击“新建事件”添加一条。" />
        </Card>

        <Card>
          <template #header><Text weight="bold">即将到来</Text></template>
          <MutedPanel v-if="loadError || loading" compact :description="loading ? '正在加载日程…' : '日程尚未加载，请重试。'" />
          <List v-else-if="upcomingList.length" :data-source="upcomingList" />
          <MutedPanel v-else compact description="近期没有更多日程安排。" />
        </Card>
      </div>
    </div>

    <!-- 新建事件 -->
    <Drawer
      placement="right"
      :open="drawerOpen"
      title="新建事件"
      width="420px"
      :mask="true"
      :mask-closable="!submitting"
      :keyboard="!submitting"
      :closable="!submitting"
      initial-focus="#calendar-title"
      @update:open="(open) => { if (!open) closeDrawer() }"
      @close="closeDrawer"
      @after-close="focusDrawerTrigger"
    >
      <form ref="formRef" class="space-y-4" @submit.prevent="submitEvent">
        <div v-if="submitError" role="alert"><Text color="danger">{{ submitError }}</Text></div>
        <div data-field="title">
          <Text weight="medium" class="mb-1 block">标题</Text>
          <Input id="calendar-title" aria-label="日程标题" :max-length="120" v-model="form.title" placeholder="例如：迭代评审会" />
        </div>
        <div data-field="date">
          <Text weight="medium" class="mb-1 block">日期</Text>
          <DatePicker v-model="form.date" placeholder="选择日期" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div data-field="start">
            <Text weight="medium" class="mb-1 block">开始</Text>
            <TimePicker v-model="form.start" :show-seconds="false" />
          </div>
          <div data-field="end">
            <Text weight="medium" class="mb-1 block">结束</Text>
            <TimePicker v-model="form.end" :show-seconds="false" />
          </div>
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">类型</Text>
          <RadioGroup v-model="form.type">
            <Radio value="meeting">会议</Radio>
            <Radio value="review">评审</Radio>
            <Radio value="release">发布</Radio>
            <Radio value="reminder">提醒</Radio>
          </RadioGroup>
        </div>
        <div data-field="location">
          <Text weight="medium" class="mb-1 block">地点</Text>
          <Input aria-label="地点" :max-length="200" v-model="form.location" placeholder="会议室 / 线上链接（选填）" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" :disabled="submitting" @click="closeDrawer">取消</Button>
          <Button type="submit" :disabled="submitting">创建事件</Button>
        </div>
      </form>
    </Drawer>
  </div>
</template>
