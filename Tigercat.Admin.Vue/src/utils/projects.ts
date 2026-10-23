import type {
  ProgressStatus,
  SegmentedOption,
  TagVariant,
} from '@expcat/tigercat-core';
import { apiRequest } from './request';
import { getAuthHeaders } from './auth';
import type { PagedResult, ProjectStatus, ProjectStatusFilter, ProjectDetailTab, ProjectRecord } from './types';

export const PROJECT_PAGE_SIZE = 6;

export const PROJECT_MILESTONES = ['需求评审', '开发实现', '联调验收', '发布上线'];

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; variant: TagVariant }
> = {
  planning: { label: '规划中', variant: 'info' },
  active: { label: '进行中', variant: 'primary' },
  paused: { label: '已暂停', variant: 'warning' },
  done: { label: '已完成', variant: 'success' },
};

export const PROJECT_STATUS_FILTERS: SegmentedOption[] = [
  { value: 'all', label: '全部' },
  { value: 'planning', label: '规划中' },
  { value: 'active', label: '进行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'done', label: '已完成' },
];

export const PROJECT_DETAIL_TABS: Array<{
  key: ProjectDetailTab;
  label: string;
  href: string;
}> = [
  { key: 'overview', label: '概览', href: '#project-overview' },
  { key: 'members', label: '成员', href: '#project-members' },
  { key: 'activity', label: '动态', href: '#project-activity' },
];

export function fetchProjects(query: {
  page?: number;
  pageSize?: number;
  status?: ProjectStatusFilter;
  keyword?: string;
}, signal?: AbortSignal) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? PROJECT_PAGE_SIZE),
  });
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.keyword?.trim()) params.set('keyword', query.keyword.trim());
  return apiRequest<PagedResult<ProjectRecord>>(`/api/projects?${params}`, {
    headers: getAuthHeaders(),
    signal,
  });
}

export function fetchProject(id: string, signal?: AbortSignal) {
  return apiRequest<ProjectRecord>(`/api/projects/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
    signal,
  });
}

export function readProjectId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return '';
}

export function getProjectProgressStatus(
  project: ProjectRecord,
): ProgressStatus | undefined {
  if (project.status === 'done') {
    return 'success';
  }
  if (project.status === 'paused') {
    return 'paused';
  }
  return undefined;
}

export function getProjectRemainDays(project: ProjectRecord): number {
  const [year, month, day] = project.endAt.split('-').map(Number);
  const today = new Date();
  const diff = Date.UTC(year, month - 1, day) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Number.isFinite(diff) ? Math.max(0, Math.round(diff / 86400000)) : 0;
}
