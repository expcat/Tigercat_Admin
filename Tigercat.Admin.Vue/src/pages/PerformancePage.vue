<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button, Card, Tag, Text, useDrag } from '@expcat/tigercat-vue'
import { Tabs } from '@expcat/tigercat-vue/Tabs'
import { TabPane } from '@expcat/tigercat-vue/TabPane'
import { VirtualList } from '@expcat/tigercat-vue/VirtualList'
import { VirtualTable } from '@expcat/tigercat-vue/VirtualTable'
import { Kanban } from '@expcat/tigercat-vue/Kanban'
import type {
  DragItem,
  KanbanSwimlane,
  TableColumn,
  TagVariant,
  TaskBoardCardMoveEvent,
  TaskBoardColumn,
} from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MetricGrid from '../components/MetricGrid.vue'
import MetricCard from '../components/MetricCard.vue'
import MutedPanel from '../components/MutedPanel.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
import Icon from '../components/Icon.vue'

type DemoTab = 'list' | 'table' | 'drag' | 'kanban'
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface PerformanceLog {
  id: number
  level: LogLevel
  time: string
  logger: string
  message: string
}

interface PerformanceRow extends Record<string, unknown> {
  id: string
  service: string
  region: string
  status: string
  latency: number
  bytes: number
  time: string
}

interface QueueItem extends DragItem {
  data: {
    title: string
    owner: string
  }
}

const LOG_COUNT = 12_000
const TABLE_COUNT = 10_000
const LIST_HEIGHT = 420
const LIST_ITEM_HEIGHT = 48
const TABLE_HEIGHT = 480
const TABLE_ROW_HEIGHT = 48

const LOG_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR']
const LOG_LEVEL_META: Record<LogLevel, { variant: TagVariant }> = {
  DEBUG: { variant: 'default' },
  INFO: { variant: 'primary' },
  WARN: { variant: 'warning' },
  ERROR: { variant: 'danger' },
}
const LOG_LOGGERS = ['gateway', 'auth', 'billing', 'media', 'jobs']
const LOG_MESSAGES = [
  '同步缓存分片完成',
  '写入审计流水',
  '消费队列消息超时重试',
  '节点心跳正常',
  '批量导出任务入队',
  '对象存储预签名成功',
]

const TABLE_SERVICES = ['auth-api', 'billing-api', 'media-api', 'jobs-worker', 'gateway']
const TABLE_REGIONS = ['华东', '华北', '华南', '西南']
const TABLE_STATUSES = ['成功', '重试', '超时', '限流']

const TABLE_COLUMNS: TableColumn[] = [
  { key: 'id', title: '编号', width: 120 },
  { key: 'service', title: '服务', width: 140 },
  { key: 'region', title: '区域', width: 100 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'latency', title: '延迟(ms)', width: 110, align: 'right' },
  { key: 'bytes', title: '体积(KB)', width: 110, align: 'right' },
  { key: 'time', title: '时间', width: 160 },
]

const KANBAN_SWIMLANES: KanbanSwimlane[] = [
  { id: 'frontend', label: '前端', color: '#3b82f6' },
  { id: 'backend', label: '后端', color: '#22c55e' },
]

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatClock(index: number): string {
  const hour = Math.floor(index / 3600) % 24
  const minute = Math.floor(index / 60) % 60
  const second = index % 60
  return `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
}

function createLogLines(count: number): PerformanceLog[] {
  const rows: PerformanceLog[] = new Array(count)
  for (let i = 0; i < count; i += 1) {
    rows[i] = {
      id: i + 1,
      level: LOG_LEVELS[i % LOG_LEVELS.length],
      time: `2026-07-01 ${formatClock(i)}`,
      logger: LOG_LOGGERS[i % LOG_LOGGERS.length],
      message: `${LOG_MESSAGES[i % LOG_MESSAGES.length]} #${i + 1}`,
    }
  }
  return rows
}

function createTableRows(count: number): PerformanceRow[] {
  const rows: PerformanceRow[] = new Array(count)
  for (let i = 0; i < count; i += 1) {
    rows[i] = {
      id: `EVT-${String(i + 1).padStart(5, '0')}`,
      service: TABLE_SERVICES[i % TABLE_SERVICES.length],
      region: TABLE_REGIONS[i % TABLE_REGIONS.length],
      status: TABLE_STATUSES[i % TABLE_STATUSES.length],
      latency: 12 + ((i * 17) % 480),
      bytes: 8 + ((i * 13) % 2048),
      time: `2026-07-01 ${formatClock(i)}`,
    }
  }
  return rows
}

function createSeedDragItems(): QueueItem[] {
  const seed = [
    { id: 'queue-1', title: '日志检索超时排查', owner: '王小虎' },
    { id: 'queue-2', title: '万行表格首屏优化', owner: '李青' },
    { id: 'queue-3', title: '拖拽排序回归', owner: '陈晨' },
    { id: 'queue-4', title: '看板泳道演示', owner: '赵敏' },
    { id: 'queue-5', title: '虚拟列表滚动抖动', owner: '周宁' },
    { id: 'queue-6', title: '固定表头对齐', owner: '吴兰' },
    { id: 'queue-7', title: '暗色 token 复核', owner: '郑浩' },
    { id: 'queue-8', title: '窄屏卡片换行', owner: '孙悦' },
  ]
  return seed.map((item, index) => ({
    id: item.id,
    index,
    containerId: 'performance-queue',
    data: { title: item.title, owner: item.owner },
  }))
}

function createSeedKanbanColumns(): TaskBoardColumn[] {
  return [
    {
      id: 'intake',
      title: '接入',
      description: '待分流的性能工单',
      cards: [
        {
          id: 'k-1',
          title: '日志检索超时',
          description: '检索 10 万行超过 2s',
          lane: 'backend',
        },
        {
          id: 'k-2',
          title: '表格首屏抖动',
          description: '万行表格初次渲染',
          lane: 'frontend',
        },
      ],
    },
    {
      id: 'doing',
      title: '处理中',
      description: '正在验证虚拟化方案',
      wipLimit: 3,
      cards: [
        {
          id: 'k-3',
          title: 'VirtualList 行高对齐',
          description: '固定 48px 行高与 Tag 垂直居中',
          lane: 'frontend',
        },
        {
          id: 'k-4',
          title: '索引重建',
          description: '审计流水按时间分区',
          lane: 'backend',
        },
      ],
    },
    {
      id: 'verify',
      title: '验证',
      description: '对照 TaskBoard 场景做差异验收',
      cards: [
        {
          id: 'k-5',
          title: '低层看板拖拽',
          description: '确认卡片可跨列，且不是 /tasks 的 TaskBoard',
          lane: 'frontend',
        },
      ],
    },
    {
      id: 'done',
      title: '完成',
      description: '已确认的演示项',
      cards: [
        {
          id: 'k-6',
          title: '页面内造数',
          description: '不接 MockApi / .NET 端点',
          lane: 'backend',
        },
      ],
    },
  ]
}

function countKanbanCards(columns: TaskBoardColumn[]): number {
  return columns.reduce((sum, column) => sum + column.cards.length, 0)
}

const activeTab = ref<DemoTab>('list')
const logLines = createLogLines(LOG_COUNT)
const tableRows = createTableRows(TABLE_COUNT)
const dragItems = ref<QueueItem[]>(createSeedDragItems())
const lastReorder = ref('尚未拖拽')
const kanbanColumns = ref<TaskBoardColumn[]>(createSeedKanbanColumns())
const lastKanbanMove = ref('尚未移动卡片')

const {
  getDragItemAttrs,
  getDropZoneAttrs,
  reorder,
  drop,
  isDragging,
} = useDrag({
  containerId: 'performance-queue',
  config: { direction: 'vertical', dragClass: 'opacity-50' },
})

const kanbanCardCount = computed(() => countKanbanCards(kanbanColumns.value))
const dragOrderText = computed(() =>
  dragItems.value.map((item) => item.data.title).join(' → '),
)

function handleTabChange(key: string | number) {
  if (key === 'list' || key === 'table' || key === 'drag' || key === 'kanban') {
    activeTab.value = key
  }
}

function handleDragDrop(event: DragEvent) {
  const result = reorder(dragItems.value)
  drop(event)
  if (!result || result.fromIndex === result.toIndex) {
    return
  }
  dragItems.value = result.items
  const moved = result.items[result.toIndex]
  const title = String(moved?.data?.title ?? moved?.id)
  lastReorder.value = `${title}：第 ${result.fromIndex + 1} 位 → 第 ${result.toIndex + 1} 位`
}

function resetDragItems() {
  dragItems.value = createSeedDragItems()
  lastReorder.value = '已恢复初始顺序'
}

function handleKanbanColumnsChange(next: TaskBoardColumn[]) {
  kanbanColumns.value = next
}

function handleKanbanCardMove(event: TaskBoardCardMoveEvent) {
  lastKanbanMove.value = `卡片 ${event.cardId}：${event.fromColumnId} → ${event.toColumnId}`
}

function dropZoneBindings() {
  return {
    ...getDropZoneAttrs(),
    onDrop: handleDragDrop,
  }
}

function logLine(index: number): PerformanceLog {
  return logLines[index] ?? logLines[0]
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="zap"
      title="大数据演示"
      subtitle="万级虚拟列表 / 虚拟表格与自由拖拽、低层看板演示，数据仅在页面内存生成"
      :tags="[
        { label: '运维', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
        { label: '万级数据', variant: 'warning' },
      ]"
    />

    <MetricGrid :columns="4">
      <MetricCard
        title="日志行数"
        :value="logLines.length.toLocaleString('zh-CN')"
        description="VirtualList 视口外不渲染"
      >
        <template #icon><Icon name="activity" :size="20" /></template>
      </MetricCard>
      <MetricCard
        title="表格行数"
        :value="tableRows.length.toLocaleString('zh-CN')"
        description="VirtualTable 固定行高"
      >
        <template #icon><Icon name="fileText" :size="20" /></template>
      </MetricCard>
      <MetricCard
        title="拖拽队列"
        :value="dragItems.length"
        description="useDrag 自由排序"
      >
        <template #icon><Icon name="zap" :size="20" /></template>
      </MetricCard>
      <MetricCard
        title="看板卡片"
        :value="kanbanCardCount"
        description="低层 Kanban，非 TaskBoard"
      >
        <template #icon><Icon name="clipboard" :size="20" /></template>
      </MetricCard>
    </MetricGrid>

    <PageActionPanel
      title="页面内造数，不走后端"
      description="四个演示都在本页内存生成。VirtualList / VirtualTable 用子路径导入；拖拽使用包入口的 useDrag（v1.5.0 没有 /Drag 组件）；看板使用低层 Kanban，区别于「任务面板」的 TaskBoard。"
    />

    <Tabs :active-key="activeTab" lazy @update:active-key="handleTabChange">
      <TabPane tab-key="list" label="万级日志流">
        <div class="space-y-4" data-testid="performance-virtual-list">
          <MutedPanel
            title="VirtualList"
            description="固定高度视口滚动 12,000 条日志。仅绘制当前窗口内的级别、时间和消息。"
          />
          <Card class="overflow-hidden p-0">
            <VirtualList
              :item-count="logLines.length"
              :item-height="LIST_ITEM_HEIGHT"
              :height="LIST_HEIGHT"
              :overscan="8"
            >
              <template #default="{ index }">
                <div
                  class="flex h-full items-center gap-3 border-b border-(--tiger-border,#e5e7eb) px-3"
                >
                  <Tag :variant="LOG_LEVEL_META[logLine(index).level].variant" size="sm">
                    {{ logLine(index).level }}
                  </Tag>
                  <Text size="sm" color="secondary" class="shrink-0 font-mono">
                    {{ logLine(index).time }}
                  </Text>
                  <Text size="sm" color="secondary" class="hidden shrink-0 sm:inline">
                    {{ logLine(index).logger }}
                  </Text>
                  <Text size="sm" class="min-w-0 truncate">
                    {{ logLine(index).message }}
                  </Text>
                </div>
              </template>
            </VirtualList>
          </Card>
        </div>
      </TabPane>

      <TabPane tab-key="table" label="万行多列">
        <div class="space-y-4" data-testid="performance-virtual-table">
          <MutedPanel
            title="VirtualTable"
            description="10,000 行多列表格，开启 stickyHeader，并设置 rowHeight / height。窄屏下表格区域可横向滚动。"
          />
          <Card class="overflow-hidden p-0">
            <div class="overflow-x-auto">
              <VirtualTable
                :data="tableRows"
                :columns="TABLE_COLUMNS"
                row-key="id"
                :row-height="TABLE_ROW_HEIGHT"
                :height="TABLE_HEIGHT"
                sticky-header
                striped
                bordered
              />
            </div>
          </Card>
        </div>
      </TabPane>

      <TabPane tab-key="drag" label="自由拖拽">
        <div class="space-y-4" data-testid="performance-drag-list">
          <MutedPanel
            title="useDrag"
            description="这是包入口的 useDrag 可排序队列，不是 TaskBoard。拖动卡片调整顺序后，下方展示最新排列结果。"
          />
          <div class="flex flex-wrap items-center justify-between gap-3">
            <Text size="sm" color="secondary">
              {{ isDragging ? '正在拖拽…' : lastReorder }}
            </Text>
            <Button variant="outline" size="sm" @click="resetDragItems">
              恢复顺序
            </Button>
          </div>
          <div class="grid gap-3" v-bind="dropZoneBindings()">
            <div
              v-for="item in dragItems"
              :key="item.id"
              class="cursor-grab rounded-lg border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-card,#fff) p-3 select-none"
              v-bind="getDragItemAttrs(item)"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <Text weight="medium">{{ item.data.title }}</Text>
                  <Text size="sm" color="secondary">
                    {{ item.data.owner }} · 第 {{ item.index + 1 }} 位
                  </Text>
                </div>
                <Tag variant="info" size="sm">{{ item.id }}</Tag>
              </div>
            </div>
          </div>
          <Card>
            <Text weight="bold">当前顺序</Text>
            <Text size="sm" color="secondary" class="mt-2">
              {{ dragOrderText }}
            </Text>
          </Card>
        </div>
      </TabPane>

      <TabPane tab-key="kanban" label="低层看板">
        <div class="space-y-4" data-testid="performance-kanban">
          <MutedPanel
            title="Kanban"
            description="低层看板组件，带列、卡片和前后端泳道。可拖拽卡片跨列，场景与「任务面板」TaskBoard 不同：这里没有后端任务工作流。"
          />
          <Text size="sm" color="secondary">
            {{ lastKanbanMove }}
          </Text>
          <div class="overflow-x-auto">
            <Kanban
              :columns="kanbanColumns"
              :draggable="true"
              :column-draggable="false"
              :show-card-count="true"
              :allow-add-card="false"
              :allow-add-column="false"
              :swimlanes="KANBAN_SWIMLANES"
              swimlane-field="lane"
              @update:columns="handleKanbanColumnsChange"
              @card-move="handleKanbanCardMove"
            />
          </div>
        </div>
      </TabPane>
    </Tabs>
  </div>
</template>
