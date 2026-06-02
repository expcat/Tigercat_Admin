import type {
  TaskBoardCardMoveEvent,
  TaskBoardColumn,
} from '@expcat/tigercat-core';
import type {
  AdminTaskBoardCard,
  AdminTaskBoardColumn,
  AdminTaskStatus,
} from './types';

const TASK_BOARD_COLUMN_DEFINITIONS: Omit<AdminTaskBoardColumn, 'cards'>[] = [
  {
    id: 'backlog',
    title: '需求池',
    description: '记录已经确认但还未排期的事项。',
  },
  {
    id: 'todo',
    title: '待执行',
    description: '已经进入当前迭代，等待领取执行。',
    wipLimit: 4,
  },
  {
    id: 'doing',
    title: '执行中',
    description: '需要持续推进的当前异步任务。',
    wipLimit: 3,
  },
  {
    id: 'review',
    title: '待验收',
    description: '功能已完成，等待验收或联调确认。',
    wipLimit: 2,
  },
  {
    id: 'done',
    title: '已完成',
    description: '已完成并可回看结果的任务。',
  },
];

const INITIAL_TASK_BOARD_COLUMNS: AdminTaskBoardColumn[] = [
  {
    id: 'backlog',
    title: '需求池',
    description: '记录已经确认但还未排期的事项。',
    cards: [
      {
        id: 'task-asset-review',
        title: '补齐媒体资源持久化方案',
        description:
          '为 Logo 与头像预留真实存储方案，明确对象存储与权限校验边界。',
        assignee: '王一哲',
        priority: 'high',
        status: 'backlog',
        dueAt: '2026-06-03T18:00:00+08:00',
        estimateHours: 6,
      },
      {
        id: 'task-e2e-plan',
        title: '梳理用户与设置核心流程 E2E 用例',
        description: '覆盖登录、用户 CRUD、设置保存与权限保护的最小回归集合。',
        assignee: '平台测试',
        priority: 'medium',
        status: 'backlog',
        dueAt: '2026-06-05T12:00:00+08:00',
        estimateHours: 4,
      },
    ],
  },
  {
    id: 'todo',
    title: '待执行',
    description: '已经进入当前迭代，等待领取执行。',
    wipLimit: 4,
    cards: [
      {
        id: 'task-postgres-docs',
        title: '整理 PostgreSQL 生产配置文档',
        description: '补齐连接串、迁移、备份策略与 Aspire 环境变量示例。',
        assignee: '后端组',
        priority: 'high',
        status: 'todo',
        dueAt: '2026-05-30T18:00:00+08:00',
        estimateHours: 5,
      },
      {
        id: 'task-taskboard-page',
        title: '验证 TaskBoard 任务面板',
        description:
          '把异步任务入口先做成前端本地看板，验证拖拽、WIP 与增列能力。',
        assignee: '前端组',
        priority: 'high',
        status: 'todo',
        dueAt: '2026-05-28T20:00:00+08:00',
        estimateHours: 3,
      },
    ],
  },
  {
    id: 'doing',
    title: '执行中',
    description: '需要持续推进的当前异步任务。',
    wipLimit: 3,
    cards: [
      {
        id: 'task-release-qa',
        title: '发布窗口前检查双端构建产物',
        description:
          '确认 React 与 Vue 构建产物可用于演示，并检查 chunk 体积预警。',
        assignee: '前端组',
        priority: 'medium',
        status: 'doing',
        dueAt: '2026-05-29T11:00:00+08:00',
        estimateHours: 2,
      },
      {
        id: 'task-cache-observe',
        title: '定位导出缓存命中率下降原因',
        description: '需要结合 Redis 指标与导出模板变更记录继续排查。',
        assignee: '平台运维',
        priority: 'high',
        status: 'doing',
        dueAt: '2026-05-28T17:30:00+08:00',
        estimateHours: 4,
        blocked: true,
      },
    ],
  },
  {
    id: 'review',
    title: '待验收',
    description: '功能已完成，等待验收或联调确认。',
    wipLimit: 2,
    cards: [
      {
        id: 'task-notification-review',
        title: '通知中心交互复核',
        description: '确认分组筛选、已读切换与浮层反馈在双端一致。',
        assignee: '产品验收',
        priority: 'medium',
        status: 'review',
        dueAt: '2026-05-29T15:00:00+08:00',
        estimateHours: 2,
      },
    ],
  },
  {
    id: 'done',
    title: '已完成',
    description: '已完成并可回看结果的任务。',
    cards: [
      {
        id: 'task-audit-page',
        title: '审计日志页联调完成',
        description:
          '后端聚合 Redis Streams，双端页面已完成 ActivityFeed 与 Timeline 验证。',
        assignee: '管理后台',
        priority: 'medium',
        status: 'done',
        dueAt: '2026-05-28T14:00:00+08:00',
        estimateHours: 3,
      },
    ],
  },
];

const PRIORITY_LABELS = {
  low: '低优先级',
  medium: '中优先级',
  high: '高优先级',
} as const;

const PRIORITY_COLORS = {
  low: 'green',
  medium: 'orange',
  high: 'red',
} as const;

export function createInitialTaskBoardColumns(): AdminTaskBoardColumn[] {
  return INITIAL_TASK_BOARD_COLUMNS.map((column) => ({
    ...column,
    cards: column.cards.map((card) => ({ ...card })),
  }));
}

export function buildTaskBoardColumnsFromTasks(
  tasks: AdminTaskBoardCard[],
): AdminTaskBoardColumn[] {
  return TASK_BOARD_COLUMN_DEFINITIONS.map((column) => ({
    ...column,
    cards: tasks
      .filter((task) => task.status === column.id)
      .map((task) => ({ ...task })),
  }));
}

export function coerceTaskBoardColumns(
  columns: TaskBoardColumn[],
): AdminTaskBoardColumn[] {
  return columns.map((column) => ({
    id: String(column.id),
    title: column.title,
    description: column.description,
    wipLimit: column.wipLimit,
    cards: column.cards.map((card) => ({
      id: String(card.id),
      title: card.title,
      description: typeof card.description === 'string' ? card.description : '',
      assignee: typeof card.assignee === 'string' ? card.assignee : '待分配',
      priority:
        card.priority === 'low' ||
        card.priority === 'medium' ||
        card.priority === 'high'
          ? card.priority
          : 'medium',
      status:
        column.id === 'backlog' ||
        column.id === 'todo' ||
        column.id === 'doing' ||
        column.id === 'review' ||
        column.id === 'done'
          ? (column.id as AdminTaskStatus)
          : 'todo',
      dueAt:
        typeof card.dueAt === 'string' ? card.dueAt : new Date().toISOString(),
      estimateHours:
        typeof card.estimateHours === 'number' ? card.estimateHours : 2,
      blocked: Boolean(card.blocked),
    })),
  }));
}

export function countTaskBoardCards(columns: AdminTaskBoardColumn[]): number {
  return columns.reduce((count, column) => count + column.cards.length, 0);
}

export function countBlockedTaskBoardCards(
  columns: AdminTaskBoardColumn[],
): number {
  return columns.reduce(
    (count, column) =>
      count + column.cards.filter((card) => card.blocked).length,
    0,
  );
}

export function countOverdueTaskBoardCards(
  columns: AdminTaskBoardColumn[],
): number {
  const now = Date.now();
  return columns.reduce(
    (count, column) =>
      count +
      column.cards.filter(
        (card) =>
          card.status !== 'done' && new Date(card.dueAt).getTime() < now,
      ).length,
    0,
  );
}

export function addTaskBoardCard(
  columns: AdminTaskBoardColumn[],
  columnId: string | number,
): AdminTaskBoardColumn[] {
  const nextCard: AdminTaskBoardCard = {
    id: `task-${Date.now()}`,
    title: '新建异步任务入口',
    description: '用于补充新的后续任务，可继续细化负责人、时限与依赖。',
    assignee: '待分配',
    priority: 'medium',
    status:
      columnId === 'backlog' ||
      columnId === 'todo' ||
      columnId === 'doing' ||
      columnId === 'review' ||
      columnId === 'done'
        ? (columnId as AdminTaskStatus)
        : 'todo',
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    estimateHours: 2,
  };

  return columns.map((column) =>
    column.id === columnId
      ? {
          ...column,
          cards: [...column.cards, nextCard],
        }
      : column,
  );
}

export function addTaskBoardColumn(
  columns: AdminTaskBoardColumn[],
): AdminTaskBoardColumn[] {
  const columnIndex = columns.length + 1;
  return [
    ...columns,
    {
      id: `custom-${columnIndex}`,
      title: `新阶段 ${columnIndex}`,
      description: '用于承接后续临时任务阶段。',
      wipLimit: 3,
      cards: [],
    },
  ];
}

export function findTaskBoardCard(
  columns: AdminTaskBoardColumn[],
  cardId: string | number,
): AdminTaskBoardCard | undefined {
  for (const column of columns) {
    const matchedCard = column.cards.find((card) => card.id === String(cardId));
    if (matchedCard) {
      return matchedCard;
    }
  }

  return undefined;
}

export function getTaskPriorityLabel(
  priority: AdminTaskBoardCard['priority'],
): string {
  return PRIORITY_LABELS[priority];
}

export function getTaskPriorityColor(priority: AdminTaskBoardCard['priority']) {
  return PRIORITY_COLORS[priority];
}

export function describeTaskMove(
  event: TaskBoardCardMoveEvent,
  columns: AdminTaskBoardColumn[],
): string {
  const card = findTaskBoardCard(columns, event.cardId);
  const fromColumn = columns.find(
    (column) => column.id === String(event.fromColumnId),
  );
  const toColumn = columns.find(
    (column) => column.id === String(event.toColumnId),
  );

  return `${card?.title ?? '任务'}：${fromColumn?.title ?? event.fromColumnId} -> ${toColumn?.title ?? event.toColumnId}`;
}
