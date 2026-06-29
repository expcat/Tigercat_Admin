import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Text, Tag, Button, Input, Message } from '@expcat/tigercat-react';
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
import type {
  ChatMessage,
  CommentNode,
  MentionOption,
  UploadFile,
  DescriptionsItem,
  TagVariant,
  BadgeVariant,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';
import { HelpIcon, PlusIcon, TicketIcon } from '../components/Icons';

type TicketStatus = 'open' | 'accepted' | 'progress' | 'resolved' | 'closed';
type TicketPriority = 'high' | 'medium' | 'low';

interface Ticket {
  id: string;
  title: string;
  requester: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  satisfaction: number;
  description: string;
  messages: ChatMessage[];
  notes: CommentNode[];
}

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

const nowLabel = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const SEED_TICKETS: Ticket[] = [
  {
    id: 'TK-2048',
    title: '导出报表时偶发 500 错误',
    requester: '赵敏',
    category: '缺陷',
    priority: 'high',
    status: 'progress',
    createdAt: '2026-06-28 10:24',
    updatedAt: '2026-06-29 09:02',
    satisfaction: 0,
    description: '在数据分析页导出近 90 天报表时，约 1/5 概率返回 500，刷新后可恢复。',
    messages: [
      { id: 'm1', content: '你好，导出报表偶尔会失败，麻烦看下。', direction: 'other', time: '2026-06-28 10:24' },
      { id: 'm2', content: '已收到，正在排查导出服务的超时配置。', direction: 'self', time: '2026-06-28 11:10' },
    ],
    notes: [
      {
        id: 'n1',
        content: '初步定位为导出队列在高峰期超时，已 @张运维 调整 worker 并发。',
        user: { name: '李工' },
        time: '2026-06-28 14:30',
      },
    ],
  },
  {
    id: 'TK-2050',
    title: '希望支持按部门筛选用户',
    requester: '孙莉',
    category: '需求',
    priority: 'medium',
    status: 'accepted',
    createdAt: '2026-06-27 16:40',
    updatedAt: '2026-06-28 09:15',
    satisfaction: 0,
    description: '用户管理列表希望增加“部门”筛选项，便于按团队管理成员。',
    messages: [
      { id: 'm1', content: '能否在用户列表加一个部门筛选？', direction: 'other', time: '2026-06-27 16:40' },
    ],
    notes: [],
  },
  {
    id: 'TK-2041',
    title: '登录后偶尔跳回登录页',
    requester: '周杰',
    category: '缺陷',
    priority: 'high',
    status: 'resolved',
    createdAt: '2026-06-25 08:12',
    updatedAt: '2026-06-26 17:50',
    satisfaction: 4,
    description: '部分用户登录成功后数秒内被登出，疑似 token 续期问题。',
    messages: [
      { id: 'm1', content: '登录后过一会就被踢出来了。', direction: 'other', time: '2026-06-25 08:12' },
      { id: 'm2', content: '已修复 token 续期逻辑，请再试试。', direction: 'self', time: '2026-06-26 17:50' },
      { id: 'm3', content: '可以了，谢谢！', direction: 'other', time: '2026-06-26 18:05' },
    ],
    notes: [
      {
        id: 'n1',
        content: '根因：刷新接口未带上最新 token，已修复并补充回归用例。',
        user: { name: '王小虎' },
        time: '2026-06-26 17:40',
      },
    ],
  },
  {
    id: 'TK-2033',
    title: '通知中心希望支持批量已读',
    requester: '吴芳',
    category: '需求',
    priority: 'low',
    status: 'closed',
    createdAt: '2026-06-20 13:00',
    updatedAt: '2026-06-22 10:20',
    satisfaction: 5,
    description: '通知较多时希望一键全部标记为已读。',
    messages: [
      { id: 'm1', content: '通知太多了，能不能一键已读？', direction: 'other', time: '2026-06-20 13:00' },
      { id: 'm2', content: '已上线“全部已读”按钮，欢迎体验。', direction: 'self', time: '2026-06-22 10:20' },
    ],
    notes: [],
  },
];

function TicketsPage() {
  const seqRef = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${Date.now()}-${seqRef.current++}`;

  const [tickets, setTickets] = useState<Ticket[]>(SEED_TICKETS);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(SEED_TICKETS[0]?.id ?? null);
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

  const filteredTickets = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return tickets.filter((t) => {
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchKw = !kw || `${t.title} ${t.requester} ${t.id}`.toLowerCase().includes(kw);
      return matchStatus && matchKw;
    });
  }, [tickets, keyword, statusFilter]);

  const openCount = useMemo(
    () => tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length,
    [tickets],
  );

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

  const appendMessage = (id: string, message: ChatMessage) =>
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, messages: [...t.messages, message] } : t)),
    );

  const handleSend = (value: string) => {
    const text = value.trim();
    if (!selected || !text) return;
    const id = selected.id;
    appendMessage(id, { id: nextId('m'), content: text, direction: 'self', time: nowLabel() });
    setDraft('');
    window.setTimeout(() => {
      appendMessage(id, {
        id: nextId('m'),
        content: '收到，我们会尽快跟进本工单（演示自动回复）。',
        direction: 'other',
        time: nowLabel(),
      });
    }, 700);
  };

  const handleAddNote = () => {
    const text = noteDraft.trim();
    if (!selected || !text) return;
    const note: CommentNode = {
      id: nextId('n'),
      content: text,
      user: { name: '我' },
      time: nowLabel(),
    };
    setTickets((prev) =>
      prev.map((t) => (t.id === selected.id ? { ...t, notes: [...t.notes, note] } : t)),
    );
    setNoteDraft('');
    Message.success({ content: '已添加内部备注（演示）', duration: 2000 });
  };

  const confirmClose = () => {
    if (selected) {
      const id = selected.id;
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'closed', updatedAt: nowLabel() } : t)),
      );
    }
    setConfirmingClose(false);
    Message.success({ content: '工单已关闭（演示）', duration: 2000 });
  };

  const openDrawer = () => {
    setForm({ title: '', category: '缺陷', priority: 'medium', description: '' });
    setFormFiles([]);
    setDrawerOpen(true);
  };

  const submitTicket = () => {
    const title = form.title.trim();
    if (!title) {
      Message.warning({ content: '请填写工单标题', duration: 2000 });
      return;
    }
    const id = `TK-${2050 + tickets.length + 1}`;
    const ticket: Ticket = {
      id,
      title,
      requester: '我',
      category: form.category,
      priority: form.priority,
      status: 'open',
      createdAt: nowLabel(),
      updatedAt: nowLabel(),
      satisfaction: 0,
      description: form.description.trim() || '（无描述）',
      messages: [],
      notes: [],
    };
    setTickets((prev) => [ticket, ...prev]);
    setSelectedId(id);
    setStatusFilter('all');
    setDrawerOpen(false);
    Message.success({ content: `工单 ${id} 已创建（演示）`, duration: 2400 });
  };

  const splitDirection: 'horizontal' | 'vertical' = isWide ? 'horizontal' : 'vertical';
  const splitStyle = { height: isWide ? '640px' : '900px' };

  return (
    <div className="space-y-6">
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
          <Badge content={openCount} variant="primary" standalone />
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

      <Card className="overflow-hidden">
        <Splitter direction={splitDirection} min={220} gutterSize={8} style={splitStyle}>
          {/* 左：列表 */}
          <div className="flex h-full flex-col gap-3 overflow-hidden pr-1">
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
                  onClick={() => setSelectedId(t.id)}>
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

              {filteredTickets.length === 0 && (
                <MutedPanel compact description="没有符合条件的工单，试试调整筛选或搜索关键词。" />
              )}
            </div>
          </div>

          {/* 右：详情 */}
          <div className="flex h-full flex-col overflow-y-auto pl-1">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                    onClick={() => setConfirmingClose(true)}>
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
                          description={idx === STATUS_META[selected.status].step ? '当前阶段' : ''}
                        />
                      ))}
                    </Steps>
                  </Card>
                </div>

                <Card header={<Text weight="bold">对话</Text>} className="mt-4">
                  <Resizable axis="vertical" handles={['bottom']} defaultHeight={300} minHeight={200} maxHeight={460} style={{ width: '100%' }}>
                    <ChatWindow
                      messages={selected.messages}
                      value={draft}
                      className="h-full"
                      placeholder="回复提交人，回车发送"
                      sendText="发送"
                      emptyText="暂无对话，开始回复吧"
                      statusText="工单进行中"
                      statusVariant={'primary' as BadgeVariant}
                      showAvatar={false}
                      showName={false}
                      onChange={setDraft}
                      onSend={handleSend}
                    />
                  </Resizable>
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
                <MutedPanel description="请选择左侧工单查看详情、对话与内部协作。" />
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
        onClose={() => setDrawerOpen(false)}>
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
        onClose={() => setConfirmingClose(false)}>
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
