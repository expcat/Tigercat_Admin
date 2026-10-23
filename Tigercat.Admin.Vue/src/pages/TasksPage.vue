<script setup lang="ts">
import type {
  InputType,
  TaskBoardCardMoveEvent,
  TaskBoardColumn,
  TaskBoardColumnMoveEvent
} from '@expcat/tigercat-core'
import { notification } from '@expcat/tigercat-vue/notification'

import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Input } from '@expcat/tigercat-vue/Input'
import { Modal } from '@expcat/tigercat-vue/Modal'
import { Select } from '@expcat/tigercat-vue/Select'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { TaskBoard } from '../utils/lazyTigercat'
import { usePermission } from '../utils/permission'
import { ApiError } from '../utils/request'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import MetricCard from '../components/MetricCard.vue'
import MetricGrid from '../components/MetricGrid.vue'
import MutedPanel from '../components/MutedPanel.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
import {
  buildTaskBoardColumnsFromTasks,
  coerceTaskBoardColumns,
  countBlockedTaskBoardCards,
  countOverdueTaskBoardCards,
  countTaskBoardCards,
  describeTaskMove,
  findTaskBoardCard,
  getTaskPriorityVariant,
  getTaskPriorityLabel
} from '../utils/task-board'
import { apiRequest, getAuthHeaders } from '../utils'
import type { AdminTaskBoardCard, AdminTaskBoardColumn, PagedResult } from '../utils/types'

const filterText = ref('')
const assigneeFilter = ref('')
const blockedFilter = ref('')
const dueFrom = ref('')
const dueTo = ref('')
// Tigercat InputType 未含 'date'，但 Input 会把 type 透传给原生 input，断言以保留原生日期选择器
const dateInputType = 'date' as unknown as InputType
const columns = ref<AdminTaskBoardColumn[]>([])
const selectedTask = ref<AdminTaskBoardCard | null>(null)
const { has } = usePermission()
const canView = computed(() => has('task:view'))
const canCreate = computed(() => has('task:create'))
const canEdit = computed(() => has('task:edit'))
const queryTaskId = computed(() => typeof route.query.taskId === 'string' ? route.query.taskId : route.query.taskId == null ? null : '')
const detailOpen = computed(() => queryTaskId.value !== null)
const detailLoading = ref(false)
const detailError = ref('')
const loadError = ref('')
const serverTotal = ref(0)
const saving = ref(false)
let listRequest: AbortController | null = null
let detailRequest: AbortController | null = null
let mutationPending = false
let detailTrigger: HTMLElement | null = null
const completionNote = ref('')
const completing = ref(false)
const loading = ref(true)
const lastAction = ref('任务面板正在读取后端工作流数据。')
const route = useRoute()
const router = useRouter()

const totalCount = computed(() => countTaskBoardCards(columns.value))
const blockedCount = computed(() => countBlockedTaskBoardCards(columns.value))
const overdueCount = computed(() => countOverdueTaskBoardCards(columns.value))

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

const handleColumnsChange = (nextColumns: TaskBoardColumn[]) => {
  columns.value = coerceTaskBoardColumns(nextColumns)
}

const loadTasks = async () => {
  listRequest?.abort()
  const controller = new AbortController()
  listRequest = controller
  loading.value = true
  loadError.value = ''
  columns.value = []
  serverTotal.value = 0
  try {
    if (!canView.value) throw new Error('无权查看任务面板。')
    if (dueFrom.value && dueTo.value && dueFrom.value > dueTo.value) throw new Error('开始日期不能晚于结束日期。')
    const params = new URLSearchParams({ page: '1', pageSize: '200' })
    if (filterText.value.trim()) params.set('keyword', filterText.value.trim())
    if (assigneeFilter.value.trim()) params.set('assignee', assigneeFilter.value.trim())
    if (blockedFilter.value) params.set('blocked', blockedFilter.value)
    if (dueFrom.value) params.set('dueFrom', new Date(`${dueFrom.value}T00:00:00`).toISOString())
    if (dueTo.value) params.set('dueTo', new Date(`${dueTo.value}T23:59:59.999`).toISOString())
    const payload = await apiRequest<PagedResult<AdminTaskBoardCard>>(`/api/tasks?${params}`, {
      headers: getAuthHeaders(), signal: controller.signal,
    })
    if (controller.signal.aborted) return
    columns.value = buildTaskBoardColumnsFromTasks(payload.data.items)
    serverTotal.value = payload.data.total
    lastAction.value = `已加载 ${payload.data.items.length} / ${payload.data.total} 个匹配任务，最多显示前 200 条。`
  } catch (error: unknown) {
    if (!controller.signal.aborted) loadError.value = error instanceof Error ? error.message : '任务加载失败，请重试。'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

const loadTaskDetail = async () => {
  detailRequest?.abort()
  const controller = new AbortController()
  detailRequest = controller
  selectedTask.value = null
  completionNote.value = ''
  detailError.value = ''
  const targetId = queryTaskId.value
  detailLoading.value = targetId !== null
  if (targetId === null) return
  try {
    if (!targetId.trim()) throw new Error('缺少任务编号')
    if (!canView.value) throw new Error('无权查看该任务')
    const payload = await apiRequest<AdminTaskBoardCard>(`/api/tasks/${encodeURIComponent(targetId)}`, {
      headers: getAuthHeaders(), signal: controller.signal,
    })
    if (controller.signal.aborted) return
    selectedTask.value = payload.data
    completionNote.value = payload.data.completionNote ?? ''
  } catch (error: unknown) {
    if (controller.signal.aborted) return
    const message = error instanceof ApiError && error.status === 404 ? '任务不存在或已被移除'
      : error instanceof ApiError && error.status === 403 ? '无权查看该任务'
      : error instanceof Error ? error.message : '任务详情加载失败，请重试'
    detailError.value = `${message}（ID：${targetId || '空'}）`
  } finally {
    if (!controller.signal.aborted) detailLoading.value = false
  }
}

const handleCardAdd = async (columnId: string | number) => {
  if (!canCreate.value || mutationPending || loading.value) return
  const column = columns.value.find(item => item.id === String(columnId))
  if (column?.wipLimit && column.cards.length >= column.wipLimit) {
    notification.warning({ title: '已达到 WIP 限制', description: '请先完成或移出当前视图中的任务。' })
    return
  }
  mutationPending = true
  saving.value = true
  try {
    await apiRequest<AdminTaskBoardCard>('/api/tasks', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: '新建运维任务',
        description: '来自任务面板的后端持久化任务。',
        assignee: '待分配',
        priority: 'medium',
        status: String(columnId),
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
        estimateHours: 2,
        blocked: false
      })
    })
    await loadTasks()
    lastAction.value = `已在 ${columnId} 阶段新增后端任务。`
    notification.success({
      title: '已新增任务',
      description: '任务已保存到后端工作流。'
    })
  } catch (error: unknown) {
    notification.error({
      title: '新增任务失败',
      description: error instanceof Error ? error.message : '请稍后重试。'
    })
  } finally {
    mutationPending = false
    saving.value = false
  }
}

const handleColumnAdd = () => {
  notification.info({
    title: '阶段由后端模型固定',
    description: '当前任务状态包含需求池、待执行、执行中、待验收和已完成。'
  })
}

const handleCardMove = async (event: TaskBoardCardMoveEvent) => {
  if (!canEdit.value || mutationPending) return
  mutationPending = true
  saving.value = true
  const description = describeTaskMove(event, columns.value)
  lastAction.value = description
  try {
    await apiRequest<AdminTaskBoardCard>(`/api/tasks/${encodeURIComponent(event.cardId)}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: String(event.toColumnId) })
    })
    await loadTasks()
    notification.info({
      title: '任务阶段已更新',
      description
    })
  } catch (error: unknown) {
    await loadTasks()
    notification.error({
      title: '任务流转失败',
      description: error instanceof Error ? error.message : '请稍后重试。'
    })
  } finally {
    mutationPending = false
    saving.value = false
  }
}

const handleColumnMove = (event: TaskBoardColumnMoveEvent) => {
  const description = `阶段顺序已调整：${event.columnId} 从 ${event.fromIndex + 1} 移动到 ${event.toIndex + 1}`
  lastAction.value = description
  notification.info({
    title: '阶段顺序已更新',
    description
  })
}

const handleResetBoard = () => {
  void loadTasks()
  if (detailOpen.value) void loadTaskDetail()
}

const openTaskDetail = (card: AdminTaskBoardCard) => {
  detailTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  void router.replace({ path: '/tasks', query: { taskId: card.id } })
}

const closeTaskDetail = () => {
  if (!mutationPending) void router.replace('/tasks')
}

function focusDetailTrigger() {
  ;(detailTrigger?.isConnected ? detailTrigger : document.querySelector<HTMLElement>('[data-testid="tasks-refresh"]'))?.focus()
}

const handleCompleteTask = async () => {
  if (!canEdit.value || mutationPending || !selectedTask.value) return

  if (selectedTask.value.blocked || selectedTask.value.status === 'done') {
    notification.warning({
      title: selectedTask.value.blocked ? '任务仍被阻塞' : '任务已完成',
      description: selectedTask.value.blocked
        ? '请先清除阻塞状态，再确认完成。'
        : '已完成任务无需重复确认。'
    })
    return
  }

  mutationPending = true
  completing.value = true
  try {
    const payload = await apiRequest<AdminTaskBoardCard>(`/api/tasks/${encodeURIComponent(selectedTask.value.id)}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        confirm: true,
        completionNote: completionNote.value
      })
    })
    if (queryTaskId.value === payload.data.id) selectedTask.value = payload.data
    await loadTasks()
    notification.success({
      title: '任务已完成',
      description: payload.data.title
    })
  } catch (error: unknown) {
    notification.error({
      title: '任务完成失败',
      description: error instanceof Error ? error.message : '请稍后重试。'
    })
  } finally {
    mutationPending = false
    completing.value = false
  }
}

const beforeCardMove = (event: TaskBoardCardMoveEvent) => {
  if (!canEdit.value || loading.value || mutationPending) return false
  if (event.toColumnId !== 'done') {
    return true
  }

  const currentCard = findTaskBoardCard(columns.value, event.cardId)
  if (!currentCard?.blocked) {
    return true
  }

  lastAction.value = `已阻止 ${currentCard.title} 进入已完成：存在阻塞项未清理。`
  notification.warning({
    title: '任务仍被阻塞',
    description: '请先清除阻塞状态，再移动到已完成。'
  })
  return false
}

watch([filterText, assigneeFilter, blockedFilter, dueFrom, dueTo, canView], () => void loadTasks(), { immediate: true })
watch([queryTaskId, canView], () => void loadTaskDetail(), { immediate: true })
onBeforeUnmount(() => { listRequest?.abort(); detailRequest?.abort() })
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="任务面板"
      subtitle="查看任务、按条件筛选，并流转阶段或确认完成。"
      icon="clipboard"
      :tags="[
        { label: 'TaskBoard', variant: 'primary' },
        { label: 'DragDrop', variant: 'warning' },
        { label: 'WIP', variant: 'success' }
      ]"
    />

    <PageActionPanel
      title="异步任务入口"
      description="当前任务来自后端模型，创建、负责人、截止时间和状态流转会持久化并写入审计事件。"
    >
      <template #actions>
          <Input
            :model-value="filterText"
            :disabled="saving || completing"
            placeholder="搜索任务标题或说明"
            class="w-full sm:w-64"
            @update:model-value="(value) => filterText = String(value ?? '')"
          />
          <Input
            :model-value="assigneeFilter"
            :disabled="saving || completing"
            placeholder="负责人（包含匹配）"
            class="w-full sm:w-40"
            @update:model-value="(value) => assigneeFilter = String(value ?? '')"
          />
          <Input
            :model-value="dueFrom"
            :disabled="saving || completing"
            :type="dateInputType"
            placeholder="开始日期"
            aria-label="开始日期"
            class="w-full sm:w-44"
            @update:model-value="(value) => dueFrom = String(value ?? '')"
          />
          <Input
            :model-value="dueTo"
            :disabled="saving || completing"
            :type="dateInputType"
            placeholder="结束日期"
            aria-label="结束日期"
            class="w-full sm:w-44"
            @update:model-value="(value) => dueTo = String(value ?? '')"
          />
          <Select
            :model-value="blockedFilter"
            :disabled="saving || completing"
            :options="[
              { label: '全部阻塞状态', value: '' },
              { label: '仅阻塞', value: 'true' },
              { label: '未阻塞', value: 'false' }
            ]"
            :clearable="false"
            class="w-full sm:w-44"
            @update:model-value="(value) => blockedFilter = String(value ?? '')"
          />
          <Button variant="outline" data-testid="tasks-refresh" :disabled="saving || completing" @click="handleResetBoard">
            刷新看板
          </Button>
      </template>
    </PageActionPanel>

    <MetricGrid>
      <MetricCard title="任务总数" :value="loading || loadError ? '—' : serverTotal" :description="`当前显示 ${totalCount} 条；统计与 WIP 限于已加载任务。`">
        <template #icon><Icon name="clipboard" :size="20" /></template>
      </MetricCard>
      <MetricCard title="超期任务" :description="`已加载任务中有 ${overdueCount} 个超过计划时间。`">
        <template #icon><Icon name="clock" :size="20" /></template>
      </MetricCard>
      <MetricCard title="阻塞项" :description="`当前有 ${blockedCount} 个任务被阻塞，不能直接移动到已完成。`">
        <template #icon><Icon name="zap" :size="20" /></template>
      </MetricCard>
    </MetricGrid>

    <Card title="任务流转验证">
      <MutedPanel
        class="mb-4"
        title="最近动作"
        :description="loading ? '正在同步后端任务...' : lastAction"
      />

      <div v-if="loadError" role="alert" class="space-y-3"><Text color="danger">{{ loadError }}</Text><Button variant="outline" @click="handleResetBoard">重试任务列表</Button></div>
      <TaskBoard v-else
        :columns="columns"
        show-card-count
        :allow-add-card="canCreate && !loading && !saving && !completing"
        :draggable="canEdit && !loading && !saving && !completing"
        :column-draggable="!loading && !saving && !completing"
        :allow-add-column="false"
        enforce-wip-limit
        :before-card-move="beforeCardMove"
        @update:columns="handleColumnsChange"
        v-on="canCreate && !loading && !saving && !completing ? { 'card-add': handleCardAdd } : {}"
        @column-add="handleColumnAdd"
        @card-move="handleCardMove"
        @column-move="handleColumnMove"
      >
        <template #card="{ card }">
          <div class="space-y-3">
            <div>
              <Text weight="bold">{{ card.title }}</Text>
              <Text v-if="card.description" size="sm" color="secondary" class="mt-1">
                {{ card.description }}
              </Text>
            </div>

            <div class="flex flex-wrap gap-2">
              <Tag
                v-if="card.priority"
                :variant="getTaskPriorityVariant(card.priority)"
                size="sm"
              >
                {{ getTaskPriorityLabel(card.priority) }}
              </Tag>
              <Tag v-if="card.blocked" variant="danger" size="sm">
                阻塞中
              </Tag>
              <Tag variant="primary" size="sm">
                {{ card.assignee ?? '待分配' }}
              </Tag>
            </div>

            <Text size="sm" color="secondary">
              截止 {{ card.dueAt ? formatDateTime(card.dueAt) : '--' }} · 预估 {{ card.estimateHours ?? 0 }}h
            </Text>
            <Text v-if="card.blockedReason" size="sm" color="danger">
              {{ card.blockedReason }}
            </Text>
            <Button size="sm" variant="outline" @click="openTaskDetail(card)">
              详情
            </Button>
          </div>
        </template>
      </TaskBoard>
      <Text v-if="!loading && !loadError && totalCount === 0" color="secondary">没有符合条件的任务。</Text>
    </Card>

    <Modal
      :open="detailOpen"
      title="任务详情"
      :mask-closable="!completing"
      :keyboard="!completing"
      :closable="!completing"
      @update:open="(open) => { if (!open) closeTaskDetail() }"
      @cancel="closeTaskDetail"
      @after-close="focusDetailTrigger"
    >
      <template #footer>
        <Button variant="outline" :disabled="completing" @click="closeTaskDetail">关闭</Button>
        <Button v-if="selectedTask && canEdit" :disabled="completing || selectedTask.blocked || selectedTask.status === 'done'" @click="handleCompleteTask">{{ completing ? '完成中...' : '确认完成' }}</Button>
      </template>
      <Text v-if="detailLoading">正在加载任务 {{ queryTaskId }}…</Text>
      <div v-else-if="detailError" role="alert" class="space-y-3"><Text color="danger">{{ detailError }}</Text><Button variant="outline" @click="loadTaskDetail">重试任务详情</Button></div>
      <div v-if="selectedTask" class="space-y-4">
        <div>
          <!-- 退出过渡期间 Text 仍可能渲染插槽，详情此时已被清空。 -->
          <Text weight="bold">{{ selectedTask?.title }}</Text>
          <Text v-if="selectedTask.description" color="secondary" class="mt-1">
            {{ selectedTask?.description }}
          </Text>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MutedPanel title="负责人" :description="selectedTask.assignee" />
          <MutedPanel title="截止时间" :description="formatDateTime(selectedTask.dueAt)" />
          <MutedPanel title="当前状态" :description="selectedTask.status" />
          <MutedPanel title="预估工时" :description="`${selectedTask.estimateHours}h`" />
        </div>
        <MutedPanel
          v-if="selectedTask.blocked"
          title="阻塞原因"
          :description="selectedTask.blockedReason ?? '暂无阻塞说明'"
        />
        <MutedPanel
          v-if="selectedTask.completionNote"
          title="完成说明"
          :description="selectedTask.completionNote"
        />
        <Input
          :model-value="completionNote"
          placeholder="完成说明"
          aria-label="完成说明"
          :max-length="500"
          :disabled="!canEdit || completing || selectedTask.blocked || selectedTask.status === 'done'"
          @update:model-value="(value) => completionNote = String(value ?? '')"
        />
        <Text v-if="selectedTask.blocked" color="danger">
          阻塞任务需要先清除阻塞状态，才能确认完成。
        </Text>
      </div>

    </Modal>
  </div>
</template>
