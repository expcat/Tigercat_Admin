import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type {
  InputType,
  TaskBoardCard,
  TaskBoardCardMoveEvent,
  TaskBoardColumn,
  TaskBoardColumnMoveEvent,
} from '@expcat/tigercat-core';
import { notification } from '@expcat/tigercat-react/notification';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Input } from '@expcat/tigercat-react/Input';
import { Modal } from '@expcat/tigercat-react/Modal';
import { Select } from '@expcat/tigercat-react/Select';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { TaskBoard } from '../utils/lazyTigercat';
import { usePermission } from '../utils/permission';
import { ApiError } from '../utils/request';
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
  getTaskPriorityVariant,
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
  const { has } = usePermission();
  const canView = has('task:view');
  const canCreate = has('task:create');
  const canEdit = has('task:edit');
  const queryTaskId = new URLSearchParams(location.search).get('taskId');
  const detailOpen = queryTaskId !== null;
  const queryTaskIdRef = useRef(queryTaskId);
  queryTaskIdRef.current = queryTaskId;
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [serverTotal, setServerTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const listRequest = useRef<AbortController | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const mutationPending = useRef(false);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState(
    '任务面板正在读取后端工作流数据。',
  );

  const loadTasks = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setLoading(true);
    setLoadError('');
    setColumns([]);
    setServerTotal(0);
    try {
      if (!canView) throw new Error('无权查看任务面板。');
      if (dueFrom && dueTo && dueFrom > dueTo) throw new Error('开始日期不能晚于结束日期。');
      const params = new URLSearchParams({ page: '1', pageSize: '200' });
      if (filterText.trim()) params.set('keyword', filterText.trim());
      if (assigneeFilter.trim()) params.set('assignee', assigneeFilter.trim());
      if (blockedFilter) params.set('blocked', blockedFilter);
      if (dueFrom) params.set('dueFrom', new Date(`${dueFrom}T00:00:00`).toISOString());
      if (dueTo) params.set('dueTo', new Date(`${dueTo}T23:59:59.999`).toISOString());
      const payload = await apiRequest<PagedResult<AdminTaskBoardCard>>(`/api/tasks?${params}`, {
        headers: getAuthHeaders(), signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setColumns(buildTaskBoardColumnsFromTasks(payload.data.items));
      setServerTotal(payload.data.total);
      setLastAction(`已加载 ${payload.data.items.length} / ${payload.data.total} 个匹配任务，最多显示前 200 条。`);
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : '任务加载失败，请重试。');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [assigneeFilter, blockedFilter, dueFrom, dueTo, filterText, canView]);

  const loadTaskDetail = useCallback(async () => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setSelectedTask(null);
    setCompletionNote('');
    setDetailError('');
    setDetailLoading(queryTaskId !== null);
    if (queryTaskId === null) return;
    try {
      if (!queryTaskId.trim()) throw new Error('缺少任务编号');
      if (!canView) throw new Error('无权查看该任务');
      const payload = await apiRequest<AdminTaskBoardCard>(`/api/tasks/${encodeURIComponent(queryTaskId)}`, {
        headers: getAuthHeaders(), signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setSelectedTask(payload.data);
      setCompletionNote(payload.data.completionNote ?? '');
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof ApiError && error.status === 404 ? '任务不存在或已被移除'
        : error instanceof ApiError && error.status === 403 ? '无权查看该任务'
        : error instanceof Error ? error.message : '任务详情加载失败，请重试';
      setDetailError(`${message}（ID：${queryTaskId || '空'}）`);
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }, [queryTaskId, canView]);

  useEffect(() => { void loadTasks(); return () => listRequest.current?.abort(); }, [loadTasks]);
  useEffect(() => { void loadTaskDetail(); return () => detailRequest.current?.abort(); }, [loadTaskDetail]);

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
      if (!canCreate || mutationPending.current || loading) return;
      const column = columns.find(item => item.id === String(columnId));
      if (column?.wipLimit && column.cards.length >= column.wipLimit) {
        notification.warning({ title: '已达到 WIP 限制', description: '请先完成或移出当前视图中的任务。' });
        return;
      }
      mutationPending.current = true;
      setSaving(true);
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
      } finally {
        mutationPending.current = false;
        setSaving(false);
      }
    },
    [loadTasks, canCreate, loading, columns],
  );

  const handleColumnAdd = useCallback(() => {
    notification.info({
      title: '阶段由后端模型固定',
      description: '当前任务状态包含需求池、待执行、执行中、待验收和已完成。',
    });
  }, []);

  const handleCardMove = useCallback(
    async (event: TaskBoardCardMoveEvent) => {
      if (!canEdit || mutationPending.current) return;
      mutationPending.current = true;
      setSaving(true);
      const description = describeTaskMove(event, columns);
      setLastAction(description);
      try {
        await apiRequest<AdminTaskBoardCard>(
          `/api/tasks/${encodeURIComponent(event.cardId)}/status`,
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
      } finally {
        mutationPending.current = false;
        setSaving(false);
      }
    },
    [columns, loadTasks, canEdit],
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
    void loadTasks();
    if (detailOpen) void loadTaskDetail();
  }, [loadTasks, loadTaskDetail, detailOpen]);

  const openTaskDetail = useCallback((card: AdminTaskBoardCard) => {
    detailTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    navigate(`/tasks?taskId=${encodeURIComponent(card.id)}`, { replace: true });
  }, [navigate]);

  const closeTaskDetail = useCallback(() => {
    if (!mutationPending.current) navigate('/tasks', { replace: true });
  }, [navigate]);

  const handleCompleteTask = useCallback(async () => {
    if (!canEdit || mutationPending.current || !selectedTask) {
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

    mutationPending.current = true;
    setCompleting(true);
    try {
      const payload = await apiRequest<AdminTaskBoardCard>(
        `/api/tasks/${encodeURIComponent(selectedTask.id)}/complete`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            confirm: true,
            completionNote,
          }),
        },
      );
      if (queryTaskIdRef.current === payload.data.id) setSelectedTask(payload.data);
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
      mutationPending.current = false;
      setCompleting(false);
    }
  }, [completionNote, loadTasks, selectedTask, canEdit]);

  const beforeCardMove = useCallback(
    (event: TaskBoardCardMoveEvent) => {
      if (!canEdit || loading || mutationPending.current) return false;
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
    [columns, canEdit, loading],
  );

  const renderCard = useCallback(({ card }: { card: TaskBoardCard; column: TaskBoardColumn; isDragging: boolean }) => {
    const currentCard = card as unknown as AdminTaskBoardCard;

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
            <Tag variant={getTaskPriorityVariant(currentCard.priority)} size="sm">
              {getTaskPriorityLabel(currentCard.priority)}
            </Tag>
          )}
          {currentCard.blocked && (
            <Tag variant="danger" size="sm">
              阻塞中
            </Tag>
          )}
          <Tag variant="primary" size="sm">
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
          onClick={() => openTaskDetail(card as unknown as AdminTaskBoardCard)}>
          详情
        </Button>
      </div>
    );
  }, [openTaskDetail]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="任务面板"
        subtitle="查看任务、按条件筛选，并流转阶段或确认完成。"
        icon={<ClipboardIcon size={24} className="text-white" />}
        tags={[
          { label: 'TaskBoard', variant: 'primary' },
          { label: 'DragDrop', variant: 'warning' },
          { label: 'WIP', variant: 'success' },
        ]}
      />

      <PageActionPanel
        title="异步任务入口"
        description="当前任务来自后端模型，创建、负责人、截止时间和状态流转会持久化并写入审计事件。"
        actions={
          <>
            <Input
              value={filterText}
              disabled={saving || completing}
              placeholder="搜索任务标题或说明"
              className="w-full sm:w-64"
              onChange={(event) => setFilterText(normalizeInput(event))}
            />
            <Input
              value={assigneeFilter}
              disabled={saving || completing}
              placeholder="负责人（包含匹配）"
              className="w-full sm:w-40"
              onChange={(event) => setAssigneeFilter(normalizeInput(event))}
            />
            <Input
              value={dueFrom}
              disabled={saving || completing}
              type={'date' as unknown as InputType}
              placeholder="开始日期"
              aria-label="开始日期"
              className="w-full sm:w-44"
              onChange={(event) => setDueFrom(normalizeInput(event))}
            />
            <Input
              value={dueTo}
              disabled={saving || completing}
              type={'date' as unknown as InputType}
              placeholder="结束日期"
              aria-label="结束日期"
              className="w-full sm:w-44"
              onChange={(event) => setDueTo(normalizeInput(event))}
            />
            <Select
              value={blockedFilter}
              disabled={saving || completing}
              options={[
                { label: '全部阻塞状态', value: '' },
                { label: '仅阻塞', value: 'true' },
                { label: '未阻塞', value: 'false' },
              ]}
              clearable={false}
              className="w-full sm:w-44"
              onChange={(value) => setBlockedFilter(String(value ?? ''))}
            />
            <Button variant="outline" data-testid="tasks-refresh" disabled={saving || completing} onClick={handleResetBoard}>
              刷新看板
            </Button>
          </>
        }
      />

      <MetricGrid>
        <MetricCard
          title="任务总数"
          value={loading || loadError ? '—' : serverTotal}
          description={`当前显示 ${totalCount} 条；统计与 WIP 限于已加载任务。`}
          icon={<ClipboardIcon size={20} />}
        />
        <MetricCard
          title="超期任务"
          description={`已加载任务中有 ${overdueCount} 个超过计划时间。`}
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

        {loadError ? <div role="alert" className="space-y-3"><Text color="danger">{loadError}</Text><Button variant="outline" onClick={handleResetBoard}>重试任务列表</Button></div> : <TaskBoard
          columns={columns as unknown as TaskBoardColumn[]}
          showCardCount
          allowAddCard={canCreate && !loading && !saving && !completing}
          draggable={canEdit && !loading && !saving && !completing}
          columnDraggable={!loading && !saving && !completing}
          allowAddColumn={false}
          enforceWipLimit
          onColumnsChange={handleColumnsChange}
          onCardAdd={canCreate && !loading && !saving && !completing ? handleCardAdd : undefined}
          onColumnAdd={handleColumnAdd}
          onCardMove={handleCardMove}
          onColumnMove={handleColumnMove}
          beforeCardMove={beforeCardMove}
          renderCard={renderCard}
        />}
        {!loading && !loadError && totalCount === 0 && <Text color="secondary">没有符合条件的任务。</Text>}
      </Card>

      <Modal
        open={detailOpen}
        title="任务详情"
        maskClosable={!completing}
        keyboard={!completing}
        closable={!completing}
        onOpenChange={(open) => { if (!open) closeTaskDetail(); }}
        onCancel={closeTaskDetail}
        onAfterClose={() => (detailTrigger.current?.isConnected ? detailTrigger.current : document.querySelector<HTMLElement>('[data-testid="tasks-refresh"]'))?.focus()}
        footer={<><Button variant="outline" disabled={completing} onClick={closeTaskDetail}>关闭</Button>{selectedTask && canEdit && <Button disabled={completing || selectedTask.blocked || selectedTask.status === 'done'} onClick={() => void handleCompleteTask()}>{completing ? '完成中...' : '确认完成'}</Button>}</>}
      >
        {detailLoading ? <Text>正在加载任务 {queryTaskId}…</Text> : detailError ? <div role="alert" className="space-y-3"><Text color="danger">{detailError}</Text><Button variant="outline" onClick={() => void loadTaskDetail()}>重试任务详情</Button></div> : null}
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
              aria-label="完成说明"
              maxLength={500}
              disabled={!canEdit || completing || selectedTask.blocked || selectedTask.status === 'done'}
              onChange={(event) => setCompletionNote(normalizeInput(event))}
            />
            {selectedTask.blocked && (
              <Text color="danger">阻塞任务需要先清除阻塞状态，才能确认完成。</Text>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default TasksPage;
