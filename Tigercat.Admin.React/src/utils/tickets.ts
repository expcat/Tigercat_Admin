import type { WorkflowActionBarItem, WorkflowTimelineAction, WorkflowTimelineStep } from '@expcat/tigercat-core';
import { apiRequest } from './request';
import { getAuthHeaders } from './auth';
import type {
  CreateTicketPayload,
  PagedResult,
  Ticket,
  TicketStatus,
  UpdateTicketPayload,
} from './types';

export const TICKET_WORKFLOW_ACTIONS: WorkflowActionBarItem[] = [
  { key: 'approve', label: '同意', action: 'approve', variant: 'primary' },
  { key: 'reject', label: '拒绝', action: 'reject', variant: 'danger' },
  { key: 'transfer', label: '转交', action: 'transfer', variant: 'outline' },
  { key: 'comment', label: '评论', action: 'comment', variant: 'ghost' },
  { key: 'cancel', label: '撤回', action: 'cancel', variant: 'danger', disabled: true },
];

type WorkflowLane = 'submit' | 'lead' | 'manager' | 'archive';
type WorkflowLaneStatus = NonNullable<WorkflowTimelineStep['status']>;

function workflowLaneStatus(status: TicketStatus): Record<WorkflowLane, WorkflowLaneStatus> {
  switch (status) {
    case 'open':
      return { submit: 'approved', lead: 'active', manager: 'pending', archive: 'pending' };
    case 'accepted':
    case 'progress':
      return { submit: 'approved', lead: 'approved', manager: 'active', archive: 'pending' };
    case 'resolved':
      return { submit: 'approved', lead: 'approved', manager: 'approved', archive: 'approved' };
    case 'closed':
      return { submit: 'approved', lead: 'approved', manager: 'approved', archive: 'canceled' };
  }
}

export function getTicketWorkflowSteps(ticket: Ticket): WorkflowTimelineStep[] {
  const lane = workflowLaneStatus(ticket.status);
  const waiting = '待处理';
  const leadTime = lane.lead === 'pending' ? undefined : lane.lead === 'active' ? waiting : ticket.updatedAt;
  const managerTime =
    lane.manager === 'pending' ? undefined : lane.manager === 'active' ? waiting : ticket.updatedAt;
  const archiveTime = lane.archive === 'pending' ? undefined : ticket.updatedAt;

  return [
    {
      key: 'submit',
      title: '提交工单',
      status: lane.submit,
      actor: { name: ticket.requester },
      comment: '请协助处理该工单。',
      time: ticket.createdAt,
      action: 'approve',
      order: 1,
    },
    {
      key: 'lead',
      title: '组长审批',
      status: lane.lead,
      actor: { name: '王小虎' },
      ...(lane.lead === 'approved' ? { comment: '已受理，转经理审批。', action: 'approve' as const } : {}),
      ...(leadTime ? { time: leadTime } : {}),
      order: 2,
    },
    {
      key: 'manager',
      title: '经理审批',
      status: lane.manager,
      actor: { name: '李工' },
      ...(lane.manager === 'approved' ? { comment: '处理完成，可以归档。', action: 'approve' as const } : {}),
      ...(managerTime ? { time: managerTime } : {}),
      order: 3,
    },
    {
      key: 'archive',
      title: '归档',
      status: lane.archive,
      actor: { name: '系统' },
      ...(lane.archive === 'approved'
        ? { comment: '工单已归档。', action: 'approve' as const }
        : lane.archive === 'canceled'
          ? { comment: '工单已关闭，未走归档。', action: 'cancel' as const }
          : {}),
      ...(archiveTime ? { time: archiveTime } : {}),
      order: 4,
    },
  ];
}

export function fetchTickets(query: {
  page?: number;
  pageSize?: number;
  status?: TicketStatus | 'all';
  keyword?: string;
}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 50),
  });
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.keyword?.trim()) params.set('keyword', query.keyword.trim());
  return apiRequest<PagedResult<Ticket>>(`/api/tickets?${params}`, {
    headers: getAuthHeaders(),
  });
}

export function fetchTicket(id: string) {
  return apiRequest<Ticket>(`/api/tickets/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });
}

export function createTicket(payload: CreateTicketPayload) {
  return apiRequest<Ticket>('/api/tickets', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateTicket(id: string, payload: UpdateTicketPayload) {
  return apiRequest<Ticket>(`/api/tickets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function nextTicketStatusForWorkflow(
  status: TicketStatus,
  action: WorkflowTimelineAction,
): TicketStatus | null {
  if (action === 'approve') {
    if (status === 'open') return 'accepted';
    if (status === 'accepted') return 'progress';
    if (status === 'progress') return 'resolved';
    return null;
  }
  if (action === 'reject') {
    return status === 'closed' ? null : 'closed';
  }
  return null;
}

export function sendTicketMessage(id: string, content: string) {
  return apiRequest<Ticket>(`/api/tickets/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
}
