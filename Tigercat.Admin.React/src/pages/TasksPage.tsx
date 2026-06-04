import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Modal,
  Select,
  Tag,
  Text,
  notification,
} from '@expcat/tigercat-react';
import { TaskBoard } from '@expcat/tigercat-react/TaskBoard';
import { PageHeader } from '../components/PageHeader';
import { ClipboardIcon, ClockIcon, ZapIcon } from '../components/Icons';
import {
  MetricCard,
  MetricGrid,
  MutedPanel,
  PageActionPanel,
} from '../components/PageFragments';
import {
  buildTaskBoardColumnsFromTasks,
  coerceTaskBoardColumns,
  countBlockedTaskBoardCards,
  countOverdueTaskBoardCards,
  countTaskBoardCards,
  describeTaskMove,
  findTaskBoardCard,
  getTaskPriorityColor,
  getTaskPriorityLabel,
} from '../utils/task-board';
import { apiRequest, getAuthHeaders, normalizeInput } from '../utils';
import type {
  AdminTaskBoardCard,
  AdminTaskBoardColumn,
  PagedResult,
} from '../utils/types';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function TasksPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [filterText, setFilterText] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [blockedFilter, setBlockedFilter] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [columns, setColumns] = useState<AdminTaskBoardColumn[]>([]);
  const [selectedTask, setSelectedTask] = useState<AdminTaskBoardCard | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState(
    '任务面板正在读取后端工作流数据。',
  );

  const loadTasks = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ page: '1', pageSize: '200' });
      if (filterText.trim()) {
        params.set('keyword', filterText.trim());
      }
      if (assigneeFilter.trim()) {
        params.set('assignee', assigneeFilter.trim());
      }
      if (blockedFilter) {
        params.set('blocked', blockedFilter);
      }
      if (dueFrom.trim()) {
        params.set('dueFrom', new Date(dueFrom).toISOString());
      }
      if (dueTo.trim()) {
        params.set('dueTo', new Date(`${dueTo}T23:59:59`).toISOString());
      }

      const payload = await apiRequest<PagedResult<AdminTaskBoardCard>>(
        `/api/tasks?${params}`,
        { headers: getAuthHeaders() },
      );
      const nextColumns = buildTaskBoardColumnsFromTasks(payload.data.items);
      setColumns(nextColumns);
      setSelectedTask((current) => {
        const queryTaskId = new URLSearchParams(location.search).get('taskId');
        const targetId = queryTaskId ?? current?.id;
        const target = targetId ? findTaskBoardCard(nextColumns, targetId) : null;
        if (queryTaskId && target) {
          setDetailOpen(true);
        }
        return target ?? current;
      });
      setLastAction(`已同步 ${payload.data.total} 个后端任务。`);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : '任务加载失败，请稍后重试。';
      setLastAction(message);
      notification.error({
        title: '任务加载失败',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [assigneeFilter, blockedFilter, dueFrom, dueTo, filterText, location.search]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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

  const handleCardAdd = useCallback(
    async (columnId: string | number) => {
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
            blocked: false,
          }),
        });
        await loadTasks();
        setLastAction(`已在 ${columnId} 阶段新增后端任务。`);
        notification.success({
          title: '已新增任务',
          description: '任务已保存到后端工作流。',
        });
      } catch (error) {
        notification.error({
          title: '新增任务失败',
          description: error instanceof Error ? error.message : '请稍后重试。',
        });
      }
    },
    [loadTasks],
  );

  const handleColumnAdd = useCallback(() => {
    notification.info({
      title: '阶段由后端模型固定',
      description: '当前任务状态包含需求池、待执行、执行中、待验收和已完成。',
    });
  }, []);

  const handleCardMove = useCallback(
    async (event: TaskBoardCardMoveEvent) => {
      const description = describeTaskMove(event, columns);
      setLastAction(description);
      try {
        await apiRequest<AdminTaskBoardCard>(
          `/api/tasks/${event.cardId}/status`,
          {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: String(event.toColumnId) }),
          },
        );
        await loadTasks();
        notification.info({
          title: '任务阶段已更新',
          description,
        });
      } catch (error) {
        await loadTasks();
        notification.error({
          title: '任务流转失败',
          description: error instanceof Error ? error.message : '请稍后重试。',
        });
      }
    },
    [columns, loadTasks],
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
    setFilterText('');
    setAssigneeFilter('');
    setBlockedFilter('');
    setDueFrom('');
    setDueTo('');
    loadTasks();
  }, [loadTasks]);

  const openTaskDetail = useCallback(
    (card: AdminTaskBoardCard) => {
      setSelectedTask(card);
      setCompletionNote(card.completionNote ?? '');
      setDetailOpen(true);
      navigate(`/tasks?taskId=${encodeURIComponent(card.id)}`, { replace: true });
    },
    [navigate],
  );

  const closeTaskDetail = useCallback(() => {
    setDetailOpen(false);
    navigate('/tasks', { replace: true });
  }, [navigate]);

  const handleCompleteTask = useCallback(async () => {
    if (!selectedTask) {
      return;
    }

    if (selectedTask.blocked || selectedTask.status === 'done') {
      notification.warning({
        title: selectedTask.blocked ? '任务仍被阻塞' : '任务已完成',
        description: selectedTask.blocked
          ? '请先清除阻塞状态，再确认完成。'
          : '已完成任务无需重复确认。',
      });
      return;
    }

    setCompleting(true);
    try {
      const payload = await apiRequest<AdminTaskBoardCard>(
        `/api/tasks/${selectedTask.id}/complete`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            confirm: true,
            completionNote,
          }),
        },
      );
      setSelectedTask(payload.data);
      await loadTasks();
      notification.success({
        title: '任务已完成',
        description: payload.data.title,
      });
    } catch (error) {
      notification.error({
        title: '任务完成失败',
        description: error instanceof Error ? error.message : '请稍后重试。',
      });
    } finally {
      setCompleting(false);
    }
  }, [completionNote, loadTasks, selectedTask]);

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
          blockedReason?: string | null;
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

        {currentCard.blockedReason && (
          <Text size="sm" color="danger">
            {currentCard.blockedReason}
          </Text>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => openTaskDetail(card as AdminTaskBoardCard)}>
          详情
        </Button>
      </div>
    );
  }, [openTaskDetail]);

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

      <PageActionPanel
        title="异步任务入口"
        description="当前任务来自后端模型，创建、负责人、截止时间和状态流转会持久化并写入审计事件。"
        actions={
          <>
            <Input
              value={filterText}
              placeholder="搜索任务标题或说明"
              onChange={(event) => setFilterText(normalizeInput(event))}
            />
            <Input
              value={assigneeFilter}
              placeholder="负责人"
              onChange={(event) => setAssigneeFilter(normalizeInput(event))}
            />
            <Input
              value={dueFrom}
              type="date"
              placeholder="开始日期"
              onChange={(event) => setDueFrom(normalizeInput(event))}
            />
            <Input
              value={dueTo}
              type="date"
              placeholder="结束日期"
              onChange={(event) => setDueTo(normalizeInput(event))}
            />
            <Select
              value={blockedFilter}
              options={[
                { label: '全部阻塞状态', value: '' },
                { label: '仅阻塞', value: 'true' },
                { label: '未阻塞', value: 'false' },
              ]}
              clearable={false}
              onChange={(value) => setBlockedFilter(String(value ?? ''))}
            />
            <Button variant="outline" onClick={handleResetBoard}>
              刷新看板
            </Button>
          </>
        }
      />

      <MetricGrid>
        <MetricCard
          title="任务总数"
          description={`当前看板共 ${totalCount} 个异步任务。`}
          icon={<ClipboardIcon size={20} />}
        />
        <MetricCard
          title="超期任务"
          description={`还有 ${overdueCount} 个任务超过计划时间。`}
          icon={<ClockIcon size={20} />}
        />
        <MetricCard
          title="阻塞项"
          description={`当前有 ${blockedCount} 个任务被阻塞，不能直接移动到已完成。`}
          icon={<ZapIcon size={20} />}
        />
      </MetricGrid>

      <Card title="任务流转验证">
        <MutedPanel
          className="mb-4"
          title="最近动作"
          description={loading ? '正在同步后端任务...' : lastAction}
        />

        <TaskBoard
          columns={columns}
          filterText={filterText}
          showCardCount
          allowAddCard
          allowAddColumn={false}
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

      <Modal
        open={detailOpen}
        title="任务详情"
        showDefaultFooter
        okText={completing ? '完成中...' : '确认完成'}
        cancelText="关闭"
        confirmLoading={completing}
        onOk={handleCompleteTask}
        onCancel={closeTaskDetail}>
        {selectedTask ? (
          <div className="space-y-4">
            <div>
              <Text weight="bold">{selectedTask.title}</Text>
              {selectedTask.description && (
                <Text color="secondary" className="mt-1">
                  {selectedTask.description}
                </Text>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MutedPanel title="负责人" description={selectedTask.assignee} />
              <MutedPanel title="截止时间" description={formatDateTime(selectedTask.dueAt)} />
              <MutedPanel title="当前状态" description={selectedTask.status} />
              <MutedPanel title="预估工时" description={`${selectedTask.estimateHours}h`} />
            </div>
            {selectedTask.blocked && (
              <MutedPanel
                title="阻塞原因"
                description={selectedTask.blockedReason ?? '暂无阻塞说明'}
              />
            )}
            {selectedTask.completionNote && (
              <MutedPanel title="完成说明" description={selectedTask.completionNote} />
            )}
            <Input
              value={completionNote}
              placeholder="完成说明"
              disabled={selectedTask.blocked || selectedTask.status === 'done'}
              onChange={(event) => setCompletionNote(normalizeInput(event))}
            />
            {selectedTask.blocked && (
              <Text color="danger">阻塞任务需要先清除阻塞状态，才能确认完成。</Text>
            )}
          </div>
        ) : (
          <Text color="secondary">请选择任务。</Text>
        )}
      </Modal>
    </div>
  );
}

export default TasksPage;
