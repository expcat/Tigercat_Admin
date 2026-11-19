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

const PRIORITY_LABELS = {
  low: '低优先级',
  medium: '中优先级',
  high: '高优先级',
} as const;

const PRIORITY_VARIANTS = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
} as const;

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
      blockedReason:
        typeof card.blockedReason === 'string' ? card.blockedReason : null,
      completionNote:
        typeof card.completionNote === 'string' ? card.completionNote : null,
      createdBy: typeof card.createdBy === 'string' ? card.createdBy : null,
      createdAt:
        typeof card.createdAt === 'string' ? card.createdAt : undefined,
      updatedAt: typeof card.updatedAt === 'string' ? card.updatedAt : null,
      completedAt:
        typeof card.completedAt === 'string' ? card.completedAt : null,
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

export function focusTaskBoardCard(cardId: string | number) {
  const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(String(cardId))
    : String(cardId);
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('.tiger-task-board [data-tiger-taskboard-card-id="' + escaped + '"]')?.focus();
  });
}

export function getTaskPriorityLabel(
  priority: AdminTaskBoardCard['priority'],
): string {
  return PRIORITY_LABELS[priority];
}

export function getTaskPriorityVariant(priority: AdminTaskBoardCard['priority']) {
  return PRIORITY_VARIANTS[priority];
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
