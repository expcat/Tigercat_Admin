import { apiRequest } from './request';
import { getAuthHeaders } from './auth';
import { fetchCalendarEvents, formatCalendarDate } from './calendar';
import { fetchApprovalContacts, fetchApprovals, getApprovalDemoActor } from './approvals';
import { getRequiredPermissionForLink, isSafeInternalLink } from './notifications';
import type {
  AdminNotificationItem, AdminTaskBoardCard, PagedResult,
  WorkspaceSectionData, WorkspaceSectionKey, WorkspaceSectionState,
} from './types';

export const WORKSPACE_SECTIONS: { key: WorkspaceSectionKey; title: string; description: string; permission?: string; href: string }[] = [
  { key: 'tasks', title: '用户名匹配的待办', description: '负责人文本与当前用户名精确匹配（不区分大小写）的未完成任务；不代表已建立账号分派关系。', permission: 'task:view', href: '/tasks' },
  { key: 'notifications', title: '全局未读通知', description: '通知和已读状态由所有账号共享。打开目标不会修改已读状态。', permission: 'notification:view', href: '/notifications' },
  { key: 'calendar', title: '团队近期日程', description: '从今天起 30 天内尚未开始的共享日程，日期和时间按本机时区理解。', href: '/calendar' },
  { key: 'approvals', title: '演示审批待办', description: '使用审批中心的独立演示身份，与当前登录账号分开。身份经通讯录确认后才读取待办。', href: '/approvals' },
];

export function createWorkspaceState(): Record<WorkspaceSectionKey, WorkspaceSectionState> {
  const initial = (): WorkspaceSectionState => ({
    items: [], total: null, note: '', loading: true, error: '',
  });
  return { tasks: initial(), notifications: initial(), calendar: initial(), approvals: initial() };
}

// One section per request chain; the page owns each section's cancellation and retry.
export async function fetchWorkspaceSection(key: WorkspaceSectionKey, username: string, signal: AbortSignal): Promise<WorkspaceSectionData> {
  const pageSize = 5;
  switch (key) {
    case 'tasks': {
      const params = new URLSearchParams({ assigneeExact: username, unfinished: 'true', page: '1', pageSize: String(pageSize) });
      const { data } = await apiRequest<PagedResult<AdminTaskBoardCard>>(`/api/tasks?${params}`, { headers: getAuthHeaders(), signal });
      const statusLabels = { backlog: '需求池', todo: '待执行', doing: '执行中', review: '待验收', done: '已完成' };
      return { total: data.total, note: `匹配用户名：${username}；仅统计未完成任务。`, items: data.items.map(item => ({
        id: item.id, title: item.title, description: `${statusLabels[item.status]} · 截止 ${new Date(item.dueAt).toLocaleString('zh-CN')}`,
        href: `/tasks?taskId=${encodeURIComponent(item.id)}`, permission: 'task:view',
      })) };
    }
    case 'notifications': {
      const { data } = await apiRequest<PagedResult<AdminNotificationItem>>(`/api/notifications?unread=true&page=1&pageSize=${pageSize}`, { headers: getAuthHeaders(), signal });
      return { total: data.total, items: data.items.map(item => ({
        id: item.id, title: item.title, description: item.description,
        href: item.linkUrl && isSafeInternalLink(item.linkUrl) ? item.linkUrl : '/notifications',
        permission: item.linkUrl ? getRequiredPermissionForLink(item.linkUrl) ?? undefined : undefined,
      })) };
    }
    case 'calendar': {
      const now = new Date();
      const from = formatCalendarDate(now);
      const to = formatCalendarDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 29));
      const { data } = await fetchCalendarEvents(from, to, signal);
      const upcoming = data.filter(item => new Date(`${item.date}T${item.start}:00`).getTime() >= now.getTime())
        .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
      return { total: upcoming.length, note: `${from} 至 ${to}`, items: upcoming.slice(0, pageSize).map(item => ({
        id: item.id, title: item.title, description: `${item.date} ${item.start}–${item.end} · ${item.location}`,
        href: `/calendar?date=${item.date}&eventId=${encodeURIComponent(item.id)}`,
      })) };
    }
    case 'approvals': {
      const actorId = getApprovalDemoActor();
      const contacts = await fetchApprovalContacts(signal);
      const actor = contacts.data.users.find(item => [item.id, item.username].some(value => value.toLowerCase() === actorId.toLowerCase()));
      if (!actor) return { items: [], total: null, note: `演示身份「${actorId}」未匹配审批通讯录，未读取审批待办。请在审批中心选择有效演示身份。` };
      const { data } = await fetchApprovals({ lane: 'todo', page: 1, pageSize }, signal);
      return { total: data.total, note: `独立演示审批身份：${actor.name}（${actor.username}）；不是当前账号的审批统计。`, items: data.items.map(item => ({
        id: item.id, title: item.title, description: `${item.id} · ${item.starter} · ${item.category}`,
        href: `/approvals/${encodeURIComponent(item.id)}`,
      })) };
    }
  }
}
