import { ref, watch, type Ref } from 'vue';
import {
  isShellPageKey,
  type ShellPageKey,
} from './shell-navigation';

export const TAGS_VIEW_STORAGE_KEY = 'tigercat-admin:tags-view';
export const TAGS_VIEW_HOME_KEY: ShellPageKey = 'home';

export type TagsViewState = {
  keys: ShellPageKey[];
  activeKey: ShellPageKey;
};

export function areTagKeysEqual(
  left: readonly ShellPageKey[],
  right: readonly ShellPageKey[],
): boolean {
  return (
    left.length === right.length &&
    left.every((key, index) => key === right[index])
  );
}

export function ensureHomeTab(keys: readonly ShellPageKey[]): ShellPageKey[] {
  const rest = keys.filter((key) => key !== TAGS_VIEW_HOME_KEY);
  return [TAGS_VIEW_HOME_KEY, ...rest];
}

export function normalizeTagsViewKeys(keys: unknown): ShellPageKey[] {
  if (!Array.isArray(keys)) {
    return [TAGS_VIEW_HOME_KEY];
  }

  const seen = new Set<ShellPageKey>();
  const next: ShellPageKey[] = [];
  for (const key of keys) {
    if (!isShellPageKey(key) || seen.has(key)) {
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
      isShellPageKey(record.activeKey) && keys.includes(record.activeKey)
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
      isShellPageKey(state.activeKey) && keys.includes(state.activeKey)
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
  keys: readonly ShellPageKey[],
  key: ShellPageKey,
): ShellPageKey[] {
  const normalized = ensureHomeTab(keys);
  if (normalized.includes(key)) {
    return areTagKeysEqual(keys, normalized) ? [...keys] : normalized;
  }
  return [...normalized, key];
}

export function closeTagsViewTab(
  keys: readonly ShellPageKey[],
  key: ShellPageKey,
  activeKey: ShellPageKey,
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
  keys: readonly ShellPageKey[],
  keepKey: ShellPageKey,
): ShellPageKey[] {
  if (keepKey === TAGS_VIEW_HOME_KEY) {
    return [TAGS_VIEW_HOME_KEY];
  }
  return ensureHomeTab(keys.filter((key) => key === keepKey));
}

export function closeAllTagsViewTabs(): ShellPageKey[] {
  return [TAGS_VIEW_HOME_KEY];
}

export function useTagsView(
  activeKey: Ref<ShellPageKey>,
  navigateTo: (key: ShellPageKey) => void,
) {
  const keys = ref<ShellPageKey[]>(loadTagsViewState().keys);

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

  const selectTab = (key: ShellPageKey) => {
    if (key !== activeKey.value) {
      navigateTo(key);
    }
  };

  const closeTab = (key: ShellPageKey) => {
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
