import type { Session } from './types';
import { SESSION_KEY } from './constants';

export const safeParse = <T = any>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export function getAuthHeaders(): HeadersInit {
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  if (!session?.token) return {};
  return { Authorization: `Bearer ${session.token}` };
}
