<script setup lang="ts">
import type {
  TaskBoardCard,
  TaskBoardCardMoveEvent,
  TaskBoardColumn,
  TaskBoardColumnMoveEvent
} from '@expcat/tigercat-core'
import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  Tag,
  Text,
  notification
} from '@expcat/tigercat-vue'
import { TaskBoard } from '@expcat/tigercat-vue/TaskBoard'
import { computed, onMounted, ref, watch } from 'vue'
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
  getTaskPriorityColor,
  getTaskPriorityLabel
} from '../utils/task-board'
import { apiRequest, getAuthHeaders } from '../utils'
import type { AdminTaskBoardCard, AdminTaskBoardColumn, PagedResult } from '../utils/types'

const filterText = ref('')
const assigneeFilter = ref('')
const blockedFilter = ref('')
const dueFrom = ref('')
const dueTo = ref('')
const columns = ref<AdminTaskBoardColumn[]>([])
const selectedTask = ref<AdminTaskBoardCard | null>(null)
const detailOpen = ref(false)
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
  loading.value = true

  try {
    const params = new URLSearchParams({ page: '1', pageSize: '200' })
    if (filterText.value.trim()) params.set('keyword', filterText.value.trim())
    if (assigneeFilter.value.trim()) params.set('assignee', assigneeFilter.value.trim())
    if (blockedFilter.value) params.set('blocked', blockedFilter.value)
    if (dueFrom.value.trim()) params.set('dueFrom', new Date(dueFrom.value).toISOString())
    if (dueTo.value.trim()) params.set('dueTo', new Date(`${dueTo.value}T23:59:59`).toISOString())

    const payload = await apiRequest<PagedResult<AdminTaskBoardCard>>(`/api/tasks?${params}`, {
      headers: getAuthHeaders()
    })
    const nextColumns = buildTaskBoardColumnsFromTasks(payload.data.items)
    columns.value = nextColumns
    const queryTaskId = typeof route.query.taskId === 'string' ? route.query.taskId : ''
    const targetId = queryTaskId || selectedTask.value?.id
    const target = targetId ? findTaskBoardCard(nextColumns, targetId) : undefined
    if (queryTaskId && target) {
      selectedTask.value = target
      completionNote.value = target.completionNote ?? ''
      detailOpen.value = true
    } else if (target) {
      selectedTask.value = target
    }
    lastAction.value = `已同步 ${payload.data.total} 个后端任务。`
  } catch (error: unknown) {
    const message = error instanceof Error && error.message
      ? error.message
      : '任务加载失败，请稍后重试。'
    lastAction.value = message
    notification.error({
      title: '任务加载失败',
      description: message
    })
  } finally {
    loading.value = false
  }
}

const handleCardAdd = async (columnId: string | number) => {
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
  }
}

const handleColumnAdd = () => {
  notification.info({
    title: '阶段由后端模型固定',
    description: '当前任务状态包含需求池、待执行、执行中、待验收和已完成。'
  })
}

const handleCardMove = async (event: TaskBoardCardMoveEvent) => {
  const description = describeTaskMove(event, columns.value)
  lastAction.value = description
  try {
    await apiRequest<AdminTaskBoardCard>(`/api/tasks/${event.cardId}/status`, {
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
  filterText.value = ''
  assigneeFilter.value = ''
  blockedFilter.value = ''
  dueFrom.value = ''
  dueTo.value = ''
  void loadTasks()
}

const openTaskDetail = (card: AdminTaskBoardCard) => {
  selectedTask.value = card
  completionNote.value = card.completionNote ?? ''
  detailOpen.value = true
  void router.replace({ path: '/tasks', query: { taskId: card.id } })
}

const closeTaskDetail = () => {
  detailOpen.value = false
  void router.replace('/tasks')
}

const handleCompleteTask = async () => {
  if (!selectedTask.value) return

  if (selectedTask.value.blocked || selectedTask.value.status === 'done') {
    notification.warning({
      title: selectedTask.value.blocked ? '任务仍被阻塞' : '任务已完成',
      description: selectedTask.value.blocked
        ? '请先清除阻塞状态，再确认完成。'
        : '已完成任务无需重复确认。'
    })
    return
  }

  completing.value = true
  try {
    const payload = await apiRequest<AdminTaskBoardCard>(`/api/tasks/${selectedTask.value.id}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        confirm: true,
        completionNote: completionNote.value
      })
    })
    selectedTask.value = payload.data
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
    completing.value = false
  }
}

const beforeCardMove = (event: TaskBoardCardMoveEvent) => {
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

const renderCard = (card: TaskBoardCard) => {
  const currentCard = card as TaskBoardCard & {
    assignee?: string
    priority?: 'low' | 'medium' | 'high'
    dueAt?: string
    estimateHours?: number
    blocked?: boolean
  }

  return [
    {
      type: 'div',
      props: { class: 'space-y-3' },
      children: [
        {
          type: 'div',
          children: [
            {
              type: Text,
              props: { weight: 'bold' },
              children: () => currentCard.title
            },
            currentCard.description
              ? {
                  type: Text,
                  props: { size: 'sm', color: 'secondary', class: 'mt-1' },
                  children: () => currentCard.description
                }
              : null
          ].filter(Boolean)
        },
        {
          type: 'div',
          props: { class: 'flex flex-wrap gap-2' },
          children: [
            currentCard.priority
              ? {
                  type: Tag,
                  props: { color: getTaskPriorityColor(currentCard.priority), size: 'sm' },
                  children: () => getTaskPriorityLabel(currentCard.priority)
                }
              : null,
            currentCard.blocked
              ? {
                  type: Tag,
                  props: { color: 'red', size: 'sm' },
                  children: () => '阻塞中'
                }
              : null,
            {
              type: Tag,
              props: { color: 'blue', size: 'sm' },
              children: () => currentCard.assignee ?? '待分配'
            }
          ].filter(Boolean)
        },
        {
          type: Text,
          props: { size: 'sm', color: 'secondary' },
          children: () => `截止 ${currentCard.dueAt ? formatDateTime(currentCard.dueAt) : '--'} · 预估 ${currentCard.estimateHours ?? 0}h`
        }
      ]
    }
  ]
}

onMounted(loadTasks)
watch([filterText, assigneeFilter, blockedFilter, dueFrom, dueTo], () => {
  void loadTasks()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="任务面板"
      subtitle="用 TaskBoard 把后续异步任务做成可拖拽的阶段看板，验证增列、加卡片、WIP 与移动规则。"
      icon="clipboard"
      :tags="[
        { label: 'TaskBoard', color: 'blue' },
        { label: 'DragDrop', color: 'orange' },
        { label: 'WIP', color: 'green' }
      ]"
    />

    <PageActionPanel
      title="异步任务入口"
      description="当前任务来自后端模型，创建、负责人、截止时间和状态流转会持久化并写入审计事件。"
    >
      <template #actions>
          <Input
            :value="filterText"
            placeholder="搜索任务标题或说明"
            @change="(value) => filterText = String(value ?? '')"
          />
          <Input
            :value="assigneeFilter"
            placeholder="负责人"
            @change="(value) => assigneeFilter = String(value ?? '')"
          />
          <Input
            :value="dueFrom"
            type="date"
            placeholder="开始日期"
            @change="(value) => dueFrom = String(value ?? '')"
          />
          <Input
            :value="dueTo"
            type="date"
            placeholder="结束日期"
            @change="(value) => dueTo = String(value ?? '')"
          />
          <Select
            :value="blockedFilter"
            :options="[
              { label: '全部阻塞状态', value: '' },
              { label: '仅阻塞', value: 'true' },
              { label: '未阻塞', value: 'false' }
            ]"
            :clearable="false"
            @change="(value) => blockedFilter = String(value ?? '')"
          />
          <Button variant="outline" @click="handleResetBoard">
            刷新看板
          </Button>
      </template>
    </PageActionPanel>

    <MetricGrid>
      <MetricCard title="任务总数" :description="`当前看板共 ${totalCount} 个异步任务。`">
        <template #icon><Icon name="clipboard" :size="20" /></template>
      </MetricCard>
      <MetricCard title="超期任务" :description="`还有 ${overdueCount} 个任务超过计划时间。`">
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

      <TaskBoard
        :columns="columns"
        :filter-text="filterText"
        show-card-count
        allow-add-card
        :allow-add-column="false"
        enforce-wip-limit
        :before-card-move="beforeCardMove"
        @update:columns="handleColumnsChange"
        @card-add="handleCardAdd"
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
                :color="getTaskPriorityColor(card.priority)"
                size="sm"
              >
                {{ getTaskPriorityLabel(card.priority) }}
              </Tag>
              <Tag v-if="card.blocked" color="red" size="sm">
                阻塞中
              </Tag>
              <Tag color="blue" size="sm">
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
    </Card>

    <Modal
      v-model:open="detailOpen"
      title="任务详情"
      show-default-footer
      :ok-text="completing ? '完成中...' : '确认完成'"
      cancel-text="关闭"
      :confirm-loading="completing"
      @ok="handleCompleteTask"
      @cancel="closeTaskDetail"
    >
      <div v-if="selectedTask" class="space-y-4">
        <div>
          <Text weight="bold">{{ selectedTask.title }}</Text>
          <Text v-if="selectedTask.description" color="secondary" class="mt-1">
            {{ selectedTask.description }}
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
          :disabled="selectedTask.blocked || selectedTask.status === 'done'"
          @update:model-value="(value) => completionNote = String(value ?? '')"
        />
        <Text v-if="selectedTask.blocked" color="danger">
          阻塞任务需要先清除阻塞状态，才能确认完成。
        </Text>
      </div>
      <Text v-else color="secondary">请选择任务。</Text>
    </Modal>
  </div>
</template>
