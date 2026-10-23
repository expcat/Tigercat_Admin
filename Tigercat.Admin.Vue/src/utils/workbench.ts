import type { ExportFormat } from './export';

export type WorkbenchEntity = 'users' | 'roles' | 'files' | 'audit-logs';

export type WorkbenchQueryState = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  sortBy?: string | null;
  sortOrder?: 'asc' | 'desc' | null;
  status?: number | null;
  contentType?: string;
  category?: string;
  eventType?: string;
  actor?: string;
  from?: string;
  to?: string;
};

export type WorkbenchExportState = {
  format: ExportFormat;
  fields: string[];
};

export type WorkbenchState = {
  queryState: WorkbenchQueryState;
  selectedRowKeys: (string | number)[];
  hiddenColumnKeys: string[];
  exportState?: WorkbenchExportState;
};

const STORAGE_PREFIX = 'tigercat.admin.workbench.';

export function loadWorkbenchState(
  entity: WorkbenchEntity,
  defaults: Partial<WorkbenchState> = {},
  account?: string,
): WorkbenchState {
  const fallback = normalizeState(defaults);
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.sessionStorage.getItem(workbenchKey(entity, account));
    if (!raw) {
      return fallback;
    }

    return normalizeState({ ...fallback, ...JSON.parse(raw) });
  } catch {
    return fallback;
  }
}

export function saveWorkbenchState(
  entity: WorkbenchEntity,
  nextState: Partial<WorkbenchState>,
  account?: string,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const previous = loadWorkbenchState(entity, {}, account);
  const state = normalizeState({
    ...previous,
    ...nextState,
    queryState: {
      ...previous.queryState,
      ...nextState.queryState,
    },
  });

  window.sessionStorage.setItem(workbenchKey(entity, account), JSON.stringify(state));
}

export function clearWorkbenchSelection(entity: WorkbenchEntity, account?: string): void {
  saveWorkbenchState(entity, { selectedRowKeys: [] }, account);
}

function workbenchKey(entity: WorkbenchEntity, account?: string): string {
  return `${STORAGE_PREFIX}${entity}${account ? `.${encodeURIComponent(account)}` : ''}`;
}

// 用户页命名视图独立于临时工作台状态；只存查询和列，不包含页码、选择或导出。
export function userViewSnapshot(query: WorkbenchQueryState, hiddenColumnKeys: string[]) {
  return {
    queryState: {
      keyword: query.keyword ?? '',
      pageSize: query.pageSize ?? 10,
      status: query.status ?? null,
      sortBy: query.sortBy ?? null,
      sortOrder: query.sortOrder ?? null,
    },
    hiddenColumnKeys: [...new Set(hiddenColumnKeys)].sort(),
  };
}

export type UserView = ReturnType<typeof userViewSnapshot> & { name: string };
export type UserViewsState = { views: UserView[]; activeViewName: string | null };

export function loadUserViews(account: string): UserViewsState {
  const fallback: UserViewsState = { views: [], activeViewName: null };
  if (!account || typeof window === 'undefined') return fallback;
  try {
    const saved = JSON.parse(window.localStorage.getItem(`${workbenchKey('users', account)}.views`) || 'null');
    if (!Array.isArray(saved?.views)) return fallback;
    const views: UserView[] = saved.views
      .filter((view: UserView) => typeof view?.name === 'string' && view.name.trim())
      .map((view: UserView) => ({
        name: view.name,
        ...userViewSnapshot(
          normalizeQueryState(view.queryState ?? {}),
          Array.isArray(view.hiddenColumnKeys) ? view.hiddenColumnKeys.filter(key => typeof key === 'string') : [],
        ),
      }));
    return {
      views,
      activeViewName: views.some(view => view.name === saved.activeViewName) ? saved.activeViewName : null,
    };
  } catch {
    return fallback;
  }
}

export function saveUserViews(account: string, state: UserViewsState): void {
  if (!account || typeof window === 'undefined') return;
  window.localStorage.setItem(`${workbenchKey('users', account)}.views`, JSON.stringify(state));
}

function normalizeState(state: Partial<WorkbenchState>): WorkbenchState {
  return {
    queryState: normalizeQueryState(state.queryState ?? {}),
    selectedRowKeys: Array.isArray(state.selectedRowKeys)
      ? state.selectedRowKeys.filter((key) => typeof key === 'string' || typeof key === 'number')
      : [],
    hiddenColumnKeys: Array.isArray(state.hiddenColumnKeys)
      ? state.hiddenColumnKeys.filter((key): key is string => typeof key === 'string')
      : [],
    exportState: state.exportState
      ? {
          format: state.exportState.format,
          fields: Array.isArray(state.exportState.fields) ? state.exportState.fields : [],
        }
      : undefined,
  };
}

function normalizeQueryState(query: WorkbenchQueryState): WorkbenchQueryState {
  return {
    ...query,
    page: toPositiveNumber(query.page),
    pageSize: toPositiveNumber(query.pageSize),
    sortOrder: query.sortOrder === 'asc' || query.sortOrder === 'desc' ? query.sortOrder : null,
    status:
      query.status === 0 || query.status === 1 || query.status === null
        ? query.status
        : undefined,
  };
}

function toPositiveNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}
