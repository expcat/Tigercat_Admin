<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { Card, Text, Tag, Button, Input, Message } from '@expcat/tigercat-vue'
import { Splitter } from '@expcat/tigercat-vue/Splitter'
import { Resizable } from '@expcat/tigercat-vue/Resizable'
import { Steps, StepsItem } from '@expcat/tigercat-vue/Steps'
import { ChatWindow } from '@expcat/tigercat-vue/ChatWindow'
import { CommentThread } from '@expcat/tigercat-vue/CommentThread'
import { Mentions } from '@expcat/tigercat-vue/Mentions'
import { Descriptions } from '@expcat/tigercat-vue/Descriptions'
import { Rate } from '@expcat/tigercat-vue/Rate'
import { Badge } from '@expcat/tigercat-vue/Badge'
import { Drawer } from '@expcat/tigercat-vue/Drawer'
import { Upload } from '@expcat/tigercat-vue/Upload'
import { Popover } from '@expcat/tigercat-vue/Popover'
import { Textarea } from '@expcat/tigercat-vue/Textarea'
import { RadioGroup } from '@expcat/tigercat-vue/RadioGroup'
import { Radio } from '@expcat/tigercat-vue/Radio'
import { Divider } from '@expcat/tigercat-vue/Divider'
import type {
  ChatMessage,
  CommentNode,
  MentionOption,
  UploadFile,
  DescriptionsItem,
} from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'
import Icon from '../components/Icon.vue'

type TicketStatus = 'open' | 'accepted' | 'progress' | 'resolved' | 'closed'
type TicketPriority = 'high' | 'medium' | 'low'

interface Ticket {
  id: string
  title: string
  requester: string
  category: string
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  updatedAt: string
  satisfaction: number
  description: string
  messages: ChatMessage[]
  notes: CommentNode[]
}

// ── 生命周期与状态映射 ─────────────────────────────
const LIFECYCLE = ['已创建', '已受理', '处理中', '已解决', '已关闭']
const STATUS_META: Record<
  TicketStatus,
  { label: string; variant: 'warning' | 'info' | 'primary' | 'success' | 'default'; step: number }
> = {
  open: { label: '待受理', variant: 'warning', step: 0 },
  accepted: { label: '已受理', variant: 'info', step: 1 },
  progress: { label: '处理中', variant: 'primary', step: 2 },
  resolved: { label: '已解决', variant: 'success', step: 3 },
  closed: { label: '已关闭', variant: 'default', step: 4 },
}
const PRIORITY_META: Record<
  TicketPriority,
  { label: string; variant: 'danger' | 'warning' | 'info' }
> = {
  high: { label: '高', variant: 'danger' },
  medium: { label: '中', variant: 'warning' },
  low: { label: '低', variant: 'info' },
}

const assignees: MentionOption[] = [
  { value: '王小虎', label: '王小虎 · 前端' },
  { value: '李工', label: '李工 · 后端' },
  { value: '张运维', label: '张运维 · 运维' },
  { value: '陈测试', label: '陈测试 · 测试' },
]

let seq = 0
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`

// ── 工单数据（页面内内存数据）────────────────────────
const tickets = ref<Ticket[]>([
  {
    id: 'TK-2048',
    title: '导出报表时偶发 500 错误',
    requester: '赵敏',
    category: '缺陷',
    priority: 'high',
    status: 'progress',
    createdAt: '2026-06-28 10:24',
    updatedAt: '2026-06-29 09:02',
    satisfaction: 0,
    description: '在数据分析页导出近 90 天报表时，约 1/5 概率返回 500，刷新后可恢复。',
    messages: [
      { id: 'm1', content: '你好，导出报表偶尔会失败，麻烦看下。', direction: 'other', time: '2026-06-28 10:24' },
      { id: 'm2', content: '已收到，正在排查导出服务的超时配置。', direction: 'self', time: '2026-06-28 11:10' },
    ],
    notes: [
      {
        id: 'n1',
        content: '初步定位为导出队列在高峰期超时，已 @张运维 调整 worker 并发。',
        user: { name: '李工' },
        time: '2026-06-28 14:30',
      },
    ],
  },
  {
    id: 'TK-2050',
    title: '希望支持按部门筛选用户',
    requester: '孙莉',
    category: '需求',
    priority: 'medium',
    status: 'accepted',
    createdAt: '2026-06-27 16:40',
    updatedAt: '2026-06-28 09:15',
    satisfaction: 0,
    description: '用户管理列表希望增加“部门”筛选项，便于按团队管理成员。',
    messages: [
      { id: 'm1', content: '能否在用户列表加一个部门筛选？', direction: 'other', time: '2026-06-27 16:40' },
    ],
    notes: [],
  },
  {
    id: 'TK-2041',
    title: '登录后偶尔跳回登录页',
    requester: '周杰',
    category: '缺陷',
    priority: 'high',
    status: 'resolved',
    createdAt: '2026-06-25 08:12',
    updatedAt: '2026-06-26 17:50',
    satisfaction: 4,
    description: '部分用户登录成功后数秒内被登出，疑似 token 续期问题。',
    messages: [
      { id: 'm1', content: '登录后过一会就被踢出来了。', direction: 'other', time: '2026-06-25 08:12' },
      { id: 'm2', content: '已修复 token 续期逻辑，请再试试。', direction: 'self', time: '2026-06-26 17:50' },
      { id: 'm3', content: '可以了，谢谢！', direction: 'other', time: '2026-06-26 18:05' },
    ],
    notes: [
      {
        id: 'n1',
        content: '根因：刷新接口未带上最新 token，已修复并补充回归用例。',
        user: { name: '王小虎' },
        time: '2026-06-26 17:40',
      },
    ],
  },
  {
    id: 'TK-2033',
    title: '通知中心希望支持批量已读',
    requester: '吴芳',
    category: '需求',
    priority: 'low',
    status: 'closed',
    createdAt: '2026-06-20 13:00',
    updatedAt: '2026-06-22 10:20',
    satisfaction: 5,
    description: '通知较多时希望一键全部标记为已读。',
    messages: [
      { id: 'm1', content: '通知太多了，能不能一键已读？', direction: 'other', time: '2026-06-20 13:00' },
      { id: 'm2', content: '已上线“全部已读”按钮，欢迎体验。', direction: 'self', time: '2026-06-22 10:20' },
    ],
    notes: [],
  },
])

// ── 列表筛选与选中 ─────────────────────────────────
const keyword = ref('')
const statusFilter = ref<'all' | TicketStatus>('all')
const statusFilters: { value: 'all' | TicketStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '待受理' },
  { value: 'progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
]

const filteredTickets = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return tickets.value.filter((t) => {
    const matchStatus = statusFilter.value === 'all' || t.status === statusFilter.value
    const matchKw = !kw || `${t.title} ${t.requester} ${t.id}`.toLowerCase().includes(kw)
    return matchStatus && matchKw
  })
})

const selectedId = ref<string | null>(tickets.value[0]?.id ?? null)
const selected = computed(() => tickets.value.find((t) => t.id === selectedId.value) ?? null)

function selectTicket(id: string) {
  selectedId.value = id
}

const selectedDescriptions = computed<DescriptionsItem[]>(() => {
  const t = selected.value
  if (!t) return []
  return [
    { label: '工单号', content: t.id },
    { label: '提交人', content: t.requester },
    { label: '分类', content: t.category },
    { label: '优先级', content: PRIORITY_META[t.priority].label },
    { label: '创建时间', content: t.createdAt },
    { label: '更新时间', content: t.updatedAt },
  ]
})

// ── 对话 ──────────────────────────────────────────
const draft = ref('')
function handleSend(value: string) {
  const t = selected.value
  const text = value.trim()
  if (!t || !text) return
  t.messages = [
    ...t.messages,
    { id: nextId('m'), content: text, direction: 'self', time: nowLabel() },
  ]
  draft.value = ''
  window.setTimeout(() => {
    t.messages = [
      ...t.messages,
      {
        id: nextId('m'),
        content: '收到，我们会尽快跟进本工单（演示自动回复）。',
        direction: 'other',
        time: nowLabel(),
      },
    ]
  }, 700)
}

// ── 内部备注（@指派人）─────────────────────────────
const noteDraft = ref('')
function handleAddNote() {
  const t = selected.value
  const text = noteDraft.value.trim()
  if (!t || !text) return
  t.notes = [
    ...t.notes,
    { id: nextId('n'), content: text, user: { name: '我' }, time: nowLabel() },
  ]
  noteDraft.value = ''
  Message.success({ content: '已添加内部备注（演示）', duration: 2000 })
}

// ── 关闭工单 ───────────────────────────────────────
const confirmingClose = ref(false)
function requestClose() {
  confirmingClose.value = true
}
function confirmClose() {
  const t = selected.value
  if (t) {
    t.status = 'closed'
    t.updatedAt = nowLabel()
  }
  confirmingClose.value = false
  Message.success({ content: '工单已关闭（演示）', duration: 2000 })
}

// ── 新建工单 ───────────────────────────────────────
const drawerOpen = ref(false)
const form = ref({ title: '', category: '缺陷', priority: 'medium' as TicketPriority, description: '' })
const formFiles = ref<UploadFile[]>([])
function openDrawer() {
  form.value = { title: '', category: '缺陷', priority: 'medium', description: '' }
  formFiles.value = []
  drawerOpen.value = true
}
function submitTicket() {
  const title = form.value.title.trim()
  if (!title) {
    Message.warning({ content: '请填写工单标题', duration: 2000 })
    return
  }
  const id = `TK-${2050 + tickets.value.length + 1}`
  const ticket: Ticket = {
    id,
    title,
    requester: '我',
    category: form.value.category,
    priority: form.value.priority,
    status: 'open',
    createdAt: nowLabel(),
    updatedAt: nowLabel(),
    satisfaction: 0,
    description: form.value.description.trim() || '（无描述）',
    messages: [],
    notes: [],
  }
  tickets.value = [ticket, ...tickets.value]
  selectedId.value = id
  statusFilter.value = 'all'
  drawerOpen.value = false
  Message.success({ content: `工单 ${id} 已创建（演示）`, duration: 2400 })
}

function nowLabel() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── 响应式：宽屏左右分栏，窄屏上下分栏 ──────────────
const isWide = ref(true)
let mql: MediaQueryList | null = null
const syncWide = () => {
  isWide.value = mql ? mql.matches : true
}
onMounted(() => {
  mql = window.matchMedia('(min-width: 1024px)')
  syncWide()
  mql.addEventListener('change', syncWide)
})
onBeforeUnmount(() => {
  mql?.removeEventListener('change', syncWide)
})
const splitDirection = computed(() => (isWide.value ? 'horizontal' : 'vertical'))
const splitStyle = computed(() => ({ height: isWide.value ? '640px' : '900px' }))

const openCount = computed(
  () => tickets.value.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length,
)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="ticket"
      title="工单中心"
      subtitle="左右主从布局，跟进工单生命周期、对话与内部协作"
      :tags="[
        { label: '协作', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
      ]"
    />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Text weight="bold">工单列表</Text>
        <Badge :content="openCount" variant="primary" standalone />
        <Text size="sm" color="secondary">个待跟进</Text>
      </div>
      <Button @click="openDrawer">
        <Icon name="plus" :size="16" class="mr-1" />
        新建工单
      </Button>
    </div>

    <Card class="overflow-hidden">
      <Splitter
        :direction="splitDirection"
        :min="220"
        :gutter-size="8"
        :style="splitStyle"
      >
        <!-- 左：列表 -->
        <div class="flex h-full flex-col gap-3 overflow-hidden pr-1">
          <Input v-model="keyword" placeholder="搜索标题 / 提交人 / 工单号" clearable />
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in statusFilters"
              :key="f.value"
              type="button"
              class="p2-filter-chip rounded-full px-3 py-1 text-xs transition-colors"
              :class="
                statusFilter === f.value
                  ? 'bg-(--tiger-primary,#3b82f6) text-white'
                  : 'bg-(--tiger-bg-hover,#f1f5f9) text-(--tiger-text-secondary,#64748b)'
              "
              @click="statusFilter = f.value"
            >
              {{ f.label }}
            </button>
          </div>

          <div class="flex-1 space-y-2 overflow-y-auto">
            <button
              v-for="t in filteredTickets"
              :key="t.id"
              type="button"
              class="w-full rounded-lg border p-3 text-left transition-colors"
              :class="
                t.id === selectedId
                  ? 'border-(--tiger-primary,#3b82f6) bg-(--tiger-primary,#3b82f6)/5'
                  : 'border-(--tiger-border,#e5e7eb) hover:bg-(--tiger-bg-hover,#f1f5f9)'
              "
              @click="selectTicket(t.id)"
            >
              <div class="flex items-center justify-between gap-2">
                <Text weight="medium" class="truncate">{{ t.title }}</Text>
                <Tag :variant="PRIORITY_META[t.priority].variant" size="sm">
                  {{ PRIORITY_META[t.priority].label }}
                </Tag>
              </div>
              <div class="mt-2 flex items-center justify-between gap-2">
                <Text size="sm" color="secondary" class="truncate">
                  {{ t.id }} · {{ t.requester }}
                </Text>
                <Tag :variant="STATUS_META[t.status].variant" size="sm">
                  {{ STATUS_META[t.status].label }}
                </Tag>
              </div>
            </button>

            <MutedPanel
              v-if="filteredTickets.length === 0"
              compact
              description="没有符合条件的工单，试试调整筛选或搜索关键词。"
            />
          </div>
        </div>

        <!-- 右：详情 -->
        <div class="flex h-full flex-col overflow-y-auto pl-1">
          <template v-if="selected">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <Text size="lg" weight="bold">{{ selected.title }}</Text>
                <Tag :variant="STATUS_META[selected.status].variant" size="sm">
                  {{ STATUS_META[selected.status].label }}
                </Tag>
              </div>
              <Button
                variant="outline"
                size="sm"
                :disabled="selected.status === 'closed'"
                @click="requestClose"
              >
                关闭工单
              </Button>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card>
                <template #header><Text weight="bold">工单信息</Text></template>
                <Descriptions :items="selectedDescriptions" :column="1" bordered colon />
                <div class="mt-3 flex items-center gap-2">
                  <Text size="sm" color="secondary">满意度</Text>
                  <Rate :model-value="selected.satisfaction" disabled allow-half />
                  <Popover trigger="hover" placement="top" :width="240">
                    <template #trigger>
                      <span
                        class="inline-flex h-5 w-5 items-center justify-center rounded-full text-(--tiger-text-secondary,#64748b)"
                      >
                        <Icon name="help" :size="14" />
                      </span>
                    </template>
                    <template #content>
                      <div class="p-3 text-sm">满意度为提交人对本次服务的评分（演示数据）。</div>
                    </template>
                  </Popover>
                </div>
              </Card>

              <Card>
                <template #header><Text weight="bold">工单生命周期</Text></template>
                <Steps :current="STATUS_META[selected.status].step" direction="vertical" size="small">
                  <StepsItem
                    v-for="(label, idx) in LIFECYCLE"
                    :key="label"
                    :title="label"
                    :description="idx === STATUS_META[selected.status].step ? '当前阶段' : ''"
                  />
                </Steps>
              </Card>
            </div>

            <Card class="mt-4">
              <template #header><Text weight="bold">对话</Text></template>
              <Resizable
                axis="vertical"
                :handles="['bottom']"
                :default-height="300"
                :min-height="200"
                :max-height="460"
                :style="{ width: '100%' }"
              >
                <ChatWindow
                  v-model="draft"
                  :messages="selected.messages"
                  class="h-full"
                  placeholder="回复提交人，回车发送"
                  send-text="发送"
                  empty-text="暂无对话，开始回复吧"
                  status-text="工单进行中"
                  status-variant="primary"
                  :show-avatar="false"
                  :show-name="false"
                  @send="handleSend"
                />
              </Resizable>
            </Card>

            <Card class="mt-4">
              <template #header><Text weight="bold">内部备注</Text></template>
              <CommentThread
                v-if="selected.notes.length"
                :nodes="selected.notes"
                :show-reply="false"
                :show-like="false"
                :show-more="false"
                empty-text="暂无内部备注"
              />
              <MutedPanel v-else compact description="还没有内部备注，可在下方 @ 同事记录处理进展。" />
              <Divider spacing="sm" />
              <Mentions
                v-model="noteDraft"
                :options="assignees"
                :rows="2"
                placeholder="输入内部备注，使用 @ 指派同事"
              />
              <div class="mt-2 flex justify-end">
                <Button size="sm" :disabled="!noteDraft.trim()" @click="handleAddNote">
                  添加备注
                </Button>
              </div>
            </Card>
          </template>

          <div v-else class="flex h-full items-center justify-center">
            <MutedPanel description="请选择左侧工单查看详情、对话与内部协作。" />
          </div>
        </div>
      </Splitter>
    </Card>

    <!-- 新建工单 -->
    <Drawer
      placement="right"
      :open="drawerOpen"
      title="新建工单"
      width="420px"
      :mask="true"
      :mask-closable="true"
      @update:open="(v: boolean) => (drawerOpen = v)"
      @close="drawerOpen = false"
    >
      <div class="space-y-4">
        <div>
          <Text weight="medium" class="mb-1 block">标题</Text>
          <Input v-model="form.title" placeholder="简要描述问题或需求" />
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">分类</Text>
          <RadioGroup v-model:value="form.category">
            <Radio value="缺陷">缺陷</Radio>
            <Radio value="需求">需求</Radio>
            <Radio value="咨询">咨询</Radio>
          </RadioGroup>
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">优先级</Text>
          <RadioGroup v-model:value="form.priority">
            <Radio value="high">高</Radio>
            <Radio value="medium">中</Radio>
            <Radio value="low">低</Radio>
          </RadioGroup>
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">描述</Text>
          <Textarea v-model="form.description" :rows="4" placeholder="补充复现步骤或背景信息" />
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">附件</Text>
          <Upload v-model:file-list="formFiles" :auto-upload="false" :multiple="true" drag>
            <div class="p-4 text-center text-sm text-(--tiger-text-secondary,#64748b)">
              点击或拖拽文件到此处（演示，不会真正上传）
            </div>
          </Upload>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="drawerOpen = false">取消</Button>
          <Button @click="submitTicket">创建工单</Button>
        </div>
      </div>
    </Drawer>

    <!-- 关闭确认 -->
    <Drawer
      placement="right"
      :open="confirmingClose"
      title="确认关闭工单"
      width="360px"
      :mask="true"
      :mask-closable="true"
      @update:open="(v: boolean) => (confirmingClose = v)"
      @close="confirmingClose = false"
    >
      <div class="space-y-4">
        <MutedPanel description="关闭后工单将标记为“已关闭”，演示环境下可重新创建。" />
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="confirmingClose = false">取消</Button>
          <Button danger @click="confirmClose">确认关闭</Button>
        </div>
      </div>
    </Drawer>
  </div>
</template>
