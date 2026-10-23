import { apiRequest } from './request';
import { getAuthHeaders } from './auth';

import type { CalendarEvent, CalendarEventType, CreateCalendarEventPayload } from './types';

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

export function parseCalendarDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) && formatCalendarDate(date) === value ? date : null;
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

export function fetchCalendarEvents(from: string, to: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ from, to });
  return apiRequest<CalendarEvent[]>(`/api/calendar/events?${params}`, {
    headers: getAuthHeaders(),
    signal,
  });
}

export function createCalendarEvent(payload: CreateCalendarEventPayload) {
  return apiRequest<CalendarEvent>('/api/calendar/events', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}
