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
): WorkbenchState {
  const fallback = normalizeState(defaults);
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${entity}`);
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
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const previous = loadWorkbenchState(entity);
  const state = normalizeState({
    ...previous,
    ...nextState,
    queryState: {
      ...previous.queryState,
      ...nextState.queryState,
    },
  });

  window.sessionStorage.setItem(`${STORAGE_PREFIX}${entity}`, JSON.stringify(state));
}

export function clearWorkbenchSelection(entity: WorkbenchEntity): void {
  saveWorkbenchState(entity, { selectedRowKeys: [] });
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
