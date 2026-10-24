import { ref, watch, type Ref } from 'vue';

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
  activeKey: Ref<string>,
  navigateTo: (key: string) => void,
) {
  const keys = ref<string[]>(loadTagsViewState().keys);

  watch(
    activeKey,
    (key) => {
      const next = openTagsViewTab(keys.value, key);
      if (!areTagKeysEqual(keys.value, next)) {
        keys.value = next;
      }
      saveTagsViewState({ keys: keys.value, activeKey: key });
    },
    { immediate: true },
  );

  watch(keys, (value) => {
    saveTagsViewState({ keys: value, activeKey: activeKey.value });
  });

  const selectTab = (key: string) => {
    if (key !== activeKey.value) {
      navigateTo(key);
    }
  };

  const closeTab = (key: string) => {
    const next = closeTagsViewTab(keys.value, key, activeKey.value);
    keys.value = next.keys;
    if (next.activeKey !== activeKey.value) {
      navigateTo(next.activeKey);
    }
  };

  const closeCurrent = () => {
    closeTab(activeKey.value);
  };

  const closeOthers = () => {
    const next = closeOtherTagsViewTabs(keys.value, activeKey.value);
    if (!areTagKeysEqual(keys.value, next)) {
      keys.value = next;
    }
  };

  const closeAll = () => {
    if (!areTagKeysEqual(keys.value, [TAGS_VIEW_HOME_KEY])) {
      keys.value = closeAllTagsViewTabs();
    }
    if (activeKey.value !== TAGS_VIEW_HOME_KEY) {
      navigateTo(TAGS_VIEW_HOME_KEY);
    }
  };

  return {
    keys,
    selectTab,
    closeTab,
    closeCurrent,
    closeOthers,
    closeAll,
  };
}
