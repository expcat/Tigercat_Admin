import { useCallback, useMemo, useState } from 'react';
import type {
  TaskBoardCard,
  TaskBoardCardMoveEvent,
  TaskBoardColumn,
  TaskBoardColumnMoveEvent,
} from '@expcat/tigercat-core';
import {
  Button,
  Card,
  Input,
  Tag,
  TaskBoard,
  Text,
  notification,
} from '@expcat/tigercat-react';
import { PageHeader } from '../components/PageHeader';
import { ClipboardIcon, ClockIcon, ZapIcon } from '../components/Icons';
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
  getTaskPriorityLabel,
} from '../utils/task-board';
import type { AdminTaskBoardColumn } from '../utils/types';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function TasksPage() {
  const [filterText, setFilterText] = useState('');
  const [columns, setColumns] = useState<AdminTaskBoardColumn[]>(() =>
    createInitialTaskBoardColumns(),
  );
  const [lastAction, setLastAction] = useState(
    '当前使用本地任务数据验证后续异步任务入口。',
  );

  const totalCount = useMemo(() => countTaskBoardCards(columns), [columns]);
  const blockedCount = useMemo(
    () => countBlockedTaskBoardCards(columns),
    [columns],
  );
  const overdueCount = useMemo(
    () => countOverdueTaskBoardCards(columns),
    [columns],
  );

  const handleColumnsChange = useCallback((nextColumns: TaskBoardColumn[]) => {
    setColumns(coerceTaskBoardColumns(nextColumns));
  }, []);

  const handleCardAdd = useCallback((columnId: string | number) => {
    setColumns((prev) => addTaskBoardCard(prev, columnId));
    setLastAction(`已在 ${columnId} 阶段新增任务卡片。`);
    notification.success({
      title: '已新增任务卡片',
      description: '你可以继续拖拽到其他阶段，验证异步任务流转。',
    });
  }, []);

  const handleColumnAdd = useCallback(() => {
    setColumns((prev) => addTaskBoardColumn(prev));
    setLastAction('已新增临时阶段，可用于后续任务分流。');
    notification.info({
      title: '已新增阶段',
      description: 'TaskBoard 已成功验证增列能力。',
    });
  }, []);

  const handleCardMove = useCallback(
    (event: TaskBoardCardMoveEvent) => {
      const description = describeTaskMove(event, columns);
      setLastAction(description);
      notification.info({
        title: '任务阶段已更新',
        description,
      });
    },
    [columns],
  );

  const handleColumnMove = useCallback((event: TaskBoardColumnMoveEvent) => {
    const description = `阶段顺序已调整：${event.columnId} 从 ${event.fromIndex + 1} 移动到 ${event.toIndex + 1}`;
    setLastAction(description);
    notification.info({
      title: '阶段顺序已更新',
      description,
    });
  }, []);

  const handleResetBoard = useCallback(() => {
    setColumns(createInitialTaskBoardColumns());
    setFilterText('');
    setLastAction('任务面板已重置到初始状态。');
  }, []);

  const beforeCardMove = useCallback(
    (event: TaskBoardCardMoveEvent) => {
      if (event.toColumnId !== 'done') {
        return true;
      }

      const currentCard = findTaskBoardCard(columns, event.cardId);
      if (!currentCard?.blocked) {
        return true;
      }

      setLastAction(
        `已阻止 ${currentCard.title} 进入已完成：存在阻塞项未清理。`,
      );
      notification.warning({
        title: '任务仍被阻塞',
        description: '请先清除阻塞状态，再移动到已完成。',
      });
      return false;
    },
    [columns],
  );

  const renderCard = useCallback((card: TaskBoardCard) => {
    const currentCard = card as unknown as {
      assignee?: string;
      priority?: 'low' | 'medium' | 'high';
      dueAt?: string;
      estimateHours?: number;
      blocked?: boolean;
    };

    return (
      <div className="space-y-3">
        <div>
          <Text weight="bold">{card.title}</Text>
          {card.description && (
            <Text size="sm" color="secondary" className="mt-1">
              {card.description}
            </Text>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {currentCard.priority && (
            <Tag color={getTaskPriorityColor(currentCard.priority)} size="sm">
              {getTaskPriorityLabel(currentCard.priority)}
            </Tag>
          )}
          {currentCard.blocked && (
            <Tag color="red" size="sm">
              阻塞中
            </Tag>
          )}
          <Tag color="blue" size="sm">
            {currentCard.assignee ?? '待分配'}
          </Tag>
        </div>

        <Text size="sm" color="secondary">
          截止 {currentCard.dueAt ? formatDateTime(currentCard.dueAt) : '--'} ·
          预估 {currentCard.estimateHours ?? 0}h
        </Text>
      </div>
    );
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="任务面板"
        subtitle="用 TaskBoard 把后续异步任务做成可拖拽的阶段看板，验证增列、加卡片、WIP 与移动规则。"
        icon={<ClipboardIcon size={24} className="text-white" />}
        tags={[
          { label: 'TaskBoard', color: 'blue' },
          { label: 'DragDrop', color: 'orange' },
          { label: 'WIP', color: 'green' },
        ]}
      />

      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Text weight="bold">异步任务入口</Text>
            <Text size="sm" color="secondary">
              当前仍是前端本地任务数据，后续可以直接替换成导出任务、审计处理或系统巡检的真实后端任务源。
            </Text>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={filterText}
              placeholder="搜索任务标题或说明"
              onChange={(value) => setFilterText(String(value ?? ''))}
            />
            <Button variant="outline" onClick={handleResetBoard}>
              重置看板
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <ClipboardIcon size={20} />
            </div>
            <div>
              <Text weight="bold">任务总数</Text>
              <Text size="sm" color="secondary">
                当前看板共 {totalCount} 个异步任务。
              </Text>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <ClockIcon size={20} />
            </div>
            <div>
              <Text weight="bold">超期任务</Text>
              <Text size="sm" color="secondary">
                还有 {overdueCount} 个任务超过计划时间。
              </Text>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <ZapIcon size={20} />
            </div>
            <div>
              <Text weight="bold">阻塞项</Text>
              <Text size="sm" color="secondary">
                当前有 {blockedCount} 个任务被阻塞，不能直接移动到已完成。
              </Text>
            </div>
          </div>
        </Card>
      </div>

      <Card title="任务流转验证">
        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-hover,#f8fafc) p-4">
          <Text weight="bold">最近动作</Text>
          <Text size="sm" color="secondary">
            {lastAction}
          </Text>
        </div>

        <TaskBoard
          columns={columns}
          filterText={filterText}
          showCardCount
          allowAddCard
          allowAddColumn
          enforceWipLimit
          onColumnsChange={handleColumnsChange}
          onCardAdd={handleCardAdd}
          onColumnAdd={handleColumnAdd}
          onCardMove={handleCardMove}
          onColumnMove={handleColumnMove}
          beforeCardMove={beforeCardMove}
          renderCard={renderCard}
        />
      </Card>
    </div>
  );
}

export default TasksPage;
