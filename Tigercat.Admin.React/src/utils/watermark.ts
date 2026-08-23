import { useCallback, useEffect, useState } from 'react';

/** Settings page key; value is persisted locally (no new API endpoint). */
export const WATERMARK_SETTING_KEY = 'theme.watermark';
export const WATERMARK_STORAGE_KEY = 'tigercat-admin:watermark';
export const WATERMARK_CHANGE_EVENT = 'tigercat:watermark-change';

export const SHELL_WATERMARK_PANE_CLASS =
  'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden';

/** Overlay host. Tigercat Watermark always adds `relative`; do not put `absolute` on it. */
export const SHELL_WATERMARK_OVERLAY_CLASS =
  'pointer-events-none absolute inset-0 z-[9]';

export const SHELL_WATERMARK_CLASS = 'relative h-full w-full';

export function formatWatermarkDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Two-line watermark: username, then YYYY-MM-DD. */
export function getWatermarkContent(
  username: string | null | undefined,
): string[] {
  const name = username?.trim() || '账户';
  return [name, formatWatermarkDate()];
}

export function loadWatermarkEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(WATERMARK_STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return false;
    }

    return (parsed as { enabled?: unknown }).enabled === true;
  } catch {
    return false;
  }
}

export function saveWatermarkEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      WATERMARK_STORAGE_KEY,
      JSON.stringify({ enabled }),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }

  window.dispatchEvent(
    new CustomEvent(WATERMARK_CHANGE_EVENT, { detail: { enabled } }),
  );
}

export function useWatermarkEnabled() {
  const [watermarkEnabled, setEnabled] = useState(loadWatermarkEnabled);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: unknown }>).detail;
      if (detail && typeof detail.enabled === 'boolean') {
        setEnabled(detail.enabled);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === WATERMARK_STORAGE_KEY) {
        setEnabled(loadWatermarkEnabled());
      }
    };

    window.addEventListener(WATERMARK_CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(WATERMARK_CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setWatermarkEnabled = useCallback((enabled: boolean) => {
    saveWatermarkEnabled(enabled);
    setEnabled(enabled);
  }, []);

  return { watermarkEnabled, setWatermarkEnabled };
}
