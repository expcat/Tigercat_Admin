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
import { computed, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import {
  addTaskBoardCard,
  addTaskBoardColumn,
  coerceTaskBoardColumns,
  countBlockedTaskBoardCards,
  countOverdueTaskBoardCards,
  countTaskBoardCards,
  createInitialTaskBoardColumns,
  describeTaskMove,
  findTaskBoardCard,
  getTaskPriorityColor,
  getTaskPriorityLabel
} from '../utils/task-board'
import type { AdminTaskBoardColumn } from '../utils/types'

const filterText = ref('')
const columns = ref<AdminTaskBoardColumn[]>(createInitialTaskBoardColumns())
const lastAction = ref('当前使用本地任务数据验证后续异步任务入口。')

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

const handleCardAdd = (columnId: string | number) => {
  columns.value = addTaskBoardCard(columns.value, columnId)
  lastAction.value = `已在 ${columnId} 阶段新增任务卡片。`
  notification.success({
    title: '已新增任务卡片',
    description: '你可以继续拖拽到其他阶段，验证异步任务流转。'
  })
}

const handleColumnAdd = () => {
  columns.value = addTaskBoardColumn(columns.value)
  lastAction.value = '已新增临时阶段，可用于后续任务分流。'
  notification.info({
    title: '已新增阶段',
    description: 'TaskBoard 已成功验证增列能力。'
  })
}

const handleCardMove = (event: TaskBoardCardMoveEvent) => {
  const description = describeTaskMove(event, columns.value)
  lastAction.value = description
  notification.info({
    title: '任务阶段已更新',
    description
  })
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
  columns.value = createInitialTaskBoardColumns()
  filterText.value = ''
  lastAction.value = '任务面板已重置到初始状态。'
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
            当前仍是前端本地任务数据，后续可以直接替换成导出任务、审计处理或系统巡检的真实后端任务源。
          </Text>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row">
          <Input
            :value="filterText"
            placeholder="搜索任务标题或说明"
            @change="(value) => filterText = String(value ?? '')"
          />
          <Button variant="outline" @click="handleResetBoard">
            重置看板
          </Button>
        </div>
      </div>
    </Card>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
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
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
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
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
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
      <div class="mb-4 flex flex-col gap-2 rounded-2xl border border-[var(--tiger-border,#e2e8f0)] bg-[var(--tiger-bg-hover,#f8fafc)] p-4">
        <Text weight="bold">最近动作</Text>
        <Text size="sm" color="secondary">
          {{ lastAction }}
        </Text>
      </div>

      <TaskBoard
        :columns="columns"
        :filter-text="filterText"
        show-card-count
        allow-add-card
        allow-add-column
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