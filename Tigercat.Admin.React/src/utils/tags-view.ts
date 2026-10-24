import { useCallback, useEffect, useState } from 'react';

export const TAGS_VIEW_STORAGE_KEY = 'tigercat-admin:tags-view';
export const TAGS_VIEW_HOME_KEY: string = 'home';

export type TagsViewState = {
  keys: string[];
  activeKey: string;
};

export function areTagKeysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((key, index) => key === right[index])
  );
}

export function ensureHomeTab(keys: readonly string[]): string[] {
  const rest = keys.filter((key) => key !== TAGS_VIEW_HOME_KEY);
  return [TAGS_VIEW_HOME_KEY, ...rest];
}

export function normalizeTagsViewKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) {
    return [TAGS_VIEW_HOME_KEY];
  }

  const seen = new Set<string>();
  const next: string[] = [];
  for (const key of keys) {
    if ((typeof key !== 'string' || key.length === 0) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(key);
  }

  return ensureHomeTab(next);
}

export function loadTagsViewState(): TagsViewState {
  const fallback: TagsViewState = {
    keys: [TAGS_VIEW_HOME_KEY],
    activeKey: TAGS_VIEW_HOME_KEY,
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.sessionStorage.getItem(TAGS_VIEW_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return fallback;
    }

    const record = parsed as Record<string, unknown>;
    const keys = normalizeTagsViewKeys(record.keys);
    const activeKey =
      typeof record.activeKey === 'string' && keys.includes(record.activeKey)
        ? record.activeKey
        : TAGS_VIEW_HOME_KEY;

    return { keys, activeKey };
  } catch {
    return fallback;
  }
}

export function saveTagsViewState(state: TagsViewState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const keys = normalizeTagsViewKeys(state.keys);
    const activeKey =
      typeof state.activeKey === 'string' && keys.includes(state.activeKey)
        ? state.activeKey
        : TAGS_VIEW_HOME_KEY;
    window.sessionStorage.setItem(
      TAGS_VIEW_STORAGE_KEY,
      JSON.stringify({ keys, activeKey }),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function openTagsViewTab(
  keys: readonly string[],
  key: string,
): string[] {
  const normalized = ensureHomeTab(keys);
  if (normalized.includes(key)) {
    return areTagKeysEqual(keys, normalized) ? [...keys] : normalized;
  }
  return [...normalized, key];
}

export function closeTagsViewTab(
  keys: readonly string[],
  key: string,
  activeKey: string,
): TagsViewState {
  const current = ensureHomeTab(keys);
  if (key === TAGS_VIEW_HOME_KEY) {
    return {
      keys: current,
      activeKey: current.includes(activeKey) ? activeKey : TAGS_VIEW_HOME_KEY,
    };
  }

  const index = current.indexOf(key);
  if (index < 0) {
    return {
      keys: current,
      activeKey: current.includes(activeKey) ? activeKey : TAGS_VIEW_HOME_KEY,
    };
  }

  const nextKeys = ensureHomeTab(current.filter((item) => item !== key));
  if (activeKey !== key) {
    return {
      keys: nextKeys,
      activeKey: nextKeys.includes(activeKey) ? activeKey : TAGS_VIEW_HOME_KEY,
    };
  }

  const adjacent = current[index + 1] ?? current[index - 1] ?? TAGS_VIEW_HOME_KEY;
  return {
    keys: nextKeys,
    activeKey: nextKeys.includes(adjacent) ? adjacent : TAGS_VIEW_HOME_KEY,
  };
}

export function closeOtherTagsViewTabs(
  keys: readonly string[],
  keepKey: string,
): string[] {
  if (keepKey === TAGS_VIEW_HOME_KEY) {
    return [TAGS_VIEW_HOME_KEY];
  }
  return ensureHomeTab(keys.filter((key) => key === keepKey));
}

export function closeAllTagsViewTabs(): string[] {
  return [TAGS_VIEW_HOME_KEY];
}

export function useTagsView(
  activeKey: string,
  onNavigate?: (key: string) => void,
) {
  const [keys, setKeys] = useState<string[]>(
    () => loadTagsViewState().keys,
  );

  useEffect(() => {
    setKeys((prev) => {
      const next = openTagsViewTab(prev, activeKey);
      return areTagKeysEqual(prev, next) ? prev : next;
    });
  }, [activeKey]);

  useEffect(() => {
    saveTagsViewState({ keys, activeKey });
  }, [keys, activeKey]);

  const selectTab = useCallback(
    (key: string) => {
      if (key !== activeKey) {
        onNavigate?.(key);
      }
    },
    [activeKey, onNavigate],
  );

  const closeTab = useCallback(
    (key: string) => {
      const next = closeTagsViewTab(keys, key, activeKey);
      setKeys(next.keys);
      if (next.activeKey !== activeKey) {
        onNavigate?.(next.activeKey);
      }
    },
    [activeKey, keys, onNavigate],
  );

  const closeCurrent = useCallback(() => {
    closeTab(activeKey);
  }, [activeKey, closeTab]);

  const closeOthers = useCallback(() => {
    setKeys((prev) => {
      const next = closeOtherTagsViewTabs(prev, activeKey);
      return areTagKeysEqual(prev, next) ? prev : next;
    });
  }, [activeKey]);

  const closeAll = useCallback(() => {
    setKeys((prev) =>
      areTagKeysEqual(prev, [TAGS_VIEW_HOME_KEY]) ? prev : closeAllTagsViewTabs(),
    );
    if (activeKey !== TAGS_VIEW_HOME_KEY) {
      onNavigate?.(TAGS_VIEW_HOME_KEY);
    }
  }, [activeKey, onNavigate]);

  return {
    keys,
    selectTab,
    closeTab,
    closeCurrent,
    closeOthers,
    closeAll,
  };
}
