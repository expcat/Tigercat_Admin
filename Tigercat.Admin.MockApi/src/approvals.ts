import type {
  ApproverSource,
  WorkflowHistoryEntry,
  WorkflowInstance,
  WorkflowRuntimeAction,
  WorkflowTask,
  WorkflowTimelineActor,
  WorkflowTimelineStep,
} from '@expcat/tigercat-core';
import { listWorkflowReturnTargets, reduceWorkflowAction } from '@expcat/tigercat-core';
import {
  contactActorFromId,
  findContactUser,
  isApproverSourceLike,
  resolveApprovers,
} from './contacts';

export type ApprovalLane = 'todo' | 'done' | 'cc' | 'started';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'canceled';
export type ApprovalAction =
  | 'approve'
  | 'reject'
  | 'transfer'
  | 'addsign'
  | 'return'
  | 'cancel'
  | 'withdraw'
  | 'comment'
  | 'request_changes';

export type ApprovalActor = {
  id?: string;
  name?: string;
  status?: string;
};

type StepStatus = 'pending' | 'active' | 'approved' | 'rejected' | 'canceled';

export type ApprovalTask = {
  id: string;
  nodeKey: string;
  assignee: ApprovalActor;
  status: string;
  action?: string;
  comment?: string;
  actedAt?: string;
  origin?: string;
};

export type ApprovalHistoryEntry = {
  at: string;
  actorId: string;
  action: string;
  comment?: string;
  nodeKey?: string;
  taskId?: string;
};

export type ApprovalStep = {
  key: string;
  title?: string;
  status?: string;
  actor?: ApprovalActor;
  actors?: ApprovalActor[];
  action?: string;
  comment?: string;
  time?: string;
  order?: number;
  children?: ApprovalStep[];
  kind?: string;
  signMode?: string;
  rollbackPoint?: boolean;
  temporary?: boolean;
  returnTarget?: boolean;
  origin?: {
    type?: string;
    position?: string;
    fromNodeKey?: string;
    fromTaskId?: string;
  };
  approverPolicy?: ApproverSource | ApproverSource[];
  pendingAfterAddsign?: {
    assignees: ApprovalActor[];
    signMode?: string;
    comment?: string;
    fromTaskId?: string;
    tempNodeKey?: string;
  };
  tasks?: ApprovalTask[];
  fieldPermissions?: Record<string, string>;
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
  tasks?: ApprovalTask[];
  history?: ApprovalHistoryEntry[];
  resumeToNodeKey?: string;
  formValues?: Record<string, unknown>;
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

export type ApprovalReturnTarget = {
  key: string;
  title?: string;
  kind?: string;
  actorName?: string;
  status?: string;
};

export type ApprovalDetail = ApprovalListItem & {
  reason: string;
  amount?: string | null;
  formFields: ApprovalFormField[];
  steps: ApprovalStep[];
  actedBy: string[];
  tasks?: ApprovalTask[];
  history?: ApprovalHistoryEntry[];
  resumeToNodeKey?: string;
  returnTargets?: ApprovalReturnTarget[];
};

export type ApprovalMutation =
  | { ok: true; status: number; detail: ApprovalDetail; ticketId?: string | null; ticketStatus?: string | null }
  | { ok: false; status: number; message: string };

export type ApprovalActionBody = {
  action?: string;
  comment?: string;
  transferTo?: string;
  taskId?: string;
  nodeKey?: string;
  position?: string;
  signMode?: string;
  targetNodeKey?: string;
  resume?: string;
  tempNodeKey?: string;
  assignee?: ApprovalActor;
  assignees?: ApprovalActor[];
  addsignTo?: string[];
};

const LANES: ApprovalLane[] = ['todo', 'done', 'cc', 'started'];
const ACTIONS: ApprovalAction[] = [
  'approve',
  'reject',
  'transfer',
  'addsign',
  'return',
  'cancel',
  'withdraw',
  'comment',
  'request_changes',
];

const sameUser = (left?: string | null, right?: string | null) =>
  Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());

const clamp = (value: string | undefined, max: number, fallback: string) => {
  const next = (value ?? '').trim() || fallback;
  return next.length <= max ? next : next.slice(0, max);
};

const actor = (name: string): ApprovalActor => {
  const next = contactActorFromId(name);
  return { id: String(next.id ?? name), name: next.name ?? name };
};

const asTimelineActor = (item: ApprovalActor): WorkflowTimelineActor => ({
  id: item.id,
  name: item.name,
  status: item.status as StepStatus | undefined,
});

const cloneStep = (step: ApprovalStep): ApprovalStep => ({
  ...step,
  actor: step.actor ? { ...step.actor } : undefined,
  actors: step.actors?.map((item) => ({ ...item })),
  children: step.children?.map(cloneStep),
  tasks: step.tasks?.map((item) => ({ ...item, assignee: { ...item.assignee } })),
  fieldPermissions: step.fieldPermissions ? { ...step.fieldPermissions } : step.fieldPermissions,
  approverPolicy: Array.isArray(step.approverPolicy)
    ? step.approverPolicy.map((source) => ({ ...source }))
    : step.approverPolicy
      ? { ...step.approverPolicy }
      : step.approverPolicy,
  origin: step.origin ? { ...step.origin } : step.origin,
  pendingAfterAddsign: step.pendingAfterAddsign
    ? {
        ...step.pendingAfterAddsign,
        assignees: step.pendingAfterAddsign.assignees.map((item) => ({ ...item })),
      }
    : step.pendingAfterAddsign,
});

const cloneTask = (task: ApprovalTask): ApprovalTask => ({
  ...task,
  assignee: { ...task.assignee },
});

const cloneInstance = (item: ApprovalInstance): ApprovalInstance => ({
  ...item,
  cc: [...item.cc],
  actedBy: [...item.actedBy],
  steps: item.steps.map(cloneStep),
  tasks: item.tasks?.map(cloneTask),
  history: item.history?.map((entry) => ({ ...entry })),
  formValues: item.formValues ? { ...item.formValues } : item.formValues,
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

const returnTargets = (item: ApprovalInstance): ApprovalReturnTarget[] =>
  listWorkflowReturnTargets(item.steps as WorkflowTimelineStep[], item.currentStepKey).map((target) => ({
    key: target.key,
    title: target.title,
    kind: target.kind,
    actorName: target.actorName,
    status: target.status,
  }));

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
    tasks: item.tasks?.map(cloneTask),
    history: item.history?.map((entry) => ({ ...entry })),
    resumeToNodeKey: item.resumeToNodeKey,
    returnTargets: returnTargets(item),
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

const managerActors = (status: string): ApprovalActor[] => [
  { id: 'wang', name: '王经理', status: 'approved' },
  { id: 'li', name: '李总监', status: status === 'approved' ? 'approved' : 'pending' },
];

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
  actors: managerActors(status),
  approverPolicy: [{ type: 'role', key: 'manager' }],
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
    approverPolicy: [{ type: 'fixed', actors: [{ id: assignee, name: findContactUser(assignee)?.name ?? assignee }] }],
    order: 2,
  },
  managerStep('pending', null, undefined, 3),
  archiveStep('pending', undefined, 4),
];

const seedTasksForNode = (node: ApprovalStep, origin: WorkflowTask['origin'] = 'definition'): ApprovalTask[] => {
  const actors = node.actors && node.actors.length > 0 ? node.actors : node.actor ? [node.actor] : [];
  const signMode = node.signMode ?? 'sequential';
  return actors.map((item, index) => ({
    id: `${node.key}:${item.id ?? index}`,
    nodeKey: node.key,
    assignee: { ...item },
    status: signMode === 'sequential' && index === 0 ? 'active' : 'pending',
    origin,
  }));
};

const countersignPendingSteps = (starter: string, actors: ApprovalActor[], time: string): ApprovalStep[] => [
  startStep(starter, time, 1),
  {
    key: 'countersign',
    title: '会签审批',
    status: 'active',
    kind: 'approve',
    signMode: 'countersign',
    actor: actors[0],
    actors,
    approverPolicy: [{ type: 'fixed', actors: actors.map((item) => ({ id: String(item.id), name: item.name })) }],
    order: 2,
  },
];

export function seedApprovals(): ApprovalInstance[] {
  const countersignActors: ApprovalActor[] = [
    { id: 'admin', name: '管理员', status: 'approved' },
    { id: 'demo', name: '演示用户', status: 'pending' },
    { id: 'wang', name: '王经理', status: 'pending' },
  ];
  const countersignSteps = countersignPendingSteps('admin', countersignActors, '2026-09-10 09:00');
  const countersignNode = countersignSteps.find((step) => step.key === 'countersign')!;
  const countersignTasks = seedTasksForNode(countersignNode);
  countersignTasks[0] = {
    ...countersignTasks[0]!,
    status: 'approved',
    action: 'approve',
    actedAt: '2026-09-10 09:00',
    comment: '先签一票',
  };

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
    {
      id: 'AP-1006',
      title: '会签演示：采购权限开通 1/3',
      category: '采购',
      starter: 'admin',
      assignee: 'demo',
      cc: ['fang'],
      status: 'pending',
      currentStepKey: 'countersign',
      reason: '按人会签演示：管理员已同意，待 demo / 王经理。',
      amount: '8600',
      actedBy: ['admin'],
      createdAt: '2026-09-10 09:00',
      updatedAt: '2026-09-10 09:00',
      steps: countersignSteps,
      tasks: countersignTasks,
      history: [
        {
          at: '2026-09-10 09:00',
          actorId: 'admin',
          action: 'approve',
          comment: '先签一票',
          nodeKey: 'countersign',
          taskId: countersignTasks[0]?.id,
        },
      ],
    },
  ];
}

const inTodo = (item: ApprovalInstance, username: string) => {
  if (item.status !== 'pending') return false;
  if (item.tasks) {
    return item.tasks.some(
      (task) =>
        (task.status === 'pending' || task.status === 'active') &&
        (sameUser(task.assignee.id, username) || sameUser(task.assignee.name, username)),
    );
  }
  return sameUser(item.assignee, username);
};

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
    if (normalized === 'todo') return inTodo(item, username);
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
  if (
    action === 'transfer' ||
    action === 'comment' ||
    action === 'addsign' ||
    action === 'return' ||
    action === 'cancel' ||
    action === 'withdraw' ||
    action === 'request_changes'
  ) {
    return null;
  }
  if (item.status === 'approved') return 'resolved';
  if (item.status === 'rejected') return 'closed';
  if (item.status === 'pending') {
    return item.currentStepKey === 'lead' || item.currentStepKey === 'start' ? 'accepted' : 'progress';
  }
  return null;
};

function toWorkflowInstance(item: ApprovalInstance): WorkflowInstance {
  const inst: WorkflowInstance = {
    id: item.id,
    status: item.status === 'pending' ? 'active' : item.status,
    steps: item.steps as WorkflowTimelineStep[],
    cursor: item.currentStepKey ? { nodeKey: item.currentStepKey } : undefined,
    history: item.history as WorkflowHistoryEntry[] | undefined,
    formValues: item.formValues,
    starter: { id: item.starter, name: item.starter },
    resumeToNodeKey: item.resumeToNodeKey,
  };
  if (item.tasks) inst.tasks = item.tasks as WorkflowTask[];
  return inst;
}

function actorIdOf(value?: ApprovalActor | WorkflowTimelineActor | null): string | undefined {
  if (!value) return undefined;
  if (value.id != null && String(value.id).trim()) return String(value.id);
  if (value.name && value.name.trim()) return value.name.trim();
  return undefined;
}

function deriveAssignee(item: ApprovalInstance): string {
  if (item.tasks) {
    const open = item.tasks.find((task) => task.status === 'pending' || task.status === 'active');
    const id = actorIdOf(open?.assignee);
    if (id) return id;
  }
  const current = item.steps.find((step) => step.key === item.currentStepKey) ?? item.steps.find((step) => step.status === 'active');
  return actorIdOf(current?.actor) ?? item.assignee;
}

function applyReduced(item: ApprovalInstance, next: WorkflowInstance) {
  item.steps = next.steps as ApprovalStep[];
  item.tasks = next.tasks as ApprovalTask[] | undefined;
  item.history = next.history as ApprovalHistoryEntry[] | undefined;
  item.currentStepKey = next.cursor?.nodeKey;
  item.resumeToNodeKey = next.resumeToNodeKey;
  item.status = next.status === 'active' || next.status === 'pending' ? 'pending' : ((next.status as ApprovalStatus) ?? item.status);
  item.assignee = deriveAssignee(item);
}

function resolveActionAssignees(body: ApprovalActionBody): WorkflowTimelineActor[] {
  if (body.assignees && body.assignees.length > 0) {
    return body.assignees.map((item) => asTimelineActor(contactActorFromId(String(item.id ?? item.name ?? '')) as ApprovalActor));
  }
  return (body.addsignTo ?? []).map((id) => asTimelineActor(actor(id)));
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
    useTasks?: boolean;
    template?: string;
    starterPick?: string[];
  },
  now: string,
): { error?: string; nextNumber: number; detail?: ApprovalDetail } {
  const title = (body.title ?? '').trim();
  if (!title) return { error: '审批标题不能为空', nextNumber };
  const starter = username.trim() || 'unknown';
  const assignee = clamp(body.assignee, 40, 'admin');
  const template = (body.template ?? 'ticket').trim().toLowerCase();
  const useTasks = body.useTasks === true || template === 'countersign';
  const starterPick = (body.starterPick ?? []).map((item) => item.trim()).filter(Boolean);
  const formValues: Record<string, unknown> = {};
  if (starterPick.length) formValues.starterPick = starterPick;
  if (body.amount?.trim()) formValues.amount = body.amount.trim();

  let steps = pendingTicketSteps(starter, assignee, now);
  let tasks: ApprovalTask[] | undefined;
  let currentStepKey = 'lead';
  let resolvedAssignee = assignee;

  if (template === 'countersign') {
    const names = starterPick.length >= 2 ? starterPick : ['admin', 'demo', 'wang'];
    const actors = names.map((name) => actor(name));
    steps = countersignPendingSteps(starter, actors, now);
    const node = steps.find((step) => step.key === 'countersign')!;
    tasks = useTasks ? seedTasksForNode(node) : undefined;
    currentStepKey = 'countersign';
    resolvedAssignee = String(actors[0]?.id ?? assignee);
  } else if (useTasks) {
    const lead = steps.find((step) => step.key === 'lead')!;
    tasks = seedTasksForNode(lead);
  }

  const instance: ApprovalInstance = {
    id: `AP-${nextNumber}`,
    title: title.slice(0, 120),
    category: clamp(body.category, 40, '工单'),
    ticketId: body.ticketId?.trim() || null,
    starter,
    assignee: resolvedAssignee,
    cc: [...new Set((body.cc ?? []).map((item) => clamp(item, 40, item)).filter(Boolean))],
    status: 'pending',
    currentStepKey,
    reason: clamp(body.reason, 2000, '（无说明）'),
    amount: body.amount?.trim() ? clamp(body.amount, 32, '') : null,
    actedBy: [],
    createdAt: now,
    updatedAt: now,
    steps,
    tasks,
    history: [{ at: now, actorId: starter, action: 'approve', comment: '提交申请', nodeKey: 'start' }],
    formValues: Object.keys(formValues).length ? formValues : undefined,
  };
  items.unshift(instance);
  return { nextNumber: nextNumber + 1, detail: toDetail(instance) };
}

export function applyApprovalAction(
  items: ApprovalInstance[],
  id: string,
  username: string,
  body: ApprovalActionBody,
  now: string,
): ApprovalMutation {
  const raw = (body.action ?? '').trim().toLowerCase();
  const action = (raw === 'withdraw' ? 'cancel' : raw) as ApprovalAction;
  if (!ACTIONS.includes(raw as ApprovalAction) && action !== 'cancel') {
    return { ok: false, status: 400, message: '无效的审批动作' };
  }
  const item = items.find((entry) => entry.id.toLowerCase() === id.toLowerCase());
  if (!item) return { ok: false, status: 404, message: '审批实例不存在' };
  if (item.status === 'approved' || item.status === 'rejected' || item.status === 'canceled') {
    if (action !== 'comment') return { ok: false, status: 400, message: '当前审批已结束，不能再操作' };
  }

  const actorName = username.trim() || 'unknown';
  const comment = body.comment == null ? undefined : clamp(body.comment, 500, '');
  if (action === 'comment' && !comment) return { ok: false, status: 400, message: '评论内容不能为空' };

  const transferTo = (body.transferTo ?? '').trim();
  const assignee = body.assignee
    ? contactActorFromId(String(body.assignee.id ?? body.assignee.name ?? ''))
    : transferTo
      ? contactActorFromId(clamp(transferTo, 40, transferTo))
      : undefined;
  if (action === 'transfer' && !assignee) return { ok: false, status: 400, message: '转交对象不能为空' };

  const assignees = resolveActionAssignees(body);
  if (action === 'addsign' && assignees.length === 0) {
    return { ok: false, status: 400, message: '加签对象不能为空' };
  }
  if (action === 'return' && !(body.targetNodeKey ?? '').trim()) {
    return { ok: false, status: 400, message: '请选择退回节点' };
  }

  const runtime: WorkflowRuntimeAction = {
    action: action === 'withdraw' ? 'cancel' : action,
    actorId: actorName,
    taskId: body.taskId,
    nodeKey: body.nodeKey,
    comment,
    at: now,
    assignee,
    assignees: assignees.length ? assignees : undefined,
    position: body.position === 'after' ? 'after' : body.position === 'before' ? 'before' : undefined,
    signMode: body.signMode === 'countersign' || body.signMode === 'orsign' || body.signMode === 'sequential'
      ? body.signMode
      : undefined,
    targetNodeKey: body.targetNodeKey,
    resume: body.resume === 'direct' || body.resume === 'resequence' ? body.resume : undefined,
    tempNodeKey: body.tempNodeKey,
  };

  const before = toWorkflowInstance(item);
  const next = reduceWorkflowAction(before, runtime);
  if (next === before) {
    const message =
      action === 'transfer'
        ? '转交对象不能为空'
        : action === 'addsign'
          ? '加签对象不能为空'
          : action === 'return' || action === 'request_changes'
            ? '没有可退回的节点'
            : action === 'cancel'
              ? '只有发起人可以撤回'
              : action === 'approve' || action === 'reject'
                ? '当前用户没有可处理的审批任务'
                : '当前动作无法执行';
    return { ok: false, status: 400, message };
  }

  applyReduced(item, next);
  if (action !== 'comment') remember(item, actorName);
  else {
    const active = item.steps.find((step) => step.status === 'active') ?? item.steps.find((step) => step.key === item.currentStepKey);
    if (active) {
      active.comment = active.comment ? `${active.comment}\n${comment}` : comment;
      active.time = now;
    }
  }
  item.updatedAt = now;

  return {
    ok: true,
    status: 200,
    detail: toDetail(item),
    ticketId: item.ticketId,
    ticketStatus: ticketStatusFor(item, action),
  };
}

export function resolveHostApprovers(
  source: unknown,
  starter?: string,
  formValues?: Record<string, unknown>,
  starterPick?: string[],
) {
  const values = { ...(formValues ?? {}) };
  if (starterPick?.length) values.starterPick = starterPick;
  const list = Array.isArray(source) ? source : [source];
  const typed = list.filter(isApproverSourceLike) as ApproverSource[];
  return resolveApprovers(typed, {
    starter: contactActorFromId(starter),
    formValues: values,
  });
}

export function restoreApprovals(raw: unknown, fallback: ApprovalInstance[]): ApprovalInstance[] {
  if (!Array.isArray(raw)) return fallback.map(cloneInstance);
  return raw.map((item) => cloneInstance(item as ApprovalInstance));
}
