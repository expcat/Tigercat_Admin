<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@expcat/tigercat-vue/Button'
import { Empty } from '@expcat/tigercat-vue/Empty'
import { Card } from '@expcat/tigercat-vue/Card'
import { Input } from '@expcat/tigercat-vue/Input'
import { Message } from '@expcat/tigercat-vue/Message'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Splitter } from '@expcat/tigercat-vue/Splitter'
import { Resizable } from '@expcat/tigercat-vue/Resizable'
import { Steps, StepsItem } from '@expcat/tigercat-vue/Steps'
import { ChatWindow } from '@expcat/tigercat-vue/ChatWindow'
import { CommentThread } from '@expcat/tigercat-vue/CommentThread'
import { Mentions } from '@expcat/tigercat-vue/Mentions'
import { Descriptions } from '@expcat/tigercat-vue/Descriptions'
import { Rate } from '@expcat/tigercat-vue/Rate'
import { Drawer } from '@expcat/tigercat-vue/Drawer'
import { Upload } from '@expcat/tigercat-vue/Upload'
import { Popover } from '@expcat/tigercat-vue/Popover'
import { Textarea } from '@expcat/tigercat-vue/Textarea'
import { RadioGroup } from '@expcat/tigercat-vue/RadioGroup'
import { Radio } from '@expcat/tigercat-vue/Radio'
import { Divider } from '@expcat/tigercat-vue/Divider'
import { WorkflowActionBar, WorkflowTimeline } from '@expcat/tigercat-vue/WorkflowTimeline'
import type {
  ChatMessage,
  CommentNode,
  MentionOption,
  UploadFile,
  DescriptionsItem,
  WorkflowActionBarItem,
} from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'
import Icon from '../components/Icon.vue'
import {
  createTicket,
  fetchTicket,
  fetchTickets,
  getTicketWorkflowSteps,
  nextTicketStatusForWorkflow,
  sendTicketMessage,
  TICKET_WORKFLOW_ACTIONS,
  updateTicket,
} from '../utils/tickets'
import { createComment, fetchComments } from '../utils/comments'
import { fetchRelatedApproval } from '../utils/approvals'
import type { CommentItem, Ticket, TicketPriority, TicketStatus } from '../utils/types'

interface TicketView extends Ticket {
  notes: CommentNode[]
}

const toCommentNodes = (items: CommentItem[]): CommentNode[] => items as CommentNode[]

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

const toTicketView = (ticket: Ticket, notes: CommentNode[] = []): TicketView => ({
  ...ticket,
  messages: ticket.messages ?? [],
  notes,
})

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

// ── 工单数据（Api / MockApi）────────────────────────
const tickets = ref<TicketView[]>([])
const loading = ref(false)
const detailLoading = ref(false)

const keyword = ref('')
const statusFilter = ref<'all' | TicketStatus>('all')
const statusFilters: { value: 'all' | TicketStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '待受理' },
  { value: 'progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
]

const filteredTickets = computed(() => tickets.value)

const route = useRoute()
const router = useRouter()
const requestedTicketId = computed(() => {
  const raw = route.query.ticket
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ? String(value) : ''
})
const selectedId = ref<string | null>(null)
const selected = computed(() => tickets.value.find((t) => t.id === selectedId.value) ?? null)
const relatedApprovalId = ref<string | null>(null)
const hasActiveTicketFilters = computed(
  () => Boolean(keyword.value.trim()) || statusFilter.value !== 'all',
)

function clearTicketFilters() {
  keyword.value = ''
  statusFilter.value = 'all'
}

watch(
  selectedId,
  async (id) => {
    relatedApprovalId.value = null
    if (!id) return
    const related = await fetchRelatedApproval(id)
    if (selectedId.value === id) {
      relatedApprovalId.value = related?.id ?? null
    }
  },
  { immediate: true },
)

async function loadTicketDetail(id: string) {
  detailLoading.value = true
  try {
    const [ticketPayload, commentsPayload] = await Promise.all([
      fetchTicket(id),
      fetchComments('ticket', id),
    ])
    const notes = toCommentNodes(commentsPayload.data ?? [])
    tickets.value = tickets.value.map((item) =>
      item.id === id ? toTicketView(ticketPayload.data, notes) : item,
    )
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '工单详情加载失败'), duration: 3000 })
  } finally {
    detailLoading.value = false
  }
}

async function loadTickets() {
  loading.value = true
  try {
    const payload = await fetchTickets({
      page: 1,
      pageSize: 50,
      status: statusFilter.value,
      keyword: keyword.value,
    })
    const prevNotes = new Map(tickets.value.map((item) => [item.id, item.notes]))
    const items = (payload.data.items ?? []).map((item) =>
      toTicketView(item, prevNotes.get(item.id) ?? []),
    )
    tickets.value = items
    if (requestedTicketId.value && items.some((item) => item.id === requestedTicketId.value)) {
      selectedId.value = requestedTicketId.value
    } else if (!selectedId.value || !items.some((item) => item.id === selectedId.value)) {
      selectedId.value = items[0]?.id ?? null
    }
    if (selectedId.value) {
      await loadTicketDetail(selectedId.value)
    }
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '工单列表加载失败'), duration: 3000 })
  } finally {
    loading.value = false
  }
}

function selectTicket(id: string) {
  selectedId.value = id
  void loadTicketDetail(id)
}

watch([keyword, statusFilter], () => {
  void loadTickets()
})

const selectedDescriptions = computed<DescriptionsItem[]>(() => {
  const t = selected.value
  if (!t) return []
  return [
    { label: '工单号', content: t.id, labelClassName: 'whitespace-nowrap' },
    { label: '提交人', content: t.requester, labelClassName: 'whitespace-nowrap' },
    { label: '分类', content: t.category, labelClassName: 'whitespace-nowrap' },
    { label: '优先级', content: PRIORITY_META[t.priority].label, labelClassName: 'whitespace-nowrap' },
    { label: '创建时间', content: t.createdAt, labelClassName: 'whitespace-nowrap' },
    { label: '更新时间', content: t.updatedAt, labelClassName: 'whitespace-nowrap' },
  ]
})

const workflowSteps = computed(() => (selected.value ? getTicketWorkflowSteps(selected.value) : []))
const workflowActionsDisabled = computed(
  () => selected.value?.status === 'resolved' || selected.value?.status === 'closed',
)

async function handleWorkflowAction(item: WorkflowActionBarItem) {
  const t = selected.value
  if (!t) return
  try {
    if (item.action === 'transfer' || item.action === 'comment') {
      const text = item.action === 'transfer'
        ? '已转交（演示写回）。完整实例状态机见审批中心。'
        : '已添加评论（演示写回）。'
      const payload = await sendTicketMessage(t.id, text)
      tickets.value = tickets.value.map((row) =>
        row.id === t.id ? toTicketView(payload.data, row.notes) : row,
      )
      Message.success({
        content: item.action === 'transfer' ? '已写回工单对话（转交演示）' : '已写回工单对话（评论）',
        duration: 2200,
      })
      return
    }
    const nextStatus = nextTicketStatusForWorkflow(t.status, item.action)
    if (!nextStatus) {
      Message.info({ content: '当前工单状态不能再流转', duration: 2200 })
      return
    }
    const payload = await updateTicket(t.id, { status: nextStatus })
    tickets.value = tickets.value.map((item) =>
      item.id === t.id ? toTicketView(payload.data, item.notes) : item,
    )
    Message.success({ content: `已写回工单状态：${nextStatus}`, duration: 2200 })
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '审批动作写回失败'), duration: 3000 })
  }
}

// ── 对话 ──────────────────────────────────────────
const draft = ref('')
async function handleSend(value: string) {
  const t = selected.value
  const text = value.trim()
  if (!t || !text) return
  try {
    const payload = await sendTicketMessage(t.id, text)
    draft.value = ''
    tickets.value = tickets.value.map((item) =>
      item.id === t.id ? toTicketView(payload.data, item.notes) : item,
    )
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '发送工单消息失败'), duration: 3000 })
  }
}

// ── 内部备注（@指派人）─────────────────────────────
const noteDraft = ref('')
async function handleAddNote() {
  const t = selected.value
  const text = noteDraft.value.trim()
  if (!t || !text) return
  try {
    const payload = await createComment({ targetType: 'ticket', targetId: t.id, body: text })
    tickets.value = tickets.value.map((item) =>
      item.id === t.id ? { ...item, notes: [...item.notes, payload.data as CommentNode] } : item,
    )
    noteDraft.value = ''
    Message.success({ content: '已添加内部备注', duration: 2000 })
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '添加内部备注失败'), duration: 3000 })
  }
}

// ── 关闭工单 ───────────────────────────────────────
const confirmingClose = ref(false)
function requestClose() {
  captureDrawerTrigger()
  confirmingClose.value = true
}
async function confirmClose() {
  const t = selected.value
  if (!t) {
    confirmingClose.value = false
    return
  }
  try {
    const payload = await updateTicket(t.id, { status: 'closed' })
    tickets.value = tickets.value.map((item) =>
      item.id === t.id ? toTicketView(payload.data, item.notes) : item,
    )
    confirmingClose.value = false
    Message.success({ content: '工单已关闭', duration: 2000 })
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '关闭工单失败'), duration: 3000 })
  }
}

// ── 新建工单 ───────────────────────────────────────
const drawerOpen = ref(false)
const form = ref({ title: '', category: '缺陷', priority: 'medium' as TicketPriority, description: '' })
const formFiles = ref<UploadFile[]>([])
let drawerTrigger: HTMLElement | null = null
function captureDrawerTrigger() {
  drawerTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
}
function focusDrawerTrigger() {
  drawerTrigger?.focus()
}
function openDrawer() {
  captureDrawerTrigger()
  form.value = { title: '', category: '缺陷', priority: 'medium', description: '' }
  formFiles.value = []
  drawerOpen.value = true
}
async function submitTicket() {
  const title = form.value.title.trim()
  if (!title) {
    Message.warning({ content: '请填写工单标题', duration: 2000 })
    return
  }
  try {
    const payload = await createTicket({
      title,
      category: form.value.category,
      priority: form.value.priority,
      description: form.value.description.trim() || '（无描述）',
    })
    statusFilter.value = 'all'
    keyword.value = ''
    drawerOpen.value = false
    selectedId.value = payload.data.id
    await loadTickets()
    Message.success({ content: `工单 ${payload.data.id} 已创建`, duration: 2400 })
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '创建工单失败'), duration: 3000 })
  }
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
  void loadTickets()
})
onBeforeUnmount(() => {
  mql?.removeEventListener('change', syncWide)
})
const splitDirection = computed(() => (isWide.value ? 'horizontal' : 'vertical'))
const splitStyle = computed(() => ({ height: isWide.value ? '640px' : '900px' }))
/** ChatWindow fills this box; textarea resize would fight the Resizable bottom handle. */
const TICKET_CHAT_WINDOW_CLASS = 'h-full min-h-0 [&_textarea]:resize-none'

const openCount = computed(
  () => tickets.value.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length,
)

const CHAT_STATUS: Record<
  TicketStatus,
  { text: string; variant: 'warning' | 'info' | 'primary' | 'success' | 'default' }
> = {
  open: { text: '工单待受理', variant: 'warning' },
  accepted: { text: '工单已受理', variant: 'info' },
  progress: { text: '工单进行中', variant: 'primary' },
  resolved: { text: '工单已解决', variant: 'success' },
  closed: { text: '工单已关闭', variant: 'default' },
}

const chatStatus = computed(() =>
  selected.value ? CHAT_STATUS[selected.value.status] : CHAT_STATUS.progress,
)
</script>

<template>
  <div class="min-w-0 space-y-6">
    <PageHeader
      icon="ticket"
      title="工单中心"
      subtitle="跟进工单状态、对话和内部备注，并处理关联审批。"
      :tags="[
        { label: '协作', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
      ]"
    />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Text weight="bold">工单列表</Text>
        <Text weight="bold" class="tabular-nums text-[var(--tiger-primary,#2563eb)]">{{ openCount }}</Text>
        <Text size="sm" color="secondary">个待跟进</Text>
      </div>
      <Button @click="openDrawer">
        <Icon name="plus" :size="16" class="mr-1" />
        新建工单
      </Button>
    </div>

    <Card class="min-w-0 overflow-hidden">
      <Splitter
        :direction="splitDirection"
        :min="220"
        :gutter-size="8"
        :style="splitStyle"
      >
        <!-- 左：列表 -->
        <div class="flex h-full min-w-0 flex-col gap-3 overflow-hidden pr-1">
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
                <Text weight="medium" class="min-w-0 truncate">{{ t.title }}</Text>
                <Tag :variant="PRIORITY_META[t.priority].variant" size="sm" class="shrink-0">
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
              v-if="loading && filteredTickets.length === 0"
              compact
              description="正在加载工单…"
            />
            <Empty
              v-else-if="filteredTickets.length === 0"
              preset="no-results"
              description="没有符合条件的工单，试试调整筛选或搜索关键词。"
            >
              <template #extra>
                <Button
                  v-if="hasActiveTicketFilters"
                  size="sm"
                  variant="outline"
                  @click="clearTicketFilters"
                >
                  清除筛选
                </Button>
              </template>
            </Empty>
          </div>
        </div>

        <!-- 右：详情 -->
        <div class="flex h-full min-w-0 flex-col overflow-y-auto pl-1">
          <template v-if="selected">
            <div class="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <Text size="lg" weight="bold">{{ selected.title }}</Text>
                <Tag :variant="STATUS_META[selected.status].variant" size="sm">
                  {{ STATUS_META[selected.status].label }}
                </Tag>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <Button
                  v-if="relatedApprovalId"
                  variant="ghost"
                  size="sm"
                  @click="router.push(`/approvals/${encodeURIComponent(relatedApprovalId)}`)"
                >
                  打开审批 {{ relatedApprovalId }}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="selected.status === 'closed'"
                  @click="requestClose"
                >
                  关闭工单
                </Button>
              </div>
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

            <Card class="mt-4 min-w-0">
              <template #header><Text weight="bold">审批进度</Text></template>
              <div class="min-w-0 overflow-x-auto">
                <WorkflowTimeline :steps="workflowSteps" />
              </div>
              <div class="mt-3 min-w-0">
                <WorkflowActionBar
                  :items="TICKET_WORKFLOW_ACTIONS"
                  :disabled="workflowActionsDisabled"
                  aria-label="审批操作"
                  @action="handleWorkflowAction"
                />
              </div>
              <Text size="sm" color="secondary" class="mt-2 block">
                工单详情动作会写回工单状态；完整待办/已办/抄送实例见审批中心。
              </Text>
            </Card>

            <Card class="mt-4 min-w-0">
              <template #header><Text weight="bold">对话</Text></template>
              <Resizable
                v-if="isWide"
                axis="vertical"
                :handles="['bottom']"
                :default-height="300"
                :min-height="200"
                :max-height="460"
                class="w-full overflow-hidden"
                :style="{ width: '100%' }"
                aria-label="调整对话区高度"
              >
                <ChatWindow
                  v-model="draft"
                  :messages="(selected.messages as ChatMessage[])"
                  :class="TICKET_CHAT_WINDOW_CLASS"
                  :input-rows="2"
                  placeholder="回复提交人，回车发送"
                  send-text="发送"
                  :empty-text="detailLoading ? '正在加载对话…' : '暂无对话，开始回复吧'"
                  :status-text="chatStatus.text"
                  :status-variant="chatStatus.variant"
                  :show-avatar="false"
                  :show-name="false"
                  @send="handleSend"
                />
              </Resizable>
              <div v-else class="h-[280px] min-h-0 overflow-hidden">
                <ChatWindow
                  v-model="draft"
                  :messages="(selected.messages as ChatMessage[])"
                  :class="TICKET_CHAT_WINDOW_CLASS"
                  :input-rows="2"
                  placeholder="回复提交人，回车发送"
                  send-text="发送"
                  :empty-text="detailLoading ? '正在加载对话…' : '暂无对话，开始回复吧'"
                  :status-text="chatStatus.text"
                  :status-variant="chatStatus.variant"
                  :show-avatar="false"
                  :show-name="false"
                  @send="handleSend"
                />
              </div>
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
            <MutedPanel v-if="loading" description="正在加载工单…" />
            <Empty
              v-else
              preset="no-data"
              description="请选择左侧工单查看详情、对话与内部协作。"
            />
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
      @after-close="focusDrawerTrigger"
    >
      <div class="space-y-4">
        <div>
          <Text weight="medium" class="mb-1 block">标题</Text>
          <Input v-model="form.title" placeholder="简要描述问题或需求" />
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">分类</Text>
          <RadioGroup v-model="form.category">
            <Radio value="缺陷">缺陷</Radio>
            <Radio value="需求">需求</Radio>
            <Radio value="咨询">咨询</Radio>
          </RadioGroup>
        </div>
        <div>
          <Text weight="medium" class="mb-1 block">优先级</Text>
          <RadioGroup v-model="form.priority">
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
      @after-close="focusDrawerTrigger"
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
