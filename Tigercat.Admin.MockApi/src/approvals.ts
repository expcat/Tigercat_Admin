export type ApprovalLane = 'todo' | 'done' | 'cc' | 'started';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'canceled';
export type ApprovalAction = 'approve' | 'reject' | 'transfer' | 'comment';

export type ApprovalActor = {
  id?: string;
  name?: string;
};

export type ApprovalStep = {
  key: string;
  title?: string;
  status?: string;
  actor?: ApprovalActor;
  action?: string;
  comment?: string;
  time?: string;
  order?: number;
  children?: ApprovalStep[];
  kind?: string;
  signMode?: string;
  rollbackPoint?: boolean;
};

export type ApprovalFormField = {
  label: string;
  value: string;
};

export type ApprovalInstance = {
  id: string;
  title: string;
  category: string;
  ticketId?: string | null;
  starter: string;
  assignee: string;
  cc: string[];
  status: ApprovalStatus;
  currentStepKey?: string;
  reason: string;
  amount?: string | null;
  actedBy: string[];
  createdAt: string;
  updatedAt: string;
  steps: ApprovalStep[];
};

export type ApprovalListItem = {
  id: string;
  title: string;
  category: string;
  ticketId?: string | null;
  starter: string;
  assignee: string;
  cc: string[];
  status: ApprovalStatus;
  currentStepKey?: string;
  currentStepTitle?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalDetail = ApprovalListItem & {
  reason: string;
  amount?: string | null;
  formFields: ApprovalFormField[];
  steps: ApprovalStep[];
  actedBy: string[];
};

export type ApprovalMutation =
  | { ok: true; status: number; detail: ApprovalDetail; ticketId?: string | null; ticketStatus?: string | null }
  | { ok: false; status: number; message: string };

const LANES: ApprovalLane[] = ['todo', 'done', 'cc', 'started'];
const ACTIONS: ApprovalAction[] = ['approve', 'reject', 'transfer', 'comment'];

const sameUser = (left?: string | null, right?: string | null) =>
  Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());

const clamp = (value: string | undefined, max: number, fallback: string) => {
  const next = (value ?? '').trim() || fallback;
  return next.length <= max ? next : next.slice(0, max);
};

const actor = (name: string): ApprovalActor => ({ id: name, name });

const cloneStep = (step: ApprovalStep): ApprovalStep => ({
  ...step,
  actor: step.actor ? { ...step.actor } : undefined,
  children: step.children?.map(cloneStep),
});

const cloneInstance = (item: ApprovalInstance): ApprovalInstance => ({
  ...item,
  cc: [...item.cc],
  actedBy: [...item.actedBy],
  steps: item.steps.map(cloneStep),
});

const currentTitle = (item: ApprovalInstance) =>
  item.steps.find((step) => step.key === item.currentStepKey)?.title ??
  item.steps.find((step) => step.status === 'active')?.title;

const formFields = (item: ApprovalInstance): ApprovalFormField[] => {
  const fields: ApprovalFormField[] = [
    { label: '标题', value: item.title },
    { label: '类型', value: item.category },
    { label: '发起人', value: item.starter },
    { label: '当前处理人', value: item.assignee },
    { label: '说明', value: item.reason },
  ];
  if (item.amount) fields.push({ label: '金额 / 天数', value: item.amount });
  if (item.ticketId) fields.push({ label: '关联工单', value: item.ticketId });
  if (item.cc.length) fields.push({ label: '抄送', value: item.cc.join('、') });
  return fields;
};

export function toListItem(item: ApprovalInstance): ApprovalListItem {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    ticketId: item.ticketId,
    starter: item.starter,
    assignee: item.assignee,
    cc: [...item.cc],
    status: item.status,
    currentStepKey: item.currentStepKey,
    currentStepTitle: currentTitle(item),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function toDetail(item: ApprovalInstance): ApprovalDetail {
  return {
    ...toListItem(item),
    reason: item.reason,
    amount: item.amount,
    formFields: formFields(item),
    steps: item.steps.map(cloneStep),
    actedBy: [...item.actedBy],
  };
}

const startStep = (name: string, time: string, order: number): ApprovalStep => ({
  key: 'start',
  title: '提交申请',
  status: 'approved',
  kind: 'start',
  action: 'approve',
  actor: actor(name),
  comment: '请协助处理。',
  time,
  order,
});

const managerStep = (
  status: string,
  name: string | null,
  time: string | undefined,
  order: number,
  comment?: string,
): ApprovalStep => ({
  key: 'manager',
  title: '经理审批',
  status,
  kind: 'approve',
  signMode: 'countersign',
  action: status === 'approved' ? 'approve' : undefined,
  actor: actor(name ?? 'admin'),
  comment,
  time,
  order,
  children: [
    {
      key: 'cc-ops',
      title: '抄送运维',
      status: status === 'approved' ? 'approved' : status,
      kind: 'cc',
      actor: actor('demo'),
      time,
    },
  ],
});

const archiveStep = (status: string, time: string | undefined, order: number, comment?: string): ApprovalStep => ({
  key: 'archive',
  title: '归档',
  status,
  kind: 'approve',
  action: status === 'approved' ? 'approve' : undefined,
  actor: actor('系统'),
  comment,
  time,
  order,
});

const pendingTicketSteps = (starter: string, assignee: string, time: string): ApprovalStep[] => [
  startStep(starter, time, 1),
  {
    key: 'lead',
    title: '组长审批',
    status: 'active',
    kind: 'approve',
    signMode: 'sequential',
    actor: actor(assignee),
    order: 2,
  },
  managerStep('pending', null, undefined, 3),
  archiveStep('pending', undefined, 4),
];

export function seedApprovals(): ApprovalInstance[] {
  return [
    {
      id: 'AP-1001',
      title: '工单升级：导出报表偶发 500',
      category: '工单',
      ticketId: 'TK-2048',
      starter: 'admin',
      assignee: 'admin',
      cc: ['demo'],
      status: 'pending',
      currentStepKey: 'lead',
      reason: '数据分析页导出近 90 天报表约 1/5 概率 500，申请升级处理。',
      actedBy: [],
      createdAt: '2026-06-28 10:24',
      updatedAt: '2026-06-29 09:02',
      steps: pendingTicketSteps('admin', 'admin', '2026-06-28 10:24'),
    },
    {
      id: 'AP-1002',
      title: '工单结案：登录后跳回登录页',
      category: '工单',
      ticketId: 'TK-2041',
      starter: 'admin',
      assignee: 'admin',
      cc: ['demo'],
      status: 'approved',
      currentStepKey: 'archive',
      reason: 'token 续期已修复，申请归档。',
      actedBy: ['admin'],
      createdAt: '2026-06-25 08:12',
      updatedAt: '2026-06-26 17:50',
      steps: [
        startStep('admin', '2026-06-25 08:12', 1),
        {
          key: 'lead',
          title: '组长审批',
          status: 'approved',
          kind: 'approve',
          signMode: 'sequential',
          action: 'approve',
          actor: actor('admin'),
          comment: '已核实续期问题。',
          time: '2026-06-26 17:40',
          order: 2,
        },
        managerStep('approved', 'admin', '2026-06-26 17:50', 3, '同意归档。'),
        archiveStep('approved', '2026-06-26 17:50', 4, '工单已归档。'),
      ],
    },
    {
      id: 'AP-1003',
      title: '请假：周五下午调休',
      category: '请假',
      starter: 'demo',
      assignee: 'demo',
      cc: ['admin'],
      status: 'pending',
      currentStepKey: 'lead',
      reason: '周五下午处理个人事务，调休 0.5 天。',
      amount: '0.5 天',
      actedBy: [],
      createdAt: '2026-06-27 11:00',
      updatedAt: '2026-06-27 11:00',
      steps: [
        startStep('demo', '2026-06-27 11:00', 1),
        {
          key: 'lead',
          title: '直属审批',
          status: 'active',
          kind: 'approve',
          signMode: 'sequential',
          actor: actor('demo'),
          order: 2,
        },
        {
          key: 'hr',
          title: '人事备案',
          status: 'pending',
          kind: 'cc',
          actor: actor('admin'),
          order: 3,
          children: [
            { key: 'cc-hr', title: '抄送人事', status: 'pending', kind: 'cc', actor: actor('admin') },
          ],
        },
      ],
    },
    {
      id: 'AP-1004',
      title: '报销：线上会议软件年费',
      category: '报销',
      starter: 'admin',
      assignee: 'demo',
      cc: ['demo'],
      status: 'pending',
      currentStepKey: 'lead',
      reason: '协作会议软件续费，请财务审核。',
      amount: '1280',
      actedBy: [],
      createdAt: '2026-06-27 16:40',
      updatedAt: '2026-06-28 09:15',
      steps: [
        startStep('admin', '2026-06-27 16:40', 1),
        {
          key: 'lead',
          title: '直属审批',
          status: 'active',
          kind: 'approve',
          signMode: 'sequential',
          actor: actor('demo'),
          order: 2,
        },
        {
          key: 'finance',
          title: '财务审核',
          status: 'pending',
          kind: 'approve',
          signMode: 'orsign',
          actor: actor('admin'),
          order: 3,
          children: [
            { key: 'cc-finance', title: '抄送财务', status: 'pending', kind: 'cc', actor: actor('demo') },
          ],
        },
        { key: 'condition', title: '金额大于 1000 需加签', status: 'pending', kind: 'condition', order: 4 },
      ],
    },
    {
      id: 'AP-1005',
      title: '工单升级：按部门筛选用户',
      category: '工单',
      ticketId: 'TK-2050',
      starter: 'admin',
      assignee: 'admin',
      cc: ['admin'],
      status: 'rejected',
      currentStepKey: 'lead',
      reason: '用户列表增加部门筛选，申请排期。',
      actedBy: ['admin'],
      createdAt: '2026-06-27 16:40',
      updatedAt: '2026-06-28 09:15',
      steps: [
        startStep('admin', '2026-06-27 16:40', 1),
        {
          key: 'lead',
          title: '组长审批',
          status: 'rejected',
          kind: 'approve',
          signMode: 'sequential',
          action: 'reject',
          actor: actor('admin'),
          comment: '本迭代不做，先记需求池。',
          time: '2026-06-28 09:15',
          rollbackPoint: true,
          order: 2,
        },
        managerStep('pending', null, undefined, 3),
        archiveStep('pending', undefined, 4),
      ],
    },
  ];
}

export function listApprovals(
  items: ApprovalInstance[],
  username: string,
  lane: string | null,
  keyword: string | null,
): { error?: string; items: ApprovalListItem[] } {
  const normalized = (lane ?? 'todo').trim().toLowerCase();
  if (!LANES.includes(normalized as ApprovalLane)) {
    return { error: '无效的审批列表类型', items: [] };
  }

  let next = items.filter((item) => {
    if (normalized === 'todo') return item.status === 'pending' && sameUser(item.assignee, username);
    if (normalized === 'done') return item.actedBy.some((actorName) => sameUser(actorName, username));
    if (normalized === 'cc') return item.cc.some((actorName) => sameUser(actorName, username));
    return sameUser(item.starter, username);
  });

  const kw = keyword?.trim().toLowerCase();
  if (kw) {
    next = next.filter((item) =>
      `${item.title} ${item.id} ${item.starter} ${item.assignee} ${item.ticketId ?? ''}`.toLowerCase().includes(kw),
    );
  }

  next = [...next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id));
  return { items: next.map(toListItem) };
}

export function getApproval(items: ApprovalInstance[], id: string): ApprovalDetail | null {
  const item = items.find((entry) => entry.id.toLowerCase() === id.toLowerCase());
  return item ? toDetail(item) : null;
}

export function createApproval(
  items: ApprovalInstance[],
  nextNumber: number,
  username: string,
  body: {
    title?: string;
    category?: string;
    reason?: string;
    amount?: string;
    ticketId?: string;
    assignee?: string;
    cc?: string[];
  },
  now: string,
): { error?: string; nextNumber: number; detail?: ApprovalDetail } {
  const title = (body.title ?? '').trim();
  if (!title) return { error: '审批标题不能为空', nextNumber };
  const starter = username.trim() || 'unknown';
  const assignee = clamp(body.assignee, 40, 'admin');
  const instance: ApprovalInstance = {
    id: `AP-${nextNumber}`,
    title: title.slice(0, 120),
    category: clamp(body.category, 40, '工单'),
    ticketId: body.ticketId?.trim() || null,
    starter,
    assignee,
    cc: [...new Set((body.cc ?? []).map((item) => clamp(item, 40, item)).filter(Boolean))],
    status: 'pending',
    currentStepKey: 'lead',
    reason: clamp(body.reason, 2000, '（无说明）'),
    amount: body.amount?.trim() ? clamp(body.amount, 32, '') : null,
    actedBy: [],
    createdAt: now,
    updatedAt: now,
    steps: pendingTicketSteps(starter, assignee, now),
  };
  items.unshift(instance);
  return { nextNumber: nextNumber + 1, detail: toDetail(instance) };
}

const findActive = (steps: ApprovalStep[]) => steps.find((step) => step.status === 'active');

const markChildren = (step: ApprovalStep, status: string) => {
  step.children?.forEach((child) => {
    child.status = status;
    if (status === 'approved' || status === 'rejected' || status === 'active') {
      child.time = child.time ?? step.time;
    }
  });
};

const remember = (item: ApprovalInstance, username: string) => {
  if (!item.actedBy.some((actorName) => sameUser(actorName, username))) {
    item.actedBy = [...item.actedBy, username];
  }
};

const TICKET_STATUS_RANK: Record<string, number> = {
  open: 0,
  accepted: 1,
  progress: 2,
  resolved: 3,
  closed: 3,
};

export function shouldAdvanceTicketStatus(current: string, next: string): boolean {
  if (current === next) return false;
  return (TICKET_STATUS_RANK[next] ?? -1) > (TICKET_STATUS_RANK[current] ?? -1);
}

const ticketStatusFor = (item: ApprovalInstance, action: ApprovalAction): string | null => {
  if (!item.ticketId) return null;
  if (action === 'transfer' || action === 'comment') return null;
  if (item.status === 'approved') return 'resolved';
  if (item.status === 'rejected') return 'closed';
  if (item.status === 'pending') {
    return item.currentStepKey === 'lead' || item.currentStepKey === 'start' ? 'accepted' : 'progress';
  }
  return null;
};

const advance = (item: ApprovalInstance, now: string) => {
  const remaining = [...item.steps]
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .find((step) => step.status === 'pending' || !step.status);
  if (!remaining) {
    item.status = 'approved';
    item.currentStepKey = item.steps[item.steps.length - 1]?.key;
    item.updatedAt = now;
    return;
  }
  remaining.status = 'active';
  if (remaining.kind === 'cc' || (remaining.children && remaining.children.length > 0)) {
    markChildren(remaining, 'active');
  }
  item.assignee = remaining.actor?.id || remaining.actor?.name || item.assignee;
  item.currentStepKey = remaining.key;
  item.updatedAt = now;
};

export function applyApprovalAction(
  items: ApprovalInstance[],
  id: string,
  username: string,
  body: { action?: string; comment?: string; transferTo?: string },
  now: string,
): ApprovalMutation {
  const action = (body.action ?? '').trim().toLowerCase() as ApprovalAction;
  if (!ACTIONS.includes(action)) {
    return { ok: false, status: 400, message: '无效的审批动作' };
  }
  const item = items.find((entry) => entry.id.toLowerCase() === id.toLowerCase());
  if (!item) return { ok: false, status: 404, message: '审批实例不存在' };
  if (item.status === 'approved' || item.status === 'rejected' || item.status === 'canceled') {
    return { ok: false, status: 400, message: '当前审批已结束，不能再操作' };
  }
  const active = findActive(item.steps);
  if (!active) return { ok: false, status: 400, message: '当前没有可处理的审批步骤' };

  const actorName = username.trim() || 'unknown';
  const comment = body.comment == null ? undefined : clamp(body.comment, 500, '');

  if (action === 'approve' || action === 'reject') {
    active.status = action === 'approve' ? 'approved' : 'rejected';
    active.action = action;
    active.time = now;
    active.rollbackPoint = action === 'reject';
    if (comment) active.comment = comment;
    else if (action === 'reject') active.comment = '驳回';
    active.actor = actor(actorName);
    markChildren(active, active.status);
    remember(item, actorName);
    if (action === 'reject') {
      item.status = 'rejected';
      item.updatedAt = now;
    } else {
      advance(item, now);
    }
  } else if (action === 'transfer') {
    const target = (body.transferTo ?? '').trim();
    if (!target) return { ok: false, status: 400, message: '转交对象不能为空' };
    const next = clamp(target, 40, target);
    active.actor = actor(next);
    active.comment = comment || `转交给 ${next}`;
    active.time = now;
    active.action = 'transfer';
    item.assignee = next;
    remember(item, actorName);
    item.updatedAt = now;
  } else {
    if (!comment) return { ok: false, status: 400, message: '评论内容不能为空' };
    active.comment = active.comment ? `${active.comment}\n${comment}` : comment;
    active.time = now;
    item.updatedAt = now;
  }

  return {
    ok: true,
    status: 200,
    detail: toDetail(item),
    ticketId: item.ticketId,
    ticketStatus: ticketStatusFor(item, action),
  };
}

export function restoreApprovals(raw: unknown, fallback: ApprovalInstance[]): ApprovalInstance[] {
  if (!Array.isArray(raw)) return fallback.map(cloneInstance);
  return raw.map((item) => cloneInstance(item as ApprovalInstance));
}
