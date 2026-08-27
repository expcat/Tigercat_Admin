import { apiRequest } from './request';
import type { ForgotChannel, Session, TwoFactorStatus } from './types';
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

export function detectForgotChannel(target: string): ForgotChannel {
  return target.includes('@') ? 'email' : 'phone';
}

export function isPhoneIdentity(target: string): boolean {
  const value = target.trim();
  return value.length > 0 && !value.includes('@') && /^1\d*$/.test(value.replace(/\s/g, ''));
}

export function fetchTwoFactorStatus() {
  return apiRequest<TwoFactorStatus>('/api/auth/two-factor', {
    headers: getAuthHeaders(),
  });
}

export function updateTwoFactorEnabled(enabled: boolean) {
  return apiRequest<TwoFactorStatus>('/api/auth/two-factor', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ enabled }),
  });
}
