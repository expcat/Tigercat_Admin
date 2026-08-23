import { useCallback, useEffect, useState } from 'react';

export const LOCK_SCREEN_STORAGE_KEY = 'tigercat-admin:lock-screen';

/** Demo PIN — same 6-digit convention as login OTP. */
export const LOCK_SCREEN_PIN = '123456';
export const LOCK_SCREEN_PIN_LENGTH = 6;

export type LockScreenClock = {
  title: string;
  value: string;
};

export function loadLockScreenState(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const raw = window.sessionStorage.getItem(LOCK_SCREEN_STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return false;
    }

    return (parsed as { locked?: unknown }).locked === true;
  } catch {
    return false;
  }
}

export function saveLockScreenState(locked: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      LOCK_SCREEN_STORAGE_KEY,
      JSON.stringify({ locked }),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function isCorrectLockPin(value: string): boolean {
  return value === LOCK_SCREEN_PIN;
}

export function formatLockScreenClock(now: Date): LockScreenClock {
  return {
    title: now.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }),
    value: now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  };
}

export function useLockScreen() {
  const [locked, setLocked] = useState(loadLockScreenState);

  useEffect(() => {
    saveLockScreenState(locked);
  }, [locked]);

  const lock = useCallback(() => {
    setLocked(true);
  }, []);

  const unlock = useCallback(() => {
    setLocked(false);
  }, []);

  return { locked, lock, unlock };
}
