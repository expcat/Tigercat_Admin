export const SESSION_KEY = 'tigercat.admin.session';
export const THEME_STORAGE_KEY = 'tigercat.admin.theme';

export const GUEST_AUTH_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/register-success',
] as const;

export function normalizeAuthPath(value: string): string {
  let next = value.trim();
  if (!next) return '';
  if (next.startsWith('#/')) next = next.slice(1);
  const hashIdx = next.indexOf('#/');
  if (hashIdx >= 0) next = next.slice(hashIdx + 1);
  const queryIdx = next.indexOf('?');
  if (queryIdx >= 0) next = next.slice(0, queryIdx);
  if (!next.startsWith('/')) next = `/${next}`;
  if (next.length > 1 && next.endsWith('/')) next = next.slice(0, -1);
  return next;
}

export function isGuestAuthPath(value: string): boolean {
  return (GUEST_AUTH_PATHS as readonly string[]).includes(normalizeAuthPath(value));
}

export function isBrowserOnGuestAuthPage(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    isGuestAuthPath(window.location.hash) ||
    isGuestAuthPath(window.location.pathname) ||
    isGuestAuthPath(`${window.location.pathname}${window.location.hash}`)
  );
}

export const DEMO_OTP_CODE = '123456';
export const OTP_LENGTH = 6;
export const OTP_RESEND_MS = 60_000;
export const PHONE_MASK = '### #### ####';

export const COLOR_PRESETS = [
  { label: '蓝色', value: '#2563eb' },
  { label: '紫色', value: '#7c3aed' },
  { label: '青色', value: '#0891b2' },
  { label: '绿色', value: '#16a34a' },
  { label: '橙色', value: '#ea580c' },
  { label: '红色', value: '#dc2626' },
  { label: '粉色', value: '#db2777' },
  { label: '灰色', value: '#475569' },
] as const;
