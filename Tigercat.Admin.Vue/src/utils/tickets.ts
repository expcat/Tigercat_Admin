import { apiRequest } from './request';
import { getAuthHeaders } from './auth';
import type {
  CreateTicketPayload,
  PagedResult,
  Ticket,
  TicketStatus,
  UpdateTicketPayload,
} from './types';

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

export function sendTicketMessage(id: string, content: string) {
  return apiRequest<Ticket>(`/api/tickets/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
}
