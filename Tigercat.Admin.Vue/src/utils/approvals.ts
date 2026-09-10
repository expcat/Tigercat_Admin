import type {
  FormValues,
  SchemaFormSchema,
  TagVariant,
  WorkflowActionBarViewerRole,
  WorkflowActionPayload,
  WorkflowFieldPermissionMode,
  WorkflowNodeButtonPolicy,
  WorkflowReturnTarget,
  WorkflowTimelineActor,
  WorkflowTimelineStep,
} from '@expcat/tigercat-core';
import {
  createFullWorkflowButtonPolicy,
  getCurrentWorkflowStep,
} from '@expcat/tigercat-core';
import { apiRequest } from './request';
import { getAuthHeaders, safeParse } from './auth';
import { SESSION_KEY } from './constants';
import type {
  ApprovalAction,
  ApprovalActionPayload,
  ApprovalContactUser,
  ApprovalDetail,
  ApprovalLane,
  ApprovalListItem,
  ApprovalStatus,
  ApprovalStep,
  CreateApprovalPayload,
  PagedResult,
  Session,
} from './types';

export const APPROVAL_LANES: { value: ApprovalLane; label: string }[] = [
  { value: 'todo', label: '待办' },
  { value: 'done', label: '已办' },
  { value: 'cc', label: '抄送' },
  { value: 'started', label: '我发起的' },
];

export const APPROVAL_CATEGORY_OPTIONS = [
  { label: '工单', value: '工单' },
  { label: '请假', value: '请假' },
  { label: '报销', value: '报销' },
  { label: '采购', value: '采购' },
];

export const APPROVAL_TRANSFER_OPTIONS = [
  { label: 'admin', value: 'admin' },
  { label: 'demo', value: 'demo' },
];

export const EMPTY_APPROVAL_CREATE: FormValues = {
  title: '',
  category: '工单',
  reason: '',
  assignee: 'admin',
  ticketId: '',
};

export const APPROVAL_CREATE_SCHEMA: SchemaFormSchema = {
  fields: [
    { name: 'title', label: '标题', required: true, placeholder: '例如：请假、报销或工单升级' },
    { name: 'category', label: '类型', type: 'select', options: APPROVAL_CATEGORY_OPTIONS },
    { name: 'assignee', label: '处理人', type: 'select', options: APPROVAL_TRANSFER_OPTIONS },
    { name: 'ticketId', label: '关联工单', placeholder: '可选，如 TK-2048' },
    { name: 'reason', label: '说明', type: 'textarea', placeholder: '申请原因' },
  ],
};

export const APPROVAL_DETAIL_SCHEMA: SchemaFormSchema = {
  fields: [
    { name: 'title', label: '标题' },
    { name: 'category', label: '类型' },
    { name: 'starter', label: '发起人' },
    { name: 'amount', label: '金额 / 天数', extra: '仅财务节点可编辑' },
    { name: 'ticketId', label: '关联工单' },
    { name: 'reason', label: '说明', type: 'textarea' },
  ],
};

export const APPROVAL_DEMO_ACTOR_KEY = 'tigercat-admin:approval-actor';
export const APPROVAL_DEMO_ACTOR_EVENT = 'tigercat:approval-actor-changed';

export const FALLBACK_APPROVAL_CONTACTS: ApprovalContactUser[] = [
  { id: 'admin', name: '管理员', username: 'admin', deptId: 'ops', deptName: '运维部', roleKeys: ['admin', 'staff'], groupKeys: ['ops'], managerId: 'wang' },
  { id: 'demo', name: '演示用户', username: 'demo', deptId: 'ops', deptName: '运维部', roleKeys: ['staff'], groupKeys: ['ops'], managerId: 'admin' },
  { id: 'wang', name: '王经理', username: 'wang', deptId: 'ops', deptName: '运维部', roleKeys: ['manager'], groupKeys: ['managers'], managerId: 'li' },
  { id: 'li', name: '李总监', username: 'li', deptId: 'ops', deptName: '运维部', roleKeys: ['director'], groupKeys: ['managers'] },
  { id: 'chen', name: '陈财务', username: 'chen', deptId: 'finance', deptName: '财务部', roleKeys: ['finance'], groupKeys: ['finance'], managerId: 'zhao' },
  { id: 'zhao', name: '赵主管', username: 'zhao', deptId: 'finance', deptName: '财务部', roleKeys: ['manager', 'finance'], groupKeys: ['managers', 'finance'], managerId: 'li' },
  { id: 'fang', name: '方人事', username: 'fang', deptId: 'hr', deptName: '人事部', roleKeys: ['hr'], groupKeys: ['hr'], managerId: 'li' },
];

export function approvalCreateFromValues(values: FormValues): CreateApprovalPayload {
  return {
    title: String(values.title ?? '').trim(),
    category: String(values.category ?? '工单'),
    reason: String(values.reason ?? '').trim() || undefined,
    assignee: String(values.assignee ?? 'admin'),
    ticketId: String(values.ticketId ?? '').trim() || undefined,
  };
}

export const APPROVAL_STATUS_META: Record<ApprovalStatus, { label: string; variant: TagVariant }> = {
  pending: { label: '审批中', variant: 'warning' },
  approved: { label: '已通过', variant: 'success' },
  rejected: { label: '已驳回', variant: 'danger' },
  canceled: { label: '已撤销', variant: 'default' },
};

export const APPROVAL_PAGE_SIZE = 20;

export function isApprovalLane(value: string): value is ApprovalLane {
  return APPROVAL_LANES.some((item) => item.value === value);
}

export function toWorkflowSteps(detail: ApprovalDetail | null): WorkflowTimelineStep[] {
  return (detail?.steps ?? []) as WorkflowTimelineStep[];
}

export function isApprovalTerminal(status?: ApprovalStatus) {
  return status === 'approved' || status === 'rejected' || status === 'canceled';
}

export function getSessionUsername() {
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  return session?.username?.trim() || 'admin';
}

export function getApprovalDemoActor() {
  try {
    const stored = localStorage.getItem(APPROVAL_DEMO_ACTOR_KEY)?.trim();
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return getSessionUsername();
}

export function setApprovalDemoActor(id: string) {
  const next = id.trim();
  try {
    if (next) localStorage.setItem(APPROVAL_DEMO_ACTOR_KEY, next);
    else localStorage.removeItem(APPROVAL_DEMO_ACTOR_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(APPROVAL_DEMO_ACTOR_EVENT, { detail: next }));
  }
}

export function approvalAuthHeaders(): HeadersInit {
  const actor = getApprovalDemoActor();
  return {
    ...getAuthHeaders(),
    ...(actor ? { 'X-Demo-Actor': actor } : {}),
  };
}

function sameActor(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());
}

export function currentApprovalStep(detail: ApprovalDetail | null): ApprovalStep | undefined {
  if (!detail) return undefined;
  const steps = toWorkflowSteps(detail);
  const current = getCurrentWorkflowStep(steps);
  if (current) return current as ApprovalStep;
  return detail.steps.find((step) => step.key === detail.currentStepKey) ?? detail.steps.find((step) => step.status === 'active');
}

export function actorHasOpenTask(detail: ApprovalDetail | null, actorId: string) {
  if (!detail?.tasks?.length) {
    return sameActor(detail?.assignee, actorId);
  }
  return detail.tasks.some(
    (task) =>
      (task.status === 'pending' || task.status === 'active') &&
      (sameActor(task.assignee.id, actorId) || sameActor(task.assignee.name, actorId)),
  );
}

export function approvalIsStarter(detail: ApprovalDetail | null, actorId: string) {
  return sameActor(detail?.starter, actorId);
}

export function approvalViewerRole(detail: ApprovalDetail | null, actorId: string): WorkflowActionBarViewerRole {
  if (!detail) return 'approver';
  const step = currentApprovalStep(detail);
  if (step?.kind === 'start' && approvalIsStarter(detail, actorId) && !isApprovalTerminal(detail.status)) {
    return 'approver';
  }
  if (actorHasOpenTask(detail, actorId)) return 'approver';
  if (approvalIsStarter(detail, actorId)) return 'starter';
  if (detail.cc.some((name) => sameActor(name, actorId))) return 'cc';
  return 'cc';
}

export function approvalFieldMode(detail: ApprovalDetail | null, actorId: string): WorkflowFieldPermissionMode {
  if (!detail || isApprovalTerminal(detail.status)) return 'readonly';
  const step = currentApprovalStep(detail);
  if (step?.kind === 'start' && approvalIsStarter(detail, actorId)) return 'initiate';
  if (actorHasOpenTask(detail, actorId)) return 'approve';
  return 'readonly';
}

export function approvalFormModel(detail: ApprovalDetail | null): FormValues {
  if (!detail) return {};
  return {
    title: detail.title,
    category: detail.category,
    starter: detail.starter,
    reason: detail.reason,
    amount: detail.amount ?? '',
    ticketId: detail.ticketId ?? '',
    ...(detail.formValues ?? {}),
  };
}

export function approvalButtonPolicy(detail: ApprovalDetail | null): WorkflowNodeButtonPolicy {
  const step = currentApprovalStep(detail);
  const policy = step?.buttonPolicy as WorkflowNodeButtonPolicy | undefined;
  if (policy?.buttons && policy.buttons.length > 0) return policy;
  return createFullWorkflowButtonPolicy();
}

export function approvalReturnTargets(detail: ApprovalDetail | null): WorkflowReturnTarget[] {
  return (detail?.returnTargets ?? []) as WorkflowReturnTarget[];
}

export function contactActorOf(user: ApprovalContactUser): WorkflowTimelineActor {
  return { id: user.id, name: user.name };
}

export function fetchApprovals(query: {
  lane?: ApprovalLane;
  keyword?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams({
    lane: query.lane ?? 'todo',
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? APPROVAL_PAGE_SIZE),
  });
  if (query.keyword?.trim()) params.set('keyword', query.keyword.trim());
  return apiRequest<PagedResult<ApprovalListItem>>(`/api/approvals?${params}`, {
    headers: approvalAuthHeaders(),
  });
}

export function fetchApproval(id: string) {
  return apiRequest<ApprovalDetail>(`/api/approvals/${encodeURIComponent(id)}`, {
    headers: approvalAuthHeaders(),
  });
}

export function fetchApprovalContacts() {
  return apiRequest<{ users: ApprovalContactUser[] }>('/api/approvals/contacts', {
    headers: approvalAuthHeaders(),
  });
}

export function createApproval(payload: CreateApprovalPayload) {
  return apiRequest<ApprovalDetail>('/api/approvals', {
    method: 'POST',
    headers: approvalAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function applyApprovalAction(id: string, payload: ApprovalActionPayload) {
  return apiRequest<ApprovalDetail>(`/api/approvals/${encodeURIComponent(id)}/actions`, {
    method: 'POST',
    headers: approvalAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function workflowActionToPayload(
  action: ApprovalAction,
  payload?: WorkflowActionPayload,
  formValues?: FormValues,
): ApprovalActionPayload {
  const assignee = payload?.assignee;
  const assignees = payload?.assignees?.length ? payload.assignees : assignee ? [assignee] : undefined;
  return {
    action,
    comment: payload?.comment?.trim() || undefined,
    transferTo: action === 'transfer' ? String(assignee?.id ?? assignee?.name ?? '') : undefined,
    assignee: assignee ? { id: String(assignee.id ?? ''), name: assignee.name } : undefined,
    assignees: assignees?.map((item) => ({ id: String(item.id ?? ''), name: item.name })),
    addsignTo: action === 'addsign' ? assignees?.map((item) => String(item.id ?? item.name ?? '')).filter(Boolean) : undefined,
    position: payload?.position,
    signMode: payload?.signMode,
    targetNodeKey: payload?.targetNodeKey,
    resume: payload?.resume,
    taskId: payload?.taskId,
    formValues,
  };
}

export function actionSuccessMessage(action: ApprovalAction) {
  if (action === 'approve') return '已同意，实例状态已写回';
  if (action === 'reject') return '已驳回，实例状态已写回';
  if (action === 'transfer') return '已转交，实例状态已写回';
  if (action === 'addsign') return '已加签，实例状态已写回';
  if (action === 'return' || action === 'request_changes') return '已退回，实例状态已写回';
  if (action === 'cancel' || action === 'withdraw') return '已撤回，实例状态已写回';
  return '已记录评论';
}
