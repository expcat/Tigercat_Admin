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
  Tag,
  TaskBoard,
  Text,
  notification
} from '@expcat/tigercat-vue'
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
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
const columns = ref<AdminTaskBoardColumn[]>([])
const loading = ref(true)
const lastAction = ref('任务面板正在读取后端工作流数据。')

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
    const payload = await apiRequest<PagedResult<AdminTaskBoardCard>>('/api/tasks?page=1&pageSize=200', {
      headers: getAuthHeaders()
    })
    columns.value = buildTaskBoardColumnsFromTasks(payload.data.items)
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
  void loadTasks()
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

    <Card>
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Text weight="bold">异步任务入口</Text>
          <Text size="sm" color="secondary">
            当前任务来自后端模型，创建、负责人、截止时间和状态流转会持久化并写入审计事件。
          </Text>
        </div>
        <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Input
            :value="filterText"
            placeholder="搜索任务标题或说明"
            @change="(value) => filterText = String(value ?? '')"
          />
          <Button variant="outline" @click="handleResetBoard">
            刷新看板
          </Button>
        </div>
      </div>
    </Card>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <div class="flex items-center gap-3">
          <div class="p2-icon-chip flex h-11 w-11 shrink-0 items-center justify-center">
            <Icon name="clipboard" :size="20" />
          </div>
          <div>
            <Text weight="bold">任务总数</Text>
            <Text size="sm" color="secondary">
              当前看板共 {{ totalCount }} 个异步任务。
            </Text>
          </div>
        </div>
      </Card>

      <Card>
        <div class="flex items-center gap-3">
          <div class="p2-icon-chip flex h-11 w-11 shrink-0 items-center justify-center">
            <Icon name="clock" :size="20" />
          </div>
          <div>
            <Text weight="bold">超期任务</Text>
            <Text size="sm" color="secondary">
              还有 {{ overdueCount }} 个任务超过计划时间。
            </Text>
          </div>
        </div>
      </Card>

      <Card>
        <div class="flex items-center gap-3">
          <div class="p2-icon-chip flex h-11 w-11 shrink-0 items-center justify-center">
            <Icon name="zap" :size="20" />
          </div>
          <div>
            <Text weight="bold">阻塞项</Text>
            <Text size="sm" color="secondary">
              当前有 {{ blockedCount }} 个任务被阻塞，不能直接移动到已完成。
            </Text>
          </div>
        </div>
      </Card>
    </div>

    <Card title="任务流转验证">
      <div class="p2-muted-panel mb-4 flex flex-col gap-2 p-4">
        <Text weight="bold">最近动作</Text>
        <Text size="sm" color="secondary">
          {{ loading ? '正在同步后端任务...' : lastAction }}
        </Text>
      </div>

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
          </div>
        </template>
      </TaskBoard>
    </Card>
  </div>
</template>
