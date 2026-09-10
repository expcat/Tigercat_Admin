import type {
  FormValues,
  SchemaFormSchema,
  TagVariant,
  WorkflowActionBarItem,
  WorkflowTimelineStep,
} from '@expcat/tigercat-core';
import { apiRequest } from './request';
import { getAuthHeaders } from './auth';
import type {
  ApprovalAction,
  ApprovalActionPayload,
  ApprovalDetail,
  ApprovalLane,
  ApprovalListItem,
  ApprovalStatus,
  CreateApprovalPayload,
  PagedResult,
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

export function approvalCreateFromValues(values: FormValues): CreateApprovalPayload {
  return {
    title: String(values.title ?? '').trim(),
    category: String(values.category ?? '工单'),
    reason: String(values.reason ?? '').trim() || undefined,
    assignee: String(values.assignee ?? 'admin'),
    ticketId: String(values.ticketId ?? '').trim() || undefined,
  };
}

export const APPROVAL_WORKFLOW_ACTIONS: WorkflowActionBarItem[] = [
  { key: 'approve', label: '同意', action: 'approve', variant: 'primary' },
  { key: 'reject', label: '拒绝', action: 'reject', variant: 'danger' },
  { key: 'transfer', label: '转交', action: 'transfer', variant: 'outline', confirm: false },
];

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
    headers: getAuthHeaders(),
  });
}

export function fetchApproval(id: string) {
  return apiRequest<ApprovalDetail>(`/api/approvals/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });
}

export function createApproval(payload: CreateApprovalPayload) {
  return apiRequest<ApprovalDetail>('/api/approvals', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function applyApprovalAction(id: string, payload: ApprovalActionPayload) {
  return apiRequest<ApprovalDetail>(`/api/approvals/${encodeURIComponent(id)}/actions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
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
