import { PAGE_KEYS } from './constants';

export const safeParse = <T = any>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const getPageFromHash = (): string => {
  const parts = window.location.hash.split('/');
  const raw = parts.length > 1 ? parts[parts.length - 1] : '';
  const clean = raw.replace('#', '').trim();
  return PAGE_KEYS.includes(clean) ? clean : 'login';
};
