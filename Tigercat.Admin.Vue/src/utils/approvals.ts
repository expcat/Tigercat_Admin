import type { TagVariant, WorkflowActionBarItem, WorkflowTimelineStep } from '@expcat/tigercat-core';
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

export const APPROVAL_WORKFLOW_ACTIONS: WorkflowActionBarItem[] = [
  { key: 'approve', label: '通过', action: 'approve', variant: 'primary' },
  { key: 'reject', label: '驳回', action: 'reject', variant: 'danger' },
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
  return '已记录评论';
}
