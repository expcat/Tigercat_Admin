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

export function getSessionToken(): string | null {
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  return session?.token ?? null;
}

export function getAuthHeaders(): HeadersInit {
  const token = getSessionToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function detectForgotChannel(target: string): ForgotChannel {
  return target.includes('@') ? 'email' : 'phone';
}

export function isPhoneIdentity(target: string): boolean {
  const value = target.trim();
  return value.length > 0 && !value.includes('@') && /^1\d*$/.test(value.replace(/\s/g, ''));
}

export function getSafeReturnTo(value: unknown): string {
  if (typeof value !== 'string') return '/dashboard';
  const path = value.startsWith('#/') ? value.slice(1) : value;
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u001f]/.test(path)) {
    return '/dashboard';
  }
  const url = new URL(path, window.location.origin);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  if (url.origin !== window.location.origin || [
    '/', '/login', '/register', '/forgot-password', '/register-success', '/403', '/404', '/500',
  ].includes(pathname)) return '/dashboard';
  return `${url.pathname}${url.search}${url.hash}`;
}

export function fetchTwoFactorStatus(signal?: AbortSignal) {
  return apiRequest<TwoFactorStatus>('/api/auth/two-factor', {
    headers: getAuthHeaders(),
    signal,
  });
}

export function updateTwoFactorEnabled(enabled: boolean, signal?: AbortSignal) {
  return apiRequest<TwoFactorStatus>('/api/auth/two-factor', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ enabled }),
    signal,
  });
}
