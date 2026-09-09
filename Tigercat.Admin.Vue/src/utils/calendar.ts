import { apiRequest } from './request';
import { getAuthHeaders } from './auth';

export type CalendarEventType = 'meeting' | 'review' | 'release' | 'reminder';

export interface CalendarEvent {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  type: CalendarEventType;
  location: string;
}

export interface CreateCalendarEventPayload {
  date: string;
  start: string;
  end: string;
  title: string;
  type: CalendarEventType;
  location: string;
}

export const CALENDAR_EVENT_COLORS: Record<CalendarEventType, string> = {
  meeting: '#2563eb',
  review: '#d97706',
  release: '#dc2626',
  reminder: '#0284c7',
};

export function toCalendarCellEvents(events: CalendarEvent[]) {
  return events.map((item) => ({
    key: item.id,
    title: item.title,
    date: item.date,
    color: CALENDAR_EVENT_COLORS[item.type],
  }));
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatCalendarDate(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function calendarQueryRange(selected: Date): { from: string; to: string } {
  const today = new Date();
  const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const monthEnd = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
  const upcomingEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);
  const from = monthStart < today ? monthStart : today;
  const to = monthEnd > upcomingEnd ? monthEnd : upcomingEnd;
  return { from: formatCalendarDate(from), to: formatCalendarDate(to) };
}

export function fetchCalendarEvents(from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  return apiRequest<CalendarEvent[]>(`/api/calendar/events?${params}`, {
    headers: getAuthHeaders(),
  });
}

export function createCalendarEvent(payload: CreateCalendarEventPayload) {
  return apiRequest<CalendarEvent>('/api/calendar/events', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}
