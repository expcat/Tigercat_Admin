<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card, Text, Tag, Button, Message } from '@expcat/tigercat-vue'
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
import { Input } from '@expcat/tigercat-vue'
import type {
  ListItem,
  DatePickerSingleModelValue,
  TimePickerSingleValue,
} from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'
import Icon from '../components/Icon.vue'

type EventType = 'meeting' | 'review' | 'release' | 'reminder'
interface TeamEvent {
  id: string
  date: string // YYYY-MM-DD
  start: string // HH:mm
  end: string // HH:mm
  title: string
  type: EventType
  location: string
}

const TYPE_META: Record<EventType, { label: string; variant: 'primary' | 'warning' | 'danger' | 'info' }> = {
  meeting: { label: '会议', variant: 'primary' },
  review: { label: '评审', variant: 'warning' },
  release: { label: '发布', variant: 'danger' },
  reminder: { label: '提醒', variant: 'info' },
}

const pad = (n: number) => String(n).padStart(2, '0')
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

let seq = 0
const nextId = () => `ev-${Date.now()}-${seq++}`

const events = ref<TeamEvent[]>([
  { id: 'e1', date: '2026-06-29', start: '10:00', end: '11:00', title: '迭代站会', type: 'meeting', location: '线上 · 腾讯会议' },
  { id: 'e2', date: '2026-06-29', start: '14:30', end: '15:30', title: '组件库设计评审', type: 'review', location: '会议室 A' },
  { id: 'e3', date: '2026-06-30', start: '16:00', end: '17:00', title: 'v1.6 发布窗口', type: 'release', location: '生产环境' },
  { id: 'e4', date: '2026-07-01', start: '09:30', end: '10:00', title: '季度 OKR 对齐', type: 'meeting', location: '会议室 B' },
  { id: 'e5', date: '2026-07-02', start: '15:00', end: '15:30', title: '安全合规提醒', type: 'reminder', location: '—' },
])

const selectedDate = ref<Date>(new Date('2026-06-29T00:00:00'))
function onDateChange(value: unknown) {
  if (value instanceof Date) selectedDate.value = value
}

const selectedKey = computed(() => fmtDate(selectedDate.value))
const eventsForSelected = computed(() =>
  events.value
    .filter((e) => e.date === selectedKey.value)
    .sort((a, b) => a.start.localeCompare(b.start)),
)

const todayCount = computed(() => events.value.filter((e) => e.date === fmtDate(new Date())).length)
const monthCount = computed(() => {
  const ym = selectedKey.value.slice(0, 7)
  return events.value.filter((e) => e.date.startsWith(ym)).length
})

// ── 倒计时：下一个即将到来的日程 ───────────────────
const upcoming = computed(() =>
  events.value
    .map((e) => ({ ...e, ts: new Date(`${e.date}T${e.start}:00`).getTime() }))
    .sort((a, b) => a.ts - b.ts),
)
const nextEvent = computed(() => upcoming.value.find((e) => e.ts > Date.now()) ?? null)
const countdownTarget = computed(() =>
  nextEvent.value ? new Date(nextEvent.value.ts) : new Date(Date.now() + 45 * 60 * 1000),
)
function handleCountdownFinish() {
  Message.info({ content: '有一个日程已到开始时间（演示）', duration: 2600 })
}

const upcomingList = computed<ListItem[]>(() =>
  upcoming.value
    .filter((e) => e.ts > Date.now())
    .slice(0, 5)
    .map((e) => ({
      key: e.id,
      title: `${e.date} ${e.start} · ${e.title}`,
      description: `${TYPE_META[e.type].label} · ${e.location}`,
    })),
)

// ── 新建事件 ───────────────────────────────────────
const drawerOpen = ref(false)
const form = ref({
  title: '',
  date: new Date('2026-06-29T00:00:00') as DatePickerSingleModelValue,
  start: '10:00' as TimePickerSingleValue,
  end: '11:00' as TimePickerSingleValue,
  type: 'meeting' as EventType,
  location: '',
})
function openDrawer() {
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
function toDateStr(value: DatePickerSingleModelValue): string {
  if (!value) return selectedKey.value
  return fmtDate(value instanceof Date ? value : new Date(value))
}
function asTime(value: TimePickerSingleValue, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback
}
function submitEvent() {
  const title = form.value.title.trim()
  if (!title) {
    Message.warning({ content: '请填写日程标题', duration: 2000 })
    return
  }
  const date = toDateStr(form.value.date)
  const event: TeamEvent = {
    id: nextId(),
    date,
    start: asTime(form.value.start, '10:00'),
    end: asTime(form.value.end, '11:00'),
    title,
    type: form.value.type,
    location: form.value.location.trim() || '—',
  }
  events.value = [...events.value, event]
  selectedDate.value = new Date(`${date}T00:00:00`)
  drawerOpen.value = false
  Message.success({ content: `日程「${title}」已创建（演示）`, duration: 2400 })
}
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
        <Countdown
          :value="countdownTarget"
          format="DD 天 HH:mm:ss"
          :title="nextEvent ? `距离「${nextEvent.title}」` : '暂无即将到来的日程'"
          size="lg"
          @finish="handleCountdownFinish"
        />
        <Text v-if="nextEvent" size="sm" color="secondary" class="mt-1 block">
          {{ nextEvent.date }} {{ nextEvent.start }} · {{ TYPE_META[nextEvent.type].label }}
        </Text>
      </Card>
      <Card><Statistic title="今日日程" :value="todayCount" suffix="项" /></Card>
      <Card><Statistic title="本月日程" :value="monthCount" suffix="项" /></Card>
    </div>

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
          @update:model-value="onDateChange"
          @change="onDateChange"
        />
        <MutedPanel
          compact
          class="mt-3"
          description="点击日期查看当天日程；事件按类型在右侧列表中以标记区分（演示数据）。"
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

          <div v-if="eventsForSelected.length" class="space-y-2">
            <Popover
              v-for="e in eventsForSelected"
              :key="e.id"
              trigger="hover"
              placement="left"
              :width="260"
            >
              <template #trigger>
                <div
                  class="flex items-center gap-3 rounded-lg border border-(--tiger-border,#e5e7eb) p-3 transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)"
                >
                  <Badge type="dot" :variant="TYPE_META[e.type].variant" />
                  <div class="min-w-0 flex-1">
                    <Text weight="medium" class="truncate block">{{ e.title }}</Text>
                    <Text size="sm" color="secondary">{{ e.start }}–{{ e.end }}</Text>
                  </div>
                  <Tag :variant="TYPE_META[e.type].variant" size="sm">
                    {{ TYPE_META[e.type].label }}
                  </Tag>
                </div>
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
          <List v-if="upcomingList.length" :data-source="upcomingList" />
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
      :mask-closable="true"
      @update:open="(v: boolean) => (drawerOpen = v)"
      @close="drawerOpen = false"
    >
      <div class="space-y-4">
        <div>
          <Text weight="medium" class="mb-1 block">标题</Text>
          <Input v-model="form.title" placeholder="例如：迭代评审会" />
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">日期</Text>
          <DatePicker v-model="form.date" placeholder="选择日期" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <Text weight="medium" class="mb-1 block">开始</Text>
            <TimePicker v-model="form.start" :show-seconds="false" />
          </div>
          <div>
            <Text weight="medium" class="mb-1 block">结束</Text>
            <TimePicker v-model="form.end" :show-seconds="false" />
          </div>
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">类型</Text>
          <RadioGroup v-model:value="form.type">
            <Radio value="meeting">会议</Radio>
            <Radio value="review">评审</Radio>
            <Radio value="release">发布</Radio>
            <Radio value="reminder">提醒</Radio>
          </RadioGroup>
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">地点</Text>
          <Input v-model="form.location" placeholder="会议室 / 线上链接（选填）" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="drawerOpen = false">取消</Button>
          <Button @click="submitEvent">创建事件</Button>
        </div>
      </div>
    </Drawer>
  </div>
</template>
