import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@expcat/tigercat-react/Button';
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
import { Badge } from '@expcat/tigercat-react/Badge';
import { Drawer } from '@expcat/tigercat-react/Drawer';
import { Upload } from '@expcat/tigercat-react/Upload';
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
  UploadFile,
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
import { createComment, fetchComments } from '../utils/comments';
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
  { value: 'progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
];

/** ChatWindow fills this box; textarea resize would fight the Resizable bottom handle. */
const TICKET_CHAT_WINDOW_CLASS = 'h-full min-h-0 [&_textarea]:resize-none';

function TicketsPage() {
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const [, setFormFiles] = useState<UploadFile[]>([]);

  // 响应式：宽屏左右分栏，窄屏上下分栏
  const [isWide, setIsWide] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsWide(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  const filteredTickets = tickets;

  const openCount = useMemo(
    () => tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length,
    [tickets],
  );

  const loadTicketDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const [ticketPayload, commentsPayload] = await Promise.all([
        fetchTicket(id),
        fetchComments('ticket', id),
      ]);
      const notes = toCommentNodes(commentsPayload.data ?? []);
      setTickets((prev) =>
        prev.map((item) => (item.id === id ? toTicketView(ticketPayload.data, notes) : item)),
      );
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '工单详情加载失败'), duration: 3000 });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadTickets = useCallback(async (selectId?: string | null) => {
    setLoading(true);
    try {
      const payload = await fetchTickets({
        page: 1,
        pageSize: 50,
        status: statusFilter,
        keyword,
      });
      const items = payload.data.items ?? [];
      setTickets((prev) => {
        const prevNotes = new Map(prev.map((item) => [item.id, item.notes]));
        return items.map((item) => toTicketView(item, prevNotes.get(item.id) ?? []));
      });
      const nextSelected =
        (selectId && items.some((item) => item.id === selectId) && selectId) ||
        (selectedId && items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id ?? null);
      setSelectedId(nextSelected);
      if (nextSelected) {
        await loadTicketDetail(nextSelected);
      }
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '工单列表加载失败'), duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [keyword, loadTicketDetail, selectedId, statusFilter]);

  useEffect(() => {
    void loadTickets();
    // Intentionally reload when filters change; loadTickets already closes over them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, statusFilter]);

  const selectTicket = (id: string) => {
    setSelectedId(id);
    void loadTicketDetail(id);
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
        { label: '工单号', content: selected.id },
        { label: '提交人', content: selected.requester },
        { label: '分类', content: selected.category },
        { label: '优先级', content: PRIORITY_META[selected.priority].label },
        { label: '创建时间', content: selected.createdAt },
        { label: '更新时间', content: selected.updatedAt },
      ]
    : [];

  const workflowSteps = useMemo(
    () => (selected ? getTicketWorkflowSteps(selected) : []),
    [selected],
  );
  const workflowActionsDisabled =
    selected?.status === 'resolved' || selected?.status === 'closed';

  const handleWorkflowAction = async (item: WorkflowActionBarItem) => {
    if (!selected) return;
    const id = selected.id;
    try {
      if (item.action === 'transfer' || item.action === 'comment') {
        const text = item.action === 'transfer'
          ? '已转交（演示写回）。完整实例状态机见审批中心。'
          : '已添加评论（演示写回）。';
        const payload = await sendTicketMessage(id, text);
        setTickets((prev) =>
          prev.map((ticket) => (ticket.id === id ? toTicketView(payload.data, ticket.notes) : ticket)),
        );
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
      setTickets((prev) =>
        prev.map((ticket) => (ticket.id === id ? toTicketView(payload.data, ticket.notes) : ticket)),
      );
      Message.success({ content: `已写回工单状态：${nextStatus}`, duration: 2200 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '审批动作写回失败'), duration: 3000 });
    }
  };

  const handleSend = async (value: string) => {
    const text = value.trim();
    if (!selected || !text) return;
    const id = selected.id;
    try {
      const payload = await sendTicketMessage(id, text);
      setDraft('');
      setTickets((prev) =>
        prev.map((item) => (item.id === id ? toTicketView(payload.data, item.notes) : item)),
      );
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '发送工单消息失败'), duration: 3000 });
    }
  };

  const handleAddNote = async () => {
    const text = noteDraft.trim();
    if (!selected || !text) return;
    const id = selected.id;
    try {
      const payload = await createComment({ targetType: 'ticket', targetId: id, body: text });
      setTickets((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, notes: [...item.notes, payload.data as CommentNode] } : item,
        ),
      );
      setNoteDraft('');
      Message.success({ content: '已添加内部备注', duration: 2000 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '添加内部备注失败'), duration: 3000 });
    }
  };

  const confirmClose = async () => {
    if (!selected) {
      setConfirmingClose(false);
      return;
    }
    const id = selected.id;
    try {
      const payload = await updateTicket(id, { status: 'closed' });
      setTickets((prev) =>
        prev.map((item) => (item.id === id ? toTicketView(payload.data, item.notes) : item)),
      );
      setConfirmingClose(false);
      Message.success({ content: '工单已关闭', duration: 2000 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '关闭工单失败'), duration: 3000 });
    }
  };

  const openDrawer = () => {
    captureDrawerTrigger();
    setForm({ title: '', category: '缺陷', priority: 'medium', description: '' });
    setFormFiles([]);
    setDrawerOpen(true);
  };

  const submitTicket = async () => {
    const title = form.title.trim();
    if (!title) {
      Message.warning({ content: '请填写工单标题', duration: 2000 });
      return;
    }
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
      await loadTickets(payload.data.id);
      Message.success({ content: `工单 ${payload.data.id} 已创建`, duration: 2400 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '创建工单失败'), duration: 3000 });
    }
  };

  const splitDirection: 'horizontal' | 'vertical' = isWide ? 'horizontal' : 'vertical';
  const splitStyle = { height: isWide ? '640px' : '900px' };
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
      onSend={handleSend}
    />
  ) : null;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        icon={<TicketIcon size={24} />}
        title="工单中心"
        subtitle="左右主从布局，跟进工单生命周期、对话与内部协作"
        tags={[
          { label: '协作', variant: 'primary' },
          { label: '演示数据', variant: 'info' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Text weight="bold">工单列表</Text>
          <Badge content={openCount} showZero variant="primary" standalone />
          <Text size="sm" color="secondary">
            个待跟进
          </Text>
        </div>
        <Button onClick={openDrawer}>
          <span className="mr-1 inline-flex align-middle">
            <PlusIcon size={16} />
          </span>
          新建工单
        </Button>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <Splitter direction={splitDirection} min={220} gutterSize={8} style={splitStyle}>
          {/* 左：列表 */}
          <div className="flex h-full min-w-0 flex-col gap-3 overflow-hidden pr-1">
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索标题 / 提交人 / 工单号" clearable />
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
                  onClick={() => setStatusFilter(f.value)}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {filteredTickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    t.id === selectedId
                      ? 'border-(--tiger-primary,#3b82f6) bg-(--tiger-primary,#3b82f6)/5'
                      : 'border-(--tiger-border,#e5e7eb) hover:bg-(--tiger-bg-hover,#f1f5f9)'
                  }`}
                  onClick={() => selectTicket(t.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <Text weight="medium" className="truncate">
                      {t.title}
                    </Text>
                    <Tag variant={PRIORITY_META[t.priority].variant} size="sm">
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

              {loading && filteredTickets.length === 0 ? (
                <MutedPanel compact description="正在加载工单…" />
              ) : (
                filteredTickets.length === 0 && (
                  <MutedPanel compact description="没有符合条件的工单，试试调整筛选或搜索关键词。" />
                )
              )}
            </div>
          </div>

          {/* 右：详情 */}
          <div className="flex h-full min-w-0 flex-col overflow-y-auto pl-1">
            {selected ? (
              <>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Text size="lg" weight="bold">
                      {selected.title}
                    </Text>
                    <Tag variant={STATUS_META[selected.status].variant} size="sm">
                      {STATUS_META[selected.status].label}
                    </Tag>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selected.status === 'closed'}
                    onClick={requestClose}>
                    关闭工单
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Card header={<Text weight="bold">工单信息</Text>}>
                    <Descriptions items={descriptions} column={1} bordered colon />
                    <div className="mt-3 flex items-center gap-2">
                      <Text size="sm" color="secondary">
                        满意度
                      </Text>
                      <Rate value={selected.satisfaction} disabled allowHalf />
                      <Popover
                        trigger="hover"
                        placement="top"
                        width={240}
                        contentContent={
                          <div className="p-3 text-sm">满意度为提交人对本次服务的评分（演示数据）。</div>
                        }>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-(--tiger-text-secondary,#64748b)">
                          <HelpIcon size={14} />
                        </span>
                      </Popover>
                    </div>
                  </Card>

                  <Card header={<Text weight="bold">工单生命周期</Text>}>
                    <Steps current={STATUS_META[selected.status].step} direction="vertical" size="small">
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
                  <div className="mt-3 min-w-0">
                    <WorkflowActionBar
                      items={TICKET_WORKFLOW_ACTIONS}
                      disabled={workflowActionsDisabled}
                      ariaLabel="审批操作"
                      onAction={handleWorkflowAction}
                    />
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
                  {selected.notes.length ? (
                    <CommentThread nodes={selected.notes} showReply={false} showLike={false} showMore={false} emptyText="暂无内部备注" />
                  ) : (
                    <MutedPanel compact description="还没有内部备注，可在下方 @ 同事记录处理进展。" />
                  )}
                  <Divider spacing="sm" />
                  <Mentions
                    value={noteDraft}
                    onChange={setNoteDraft}
                    options={assignees}
                    rows={2}
                    placeholder="输入内部备注，使用 @ 指派同事"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" disabled={!noteDraft.trim()} onClick={handleAddNote}>
                      添加备注
                    </Button>
                  </div>
                </Card>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <MutedPanel
                  description={loading ? '正在加载工单…' : '请选择左侧工单查看详情、对话与内部协作。'}
                />
              </div>
            )}
          </div>
        </Splitter>
      </Card>

      {/* 新建工单 */}
      <Drawer
        placement="right"
        open={drawerOpen}
        title="新建工单"
        width="420px"
        mask
        maskClosable
        onClose={() => setDrawerOpen(false)}
        onAfterClose={() => drawerTriggerRef.current?.focus()}>
        <div className="space-y-4">
          <div>
            <Text weight="medium" className="mb-1 block">
              标题
            </Text>
            <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="简要描述问题或需求" />
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              分类
            </Text>
            <RadioGroup value={form.category} onChange={(value) => setForm((s) => ({ ...s, category: String(value) }))}>
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
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              rows={4}
              placeholder="补充复现步骤或背景信息"
            />
          </div>
          <div>
            <Text weight="medium" className="mb-1 block">
              附件
            </Text>
            <Upload autoUpload={false} multiple drag onChange={(_file, list) => setFormFiles(list)}>
              <div className="p-4 text-center text-sm text-(--tiger-text-secondary,#64748b)">
                点击或拖拽文件到此处（演示，不会真正上传）
              </div>
            </Upload>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button onClick={submitTicket}>创建工单</Button>
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
        maskClosable
        onClose={() => setConfirmingClose(false)}
        onAfterClose={() => drawerTriggerRef.current?.focus()}>
        <div className="space-y-4">
          <MutedPanel description="关闭后工单将标记为“已关闭”，演示环境下可重新创建。" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmingClose(false)}>
              取消
            </Button>
            <Button danger onClick={confirmClose}>
              确认关闭
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default TicketsPage;
