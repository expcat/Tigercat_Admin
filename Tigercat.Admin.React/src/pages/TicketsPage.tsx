import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@expcat/tigercat-react/Button';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Pagination } from '@expcat/tigercat-react/Pagination';
import { Empty } from '@expcat/tigercat-react/Empty';
import { Card } from '@expcat/tigercat-react/Card';
import { Input } from '@expcat/tigercat-react/Input';
import { Message } from '@expcat/tigercat-react/Message';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { Splitter } from '@expcat/tigercat-react/Splitter';
import { Resizable } from '@expcat/tigercat-react/Resizable';
import { Steps, StepsItem } from '@expcat/tigercat-react/Steps';
import { ChatWindow } from '@expcat/tigercat-react/ChatWindow';
import { CommentThread } from '@expcat/tigercat-react/CommentThread';
import { Mentions } from '@expcat/tigercat-react/Mentions';
import { Descriptions } from '@expcat/tigercat-react/Descriptions';
import { Rate } from '@expcat/tigercat-react/Rate';
import { Drawer } from '@expcat/tigercat-react/Drawer';
import { Popover } from '@expcat/tigercat-react/Popover';
import { Textarea } from '@expcat/tigercat-react/Textarea';
import { RadioGroup } from '@expcat/tigercat-react/RadioGroup';
import { Radio } from '@expcat/tigercat-react/Radio';
import { Divider } from '@expcat/tigercat-react/Divider';
import { WorkflowActionBar, WorkflowTimeline } from '@expcat/tigercat-react/WorkflowTimeline';
import type {
  ChatMessage,
  CommentNode,
  MentionOption,
  DescriptionsItem,
  TagVariant,
  BadgeVariant,
  WorkflowActionBarItem,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';
import { HelpIcon, PlusIcon, TicketIcon } from '../components/Icons';
import {
  createTicket,
  fetchTicket,
  fetchTickets,
  getTicketWorkflowSteps,
  nextTicketStatusForWorkflow,
  sendTicketMessage,
  TICKET_WORKFLOW_ACTIONS,
  updateTicket,
} from '../utils/tickets';
import { ApiError } from '../utils/request';
import { createComment, fetchComments } from '../utils/comments';
import { fetchRelatedApproval } from '../utils/approvals';
import type { CommentItem, Ticket, TicketPriority, TicketStatus } from '../utils/types';

interface TicketView extends Ticket {
  notes: CommentNode[];
}

const toCommentNodes = (items: CommentItem[]): CommentNode[] => items as CommentNode[];

const toTicketView = (ticket: Ticket, notes: CommentNode[] = []): TicketView => ({
  ...ticket,
  messages: ticket.messages ?? [],
  notes,
});

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const LIFECYCLE = ['已创建', '已受理', '处理中', '已解决', '已关闭'];
const STATUS_META: Record<TicketStatus, { label: string; variant: TagVariant; step: number }> = {
  open: { label: '待受理', variant: 'warning', step: 0 },
  accepted: { label: '已受理', variant: 'info', step: 1 },
  progress: { label: '处理中', variant: 'primary', step: 2 },
  resolved: { label: '已解决', variant: 'success', step: 3 },
  closed: { label: '已关闭', variant: 'default', step: 4 },
};
const PRIORITY_META: Record<TicketPriority, { label: string; variant: TagVariant }> = {
  high: { label: '高', variant: 'danger' },
  medium: { label: '中', variant: 'warning' },
  low: { label: '低', variant: 'info' },
};
const CHAT_STATUS: Record<TicketStatus, { text: string; variant: BadgeVariant }> = {
  open: { text: '工单待受理', variant: 'warning' },
  accepted: { text: '工单已受理', variant: 'info' },
  progress: { text: '工单进行中', variant: 'primary' },
  resolved: { text: '工单已解决', variant: 'success' },
  closed: { text: '工单已关闭', variant: 'default' },
};

const assignees: MentionOption[] = [
  { value: '王小虎', label: '王小虎 · 前端' },
  { value: '李工', label: '李工 · 后端' },
  { value: '张运维', label: '张运维 · 运维' },
  { value: '陈测试', label: '陈测试 · 测试' },
];

const statusFilters: { value: 'all' | TicketStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '待受理' },
  { value: 'accepted', label: '已受理' },
  { value: 'progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
];

/** ChatWindow fills this box; textarea resize would fight the Resizable bottom handle. */
const TICKET_CHAT_WINDOW_CLASS = 'h-full min-h-0 [&_textarea]:resize-none';

function TicketsPage() {
  const listController = useRef<AbortController | null>(null);
  const detailController = useRef<AbortController | null>(null);
  const actingRef = useRef(false);
  const creatingRef = useRef(false);
  const [selected, setSelected] = useState<TicketView | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [detailError, setDetailError] = useState('');
  const [notesError, setNotesError] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [acting, setActing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedTicketId = searchParams.get('ticket') ?? '';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [relatedApprovalId, setRelatedApprovalId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: '缺陷',
    priority: 'medium' as TicketPriority,
    description: '',
  });

  // 响应式：宽屏左右分栏，窄屏上下分栏
  const [isWide, setIsWide] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsWide(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  const filteredTickets = tickets;
  const openCount = tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length;

  const updateTicketView = (ticket: Ticket) => {
    setTickets((prev) => prev.map((item) => item.id === ticket.id ? toTicketView(ticket, item.notes) : item));
    setSelected((prev) => prev?.id === ticket.id ? toTicketView(ticket, prev.notes) : prev);
  };

  const loadNotes = useCallback(async (id: string, signal?: AbortSignal) => {
    setNotesError('');
    setNotesLoading(true);
    try {
      const payload = await fetchComments('ticket', id, signal);
      if (signal?.aborted) return;
      setSelected((prev) => prev?.id === id ? { ...prev, notes: toCommentNodes(payload.data ?? []) } : prev);
    } catch (error) {
      if (!signal?.aborted) setNotesError(readErrorMessage(error, '内部备注加载失败'));
    } finally {
      if (!signal?.aborted) setNotesLoading(false);
    }
  }, []);

  const loadTicketDetail = useCallback(async (id: string) => {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setSelectedId(id);
    setSelected(null);
    setDraft('');
    setNoteDraft('');
    setDetailError('');
    setNotesError('');
    setDetailLoading(true);
    try {
      const payload = await fetchTicket(id, controller.signal);
      if (controller.signal.aborted) return;
      setSelected(toTicketView(payload.data));
      void loadNotes(id, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return;
      setDetailError(error instanceof ApiError && error.status === 404 ? `没有找到工单 ${id}`
        : error instanceof ApiError && error.status === 403 ? '当前账号无权查看该工单'
        : readErrorMessage(error, '工单详情加载失败'));
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }, [loadNotes]);

  const loadTickets = useCallback(async () => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    setLoading(true);
    setErrorMessage('');
    setTickets([]);
    setTotal(0);
    try {
      const payload = await fetchTickets({ page, pageSize: 50, status: statusFilter, keyword }, controller.signal);
      if (controller.signal.aborted) return;
      const items = payload.data.items ?? [];
      const lastPage = Math.max(1, Math.ceil(payload.data.total / 50));
      if (page > lastPage) { setPage(lastPage); return; }
      setTickets(items.map((item) => toTicketView(item)));
      setTotal(payload.data.total);
      if (!requestedTicketId && items[0]) navigate(`/tickets?ticket=${encodeURIComponent(items[0].id)}`, { replace: true });
    } catch (error) {
      if (!controller.signal.aborted) setErrorMessage(readErrorMessage(error, '工单列表加载失败'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [keyword, page, statusFilter, requestedTicketId, navigate]);

  useEffect(() => {
    void loadTickets();
    return () => listController.current?.abort();
  }, [loadTickets]);
  useEffect(() => {
    if (requestedTicketId) void loadTicketDetail(requestedTicketId);
    else { setSelected(null); setSelectedId(null); }
    return () => detailController.current?.abort();
  }, [requestedTicketId, loadTicketDetail]);

  useEffect(() => {
    let cancelled = false;
    setRelatedApprovalId(null);
    if (!selectedId) return;
    void fetchRelatedApproval(selectedId).then((item) => {
      if (!cancelled) setRelatedApprovalId(item?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const hasActiveTicketFilters = Boolean(keyword.trim()) || statusFilter !== 'all';
  const clearTicketFilters = () => {
    setKeyword('');
    setStatusFilter('all');
    setPage(1);
  };

  const selectTicket = (id: string) => {
    if (actingRef.current) return;
    navigate(`/tickets?ticket=${encodeURIComponent(id)}`);
  };

  const drawerTriggerRef = useRef<HTMLElement | null>(null);
  const captureDrawerTrigger = () => {
    drawerTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };

  const requestClose = () => {
    captureDrawerTrigger();
    setConfirmingClose(true);
  };

  const descriptions: DescriptionsItem[] = selected
    ? [
        { label: '工单号', content: selected.id, labelClassName: 'whitespace-nowrap' },
        { label: '提交人', content: selected.requester, labelClassName: 'whitespace-nowrap' },
        { label: '分类', content: selected.category, labelClassName: 'whitespace-nowrap' },
        { label: '优先级', content: PRIORITY_META[selected.priority].label, labelClassName: 'whitespace-nowrap' },
        {
          label: '创建时间',
          content: selected.createdAt,
          labelClassName: 'whitespace-nowrap',
          contentClassName: 'break-words',
        },
        {
          label: '更新时间',
          content: selected.updatedAt,
          labelClassName: 'whitespace-nowrap',
          contentClassName: 'break-words',
        },
      ]
    : [];

  const workflowSteps = useMemo(
    () => (selected ? getTicketWorkflowSteps(selected) : []),
    [selected],
  );
  const workflowActionsDisabled =
    acting || detailLoading || selected?.status === 'resolved' || selected?.status === 'closed';

  const handleWorkflowAction = async (item: WorkflowActionBarItem) => {
    if (!selected || workflowActionsDisabled || actingRef.current) return;
    const id = selected.id;
    actingRef.current = true;
    setActing(true);
    try {
      if (item.action === 'transfer' || item.action === 'comment') {
        const text = item.action === 'transfer'
          ? '已转交（演示写回）。完整实例状态机见审批中心。'
          : '已添加评论（演示写回）。';
        const payload = await sendTicketMessage(id, text);
        updateTicketView(payload.data);
        Message.success({
          content: item.action === 'transfer' ? '已写回工单对话（转交演示）' : '已写回工单对话（评论）',
          duration: 2200,
        });
        return;
      }
      const nextStatus = nextTicketStatusForWorkflow(selected.status, item.action);
      if (!nextStatus) {
        Message.info({ content: '当前工单状态不能再流转', duration: 2200 });
        return;
      }
      const payload = await updateTicket(id, { status: nextStatus });
      updateTicketView(payload.data);
      void loadTickets();
      Message.success({ content: `已写回工单状态：${nextStatus}`, duration: 2200 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '审批动作写回失败'), duration: 3000 });
    } finally {
      actingRef.current = false;
      setActing(false);
    }
  };

  const handleSend = async (value: string) => {
    const text = value.trim();
    if (!selected || !text || actingRef.current) return;
    const id = selected.id;
    const controller = detailController.current;
    actingRef.current = true;
    setActing(true);
    try {
      const payload = await sendTicketMessage(id, text);
      if (controller !== detailController.current || controller?.signal.aborted) return;
      setDraft('');
      updateTicketView(payload.data);
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '发送工单消息失败'), duration: 3000 });
    } finally {
      actingRef.current = false;
      setActing(false);
    }
  };

  const handleAddNote = async () => {
    const text = noteDraft.trim();
    if (!selected || !text || notesLoading || notesError || actingRef.current) return;
    const id = selected.id;
    const controller = detailController.current;
    actingRef.current = true;
    setActing(true);
    try {
      const payload = await createComment({ targetType: 'ticket', targetId: id, body: text });
      if (controller !== detailController.current || controller?.signal.aborted) return;
      setSelected((prev) => prev?.id === id ? { ...prev, notes: [...prev.notes, payload.data as CommentNode] } : prev);
      setNoteDraft('');
      Message.success({ content: '已添加内部备注', duration: 2000 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '添加内部备注失败'), duration: 3000 });
    } finally {
      actingRef.current = false;
      setActing(false);
    }
  };

  const confirmClose = async () => {
    if (actingRef.current) return;
    if (!selected) {
      setConfirmingClose(false);
      return;
    }
    const id = selected.id;
    actingRef.current = true;
    setActing(true);
    try {
      const payload = await updateTicket(id, { status: 'closed' });
      updateTicketView(payload.data);
      setConfirmingClose(false);
      void loadTickets();
      Message.success({ content: '工单已关闭', duration: 2000 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '关闭工单失败'), duration: 3000 });
    } finally {
      actingRef.current = false;
      setActing(false);
    }
  };

  const openDrawer = () => {
    captureDrawerTrigger();
    setForm({ title: '', category: '缺陷', priority: 'medium', description: '' });
    setDrawerOpen(true);
  };

  const submitTicket = async () => {
    if (creatingRef.current) return;
    const title = form.title.trim();
    if (!title || title.length > 120 || form.description.length > 2000) {
      document.getElementById('ticket-title')?.focus();
      Message.warning({ content: '请填写 1–120 字标题，描述不超过 2000 字', duration: 2000 });
      return;
    }
    creatingRef.current = true;
    setCreating(true);
    try {
      const payload = await createTicket({
        title,
        category: form.category,
        priority: form.priority,
        description: form.description.trim() || '（无描述）',
      });
      setStatusFilter('all');
      setKeyword('');
      setDrawerOpen(false);
      setSelectedId(payload.data.id);
      setPage(1);
      navigate(`/tickets?ticket=${encodeURIComponent(payload.data.id)}`);
      Message.success({ content: `工单 ${payload.data.id} 已创建`, duration: 2400 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '创建工单失败'), duration: 3000 });
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const TicketLayout = isWide ? Splitter : 'div';
  const ticketChatWindow = selected ? (
    <ChatWindow
      messages={selected.messages as ChatMessage[]}
      value={draft}
      className={TICKET_CHAT_WINDOW_CLASS}
      inputRows={2}
      placeholder="回复提交人，回车发送"
      sendText="发送"
      emptyText={detailLoading ? '正在加载对话…' : '暂无对话，开始回复吧'}
      statusText={CHAT_STATUS[selected.status].text}
      statusVariant={CHAT_STATUS[selected.status].variant}
      showAvatar={false}
      showName={false}
      onChange={setDraft}
      disabled={acting}
      onSend={handleSend}
    />
  ) : null;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        icon={<TicketIcon size={24} />}
        title="工单中心"
        subtitle="跟进工单状态、对话和内部备注，并处理关联审批。"
        tags={[
          { label: '协作', variant: 'primary' },
          { label: '演示数据', variant: 'info' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Text weight="bold">工单列表</Text>
          <Text weight="bold" className="tabular-nums text-[var(--tiger-primary,#2563eb)]">
            {openCount}
          </Text>
          <Text size="sm" color="secondary">
            个本页待跟进 / 共 {total} 条
          </Text>
        </div>
        <Button onClick={openDrawer}>
          <span className="mr-1 inline-flex align-middle">
            <PlusIcon size={16} />
          </span>
          新建工单
        </Button>
      </div>

      <Card className="min-w-0 lg:overflow-hidden">
        <TicketLayout {...(isWide
          ? { orientation: 'horizontal' as const, sizes: ['28%', '72%'], min: 220, gutterSize: 8, style: { height: '640px' } }
          : { className: 'space-y-6' })}>
          {/* 左：列表 */}
          <div className="flex min-w-0 flex-col gap-3 lg:h-full lg:overflow-hidden lg:pr-1">
            <Input disabled={acting} aria-label="搜索工单" value={keyword} onChange={(v) => { setKeyword(String(v)); setPage(1); }} placeholder="搜索标题 / 提交人 / 工单号" clearable />
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`p2-filter-chip rounded-full px-3 py-1 text-xs transition-colors ${
                    statusFilter === f.value
                      ? 'bg-(--tiger-primary,#3b82f6) text-white'
                      : 'bg-(--tiger-bg-hover,#f1f5f9) text-(--tiger-text-secondary,#64748b)'
                  }`}
                  disabled={acting}
                  aria-pressed={statusFilter === f.value}
                  onClick={() => { setStatusFilter(f.value); setPage(1); }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 lg:flex-1 lg:overflow-y-auto">
              {filteredTickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    t.id === selectedId
                      ? 'border-(--tiger-primary,#3b82f6) bg-(--tiger-primary,#3b82f6)/5'
                      : 'border-(--tiger-border,#e5e7eb) hover:bg-(--tiger-bg-hover,#f1f5f9)'
                  }`}
                  disabled={acting}
                  aria-pressed={t.id === selectedId}
                  onClick={() => selectTicket(t.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <Text weight="medium" className="min-w-0 truncate">
                      {t.title}
                    </Text>
                    <Tag variant={PRIORITY_META[t.priority].variant} size="sm" className="shrink-0">
                      {PRIORITY_META[t.priority].label}
                    </Tag>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Text size="sm" color="secondary" className="truncate">
                      {t.id} · {t.requester}
                    </Text>
                    <Tag variant={STATUS_META[t.status].variant} size="sm">
                      {STATUS_META[t.status].label}
                    </Tag>
                  </div>
                </button>
              ))}

              {errorMessage ? <div role="alert"><Alert type="error" title={errorMessage} /><Button onClick={() => void loadTickets()}>重试列表</Button></div> : loading && filteredTickets.length === 0 ? (
                <MutedPanel compact description="正在加载工单…" />
              ) : (
                filteredTickets.length === 0 && (
                  <Empty
                    preset="no-results"
                    description="没有符合条件的工单，试试调整筛选或搜索关键词。"
                    extra={
                      hasActiveTicketFilters ? (
                        <Button size="sm" variant="outline" onClick={clearTicketFilters}>
                          清除筛选
                        </Button>
                      ) : null
                    }
                  />
                )
              )}
            </div>
            <Pagination current={page} pageSize={50} total={total} disabled={acting} onChange={(current) => setPage(current)} />
          </div>

          {/* 桌面详情内滚；窄屏随主区滚动，操作条保持在可视区底部。 */}
          <div
            className="flex min-w-0 flex-col lg:h-full lg:overflow-hidden lg:pl-1"
            data-ticket-detail-pane="">
            {selected ? (
              <>
                {!loading && !tickets.some((item) => item.id === selected.id) ? <MutedPanel compact description="当前工单不在本页筛选结果中，详情按工单号独立加载。" /> : null}
                <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 basis-full items-start gap-2 lg:basis-0">
                    <Text size="lg" weight="bold" className="min-w-0 break-words">
                      {selected.title}
                    </Text>
                    <Tag variant={STATUS_META[selected.status].variant} size="sm" className="shrink-0">
                      {STATUS_META[selected.status].label}
                    </Tag>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {relatedApprovalId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(`/approvals/${encodeURIComponent(relatedApprovalId)}`)
                        }>
                        打开审批 {relatedApprovalId}
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={acting || selected.status === 'closed'}
                      onClick={requestClose}>
                      关闭工单
                    </Button>
                  </div>
                </div>

                <div className="mt-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto" data-ticket-detail-body="">
                <div className="space-y-4">
                  <Card header={<Text weight="bold">工单信息</Text>}>
                    <Descriptions items={descriptions} column={1} layout={isWide ? 'horizontal' : 'vertical'} bordered colon />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Text size="sm" color="secondary">
                        满意度
                      </Text>
                      <Rate value={selected.satisfaction} disabled allowHalf />
                      <Popover
                        trigger="hover"
                        placement="top"
                        width={240}
                        content={
                          <div className="p-3 text-sm">满意度为提交人对本次服务的评分（演示数据）。</div>
                        }>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-(--tiger-text-secondary,#64748b)">
                          <HelpIcon size={14} />
                        </span>
                      </Popover>
                    </div>
                  </Card>

                  <Card header={<Text weight="bold">工单生命周期</Text>}>
                    <Steps current={STATUS_META[selected.status].step} orientation="vertical" size="sm">
                      {LIFECYCLE.map((label, idx) => (
                        <StepsItem
                          key={label}
                          title={label}
                          {...(idx === STATUS_META[selected.status].step ? { description: '当前阶段' } : {})}
                        />
                      ))}
                    </Steps>
                  </Card>
                </div>

                <Card header={<Text weight="bold">审批进度</Text>} className="mt-4 min-w-0">
                  <div className="min-w-0 overflow-x-auto">
                    <WorkflowTimeline steps={workflowSteps} />
                  </div>
                  <Text size="sm" color="secondary" className="mt-2 block">
                    工单详情动作会写回工单状态；完整待办/已办/抄送实例见审批中心。
                  </Text>
                </Card>

                <Card header={<Text weight="bold">对话</Text>} className="mt-4 min-w-0">
                  {isWide ? (
                    <Resizable
                      axis="vertical"
                      handles={['bottom']}
                      defaultHeight={300}
                      minHeight={200}
                      maxHeight={460}
                      className="w-full overflow-hidden"
                      style={{ width: '100%' }}
                      aria-label="调整对话区高度">
                      {ticketChatWindow}
                    </Resizable>
                  ) : (
                    <div className="h-[280px] min-h-0 overflow-hidden">{ticketChatWindow}</div>
                  )}
                </Card>

                <Card header={<Text weight="bold">内部备注</Text>} className="mt-4">
                  {notesError ? <div role="alert"><Alert type="error" title={notesError} /><Button disabled={acting || notesLoading} onClick={() => void loadNotes(selected.id, detailController.current?.signal)}>重试备注</Button></div> : selected.notes.length ? (
                    <CommentThread nodes={selected.notes} showReply={false} showLike={false} showMore={false} emptyText="暂无内部备注" />
                  ) : (
                    <MutedPanel compact description="还没有内部备注，可在下方 @ 同事记录处理进展。" />
                  )}
                  <Divider spacing="sm" />
                  {notesLoading && <Text size="sm" color="secondary">正在加载内部备注…</Text>}
                  <Mentions
                    disabled={acting || notesLoading || Boolean(notesError)}
                    value={noteDraft}
                    onChange={setNoteDraft}
                    options={assignees}
                    rows={2}
                    placeholder="输入内部备注，使用 @ 提及同事"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" disabled={acting || notesLoading || Boolean(notesError) || !noteDraft.trim()} onClick={handleAddNote}>
                      添加备注
                    </Button>
                  </div>
                </Card>
                </div>

                <div
                  className="sticky bottom-0 z-10 mt-4 shrink-0 border-t border-[var(--tiger-border,#e5e7eb)] bg-[var(--tiger-bg-card,#fff)] px-1 py-3 lg:mt-auto"
                  data-ticket-detail-action="">
                  <WorkflowActionBar
                    items={TICKET_WORKFLOW_ACTIONS}
                    disabled={workflowActionsDisabled}
                    ariaLabel="审批操作"
                    style={{ flexWrap: 'wrap', overflowX: 'visible' }}
                    onAction={handleWorkflowAction}
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                {detailError ? <div role="alert"><Alert type="error" title={detailError} /><Button onClick={() => void loadTicketDetail(requestedTicketId)}>重试详情</Button></div> : detailLoading || loading ? (
                  <MutedPanel description="正在加载工单…" />
                ) : (
                  <Empty preset="no-data" description="请选择左侧工单查看详情、对话与内部协作。" />
                )}
              </div>
            )}
          </div>
        </TicketLayout>
      </Card>

      {/* 新建工单 */}
      <Drawer
        placement="right"
        open={drawerOpen}
        title="新建工单"
        width="420px"
        mask
        maskClosable={!creating}
        closable={!creating}
        keyboard={!creating}
        onClose={() => { if (!creating) setDrawerOpen(false); }}
        onAfterClose={() => drawerTriggerRef.current?.focus()}>
        <div className="space-y-4">
          <div>
            <Text weight="medium" className="mb-1 block">
              标题
            </Text>
            <Input id="ticket-title" aria-label="工单标题" disabled={creating} value={form.title} onChange={(v) => setForm((s) => ({ ...s, title: String(v) }))} placeholder="简要描述问题或需求" />
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              分类
            </Text>
            <RadioGroup aria-label="工单分类" disabled={creating} value={form.category} onChange={(value) => setForm((s) => ({ ...s, category: String(value) }))}>
              <Radio value="缺陷">缺陷</Radio>
              <Radio value="需求">需求</Radio>
              <Radio value="咨询">咨询</Radio>
            </RadioGroup>
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              优先级
            </Text>
            <RadioGroup
              aria-label="工单优先级"
              disabled={creating}
              value={form.priority}
              onChange={(value) => setForm((s) => ({ ...s, priority: value as TicketPriority }))}>
              <Radio value="high">高</Radio>
              <Radio value="medium">中</Radio>
              <Radio value="low">低</Radio>
            </RadioGroup>
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              描述
            </Text>
            <Textarea
              disabled={creating}
              value={form.description}
              onChange={(v) => setForm((s) => ({ ...s, description: String(v) }))}
              rows={4}
              placeholder="补充复现步骤或背景信息"
            />
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              附件
            </Text>
            <Text size="sm" color="secondary">附件尚未接入上传；当前仅保存标题、分类、优先级和描述。</Text>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" disabled={creating} onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button loading={creating} onClick={submitTicket}>创建工单</Button>
          </div>
        </div>
      </Drawer>

      {/* 关闭确认 */}
      <Drawer
        placement="right"
        open={confirmingClose}
        title="确认关闭工单"
        width="360px"
        mask
        maskClosable={!acting}
        closable={!acting}
        keyboard={!acting}
        onClose={() => { if (!acting) setConfirmingClose(false); }}
        onAfterClose={() => drawerTriggerRef.current?.focus()}>
        <div className="space-y-4">
          <MutedPanel description="关闭后工单将标记为“已关闭”，演示环境下可重新创建。" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={acting} onClick={() => setConfirmingClose(false)}>
              取消
            </Button>
            <Button danger loading={acting} onClick={confirmClose}>
              确认关闭
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default TicketsPage;
