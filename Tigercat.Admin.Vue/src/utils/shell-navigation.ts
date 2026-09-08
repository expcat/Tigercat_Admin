import {
  filterMenuByPermission,
  menuSchemaToMenuItems,
  type MenuItem,
  type MenuSchema,
  type MenuSchemaNode,
} from '@expcat/tigercat-core';
import { onUnmounted, ref, type Ref } from 'vue';
import { getAuthHeaders } from './auth';
import { apiRequest } from './request';
import type { MenuSchemaPayload } from './types';

export type ShellPageKey =
  | 'home'
  | 'analytics'
  | 'monitor'
  | 'tickets'
  | 'calendar'
  | 'content'
  | 'gallery'
  | 'jobs'
  | 'import'
  | 'performance'
  | 'help'
  | 'reports'
  | 'users'
  | 'roles'
  | 'menus'
  | 'settings'
  | 'files'
  | 'notifications'
  | 'tasks'
  | 'audit'
  | 'about'
  | 'profile'
  | 'projects';
export type ShellMenuKey =
  | ShellPageKey
  | 'system'
  | 'analyticsGroup'
  | 'collaborationGroup'
  | 'contentGroup'
  | 'projectsGroup'
  | 'opsGroup'
  | 'helpGroup';

const pageNodes: Record<ShellPageKey, MenuSchemaNode> = {
  home: {
    key: 'home',
    label: '仪表盘',
    icon: 'dashboard',
    permission: 'dashboard:view',
    path: '/dashboard',
  },
  analytics: {
    key: 'analytics',
    label: '数据分析看板',
    icon: 'trendingUp',
    path: '/analytics',
  },
  monitor: {
    key: 'monitor',
    label: '实时监控',
    icon: 'monitor',
    path: '/monitor',
  },
  projects: {
    key: 'projects',
    label: '项目列表',
    icon: 'package',
    path: '/projects',
  },
  tickets: {
    key: 'tickets',
    label: '工单中心',
    icon: 'ticket',
    path: '/tickets',
  },
  calendar: {
    key: 'calendar',
    label: '团队日历',
    icon: 'calendar',
    path: '/calendar',
  },
  content: {
    key: 'content',
    label: '内容编辑',
    icon: 'edit',
    path: '/content',
  },
  gallery: {
    key: 'gallery',
    label: '媒体图库',
    icon: 'image',
    path: '/gallery',
  },
  jobs: {
    key: 'jobs',
    label: '定时任务',
    icon: 'clock',
    path: '/jobs',
  },
  import: {
    key: 'import',
    label: '数据导入',
    icon: 'upload',
    path: '/import',
  },
  performance: {
    key: 'performance',
    label: '大数据演示',
    icon: 'zap',
    path: '/performance',
  },
  help: {
    key: 'help',
    label: '帮助中心',
    icon: 'help',
    path: '/help',
  },
  reports: {
    key: 'reports',
    label: '报表打印',
    icon: 'fileText',
    path: '/reports',
  },
  users: {
    key: 'users',
    label: '用户管理',
    icon: 'users',
    permission: 'user:view',
    path: '/users',
  },
  roles: {
    key: 'roles',
    label: '角色管理',
    icon: 'shield',
    permission: 'role:view',
    path: '/roles',
  },
  menus: {
    key: 'menus',
    label: '菜单管理',
    icon: 'menu',
    permission: 'menu:view',
    path: '/menus',
  },
  settings: {
    key: 'settings',
    label: '系统设置',
    icon: 'settings',
    path: '/settings',
  },
  files: {
    key: 'files',
    label: '文件管理',
    icon: 'fileText',
    permission: 'media:view',
    path: '/files',
  },
  notifications: {
    key: 'notifications',
    label: '通知中心',
    icon: 'bell',
    path: '/notifications',
  },
  tasks: {
    key: 'tasks',
    label: '任务面板',
    icon: 'clipboard',
    path: '/tasks',
  },
  audit: {
    key: 'audit',
    label: '审计日志',
    icon: 'activity',
    path: '/audit-logs',
  },
  about: {
    key: 'about',
    label: '关于',
    icon: 'info',
    path: '/about',
  },
  profile: {
    key: 'profile',
    label: '个人中心',
    icon: 'user',
    path: '/profile',
    hideInMenu: true,
  },
};

export const SHELL_MENU_SCHEMA: MenuSchema = [
  pageNodes.home,
  {
    key: 'analyticsGroup',
    label: '数据分析',
    icon: 'trendingUp',
    children: [pageNodes.analytics, pageNodes.monitor],
  },
  {
    key: 'collaborationGroup',
    label: '协作',
    icon: 'message',
    children: [pageNodes.tickets, pageNodes.calendar],
  },
  {
    key: 'contentGroup',
    label: '内容管理',
    icon: 'palette',
    children: [pageNodes.content, pageNodes.gallery],
  },
  {
    key: 'projectsGroup',
    label: '项目',
    icon: 'package',
    children: [pageNodes.projects],
  },
  {
    key: 'opsGroup',
    label: '运维',
    icon: 'terminal',
    children: [pageNodes.jobs, pageNodes.import, pageNodes.performance],
  },
  {
    key: 'helpGroup',
    label: '帮助支持',
    icon: 'help',
    children: [pageNodes.help, pageNodes.reports],
  },
  {
    key: 'system',
    label: '系统管理',
    icon: 'server',
    children: [
      pageNodes.users,
      pageNodes.roles,
      pageNodes.menus,
      pageNodes.settings,
      pageNodes.files,
      pageNodes.notifications,
      pageNodes.tasks,
      pageNodes.audit,
    ],
  },
];

export const SHELL_BOTTOM_MENU_SCHEMA: MenuSchema = [pageNodes.about];

export const SHELL_HIDDEN_MENU_SCHEMA: MenuSchema = [pageNodes.profile];

export const BUNDLED_MENU_SCHEMA_PAYLOAD: MenuSchemaPayload = {
  items: SHELL_MENU_SCHEMA,
  bottomItems: SHELL_BOTTOM_MENU_SCHEMA,
};

export const SHELL_MENU_ROUTES: Record<ShellPageKey, string> = {
  home: 'dashboard',
  analytics: 'analytics',
  monitor: 'monitor',
  projects: 'projects',
  tickets: 'tickets',
  calendar: 'calendar',
  content: 'content',
  gallery: 'gallery',
  jobs: 'jobs',
  import: 'import',
  performance: 'performance',
  help: 'help',
  reports: 'reports',
  users: 'users',
  roles: 'roles',
  menus: 'menus',
  settings: 'settings',
  files: 'files',
  notifications: 'notifications',
  tasks: 'tasks',
  audit: 'audit',
  about: 'about',
  profile: 'profile',
};

export const SHELL_ROUTE_TO_MENU: Record<string, ShellPageKey | undefined> = {
  dashboard: 'home',
  analytics: 'analytics',
  monitor: 'monitor',
  projects: 'projects',
  'projects-detail': 'projects',
  tickets: 'tickets',
  calendar: 'calendar',
  content: 'content',
  gallery: 'gallery',
  jobs: 'jobs',
  import: 'import',
  performance: 'performance',
  help: 'help',
  reports: 'reports',
  users: 'users',
  roles: 'roles',
  menus: 'menus',
  settings: 'settings',
  files: 'files',
  notifications: 'notifications',
  tasks: 'tasks',
  audit: 'audit',
  about: 'about',
  profile: 'profile',
};

export function resolveShellPageKey(
  routeKey: string | null | undefined,
  fallback: ShellPageKey = 'home',
): ShellPageKey {
  if (!routeKey) {
    return fallback;
  }

  const exact = SHELL_ROUTE_TO_MENU[routeKey];
  if (exact) {
    return exact;
  }

  let matched: ShellPageKey | undefined;
  let matchedLength = -1;
  for (const [mappedRoute, pageKey] of Object.entries(SHELL_ROUTE_TO_MENU)) {
    if (!pageKey || mappedRoute.length <= matchedLength) {
      continue;
    }
    if (
      routeKey.startsWith(`${mappedRoute}/`) ||
      routeKey.startsWith(`${mappedRoute}-`)
    ) {
      matched = pageKey;
      matchedLength = mappedRoute.length;
    }
  }

  return matched ?? fallback;
}

export function isShellPageKey(value: unknown): value is ShellPageKey {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(SHELL_MENU_ROUTES, value)
  );
}

function isUsableSchema(value: unknown): value is MenuSchema {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (node) =>
        Boolean(node) &&
        typeof node === 'object' &&
        typeof (node as MenuSchemaNode).key === 'string',
    )
  );
}

function bundledPayload(): MenuSchemaPayload {
  return {
    items: SHELL_MENU_SCHEMA,
    bottomItems: SHELL_BOTTOM_MENU_SCHEMA,
  };
}

let menuSchemaRequest: Promise<MenuSchemaPayload> | null = null;
const menuSchemaListeners = new Set<(payload: MenuSchemaPayload) => void>();

export function resetShellMenuSchema(): void {
  menuSchemaRequest = null;
  void loadShellMenuSchema().then((payload) => {
    menuSchemaListeners.forEach((listener) => listener(payload));
  });
}

export async function loadShellMenuSchema(): Promise<MenuSchemaPayload> {
  if (!menuSchemaRequest) {
    menuSchemaRequest = (async () => {
      try {
        const res = await apiRequest<MenuSchemaPayload>('/api/menus/schema', {
          headers: getAuthHeaders(),
        });
        if (
          isUsableSchema(res.data?.items) &&
          isUsableSchema(res.data?.bottomItems)
        ) {
          return {
            items: res.data.items,
            bottomItems: res.data.bottomItems,
          };
        }
      } catch {
        // Live API without this endpoint, or a transient error: keep bundled tree.
      }
      return bundledPayload();
    })();
  }
  return menuSchemaRequest;
}

export function useShellMenuSchema(): Ref<MenuSchemaPayload> {
  const payload = ref<MenuSchemaPayload>(bundledPayload());
  const apply = (next: MenuSchemaPayload) => {
    payload.value = next;
  };
  menuSchemaListeners.add(apply);
  void loadShellMenuSchema().then(apply);
  onUnmounted(() => {
    menuSchemaListeners.delete(apply);
  });
  return payload;
}

export function schemaToShellMenuItems(nodes: MenuSchemaNode[]): MenuItem[] {
  return stripMenuHref(menuSchemaToMenuItems(nodes));
}

export function filterShellMenuSchema(
  nodes: MenuSchemaNode[],
  hasPermission: (permission: string) => boolean,
): MenuSchemaNode[] {
  return filterMenuByPermission(nodes, hasPermission);
}

function stripMenuHref(items: MenuItem[]): MenuItem[] {
  return items.map((item) => {
    const { href: _href, ...rest } = item;
    return {
      ...rest,
      children: item.children ? stripMenuHref(item.children) : undefined,
    };
  });
}

function findShellMenuTrail(
  items: MenuSchemaNode[],
  key: string,
  trail: MenuSchemaNode[] = [],
): MenuSchemaNode[] | undefined {
  for (const item of items) {
    const nextTrail = [...trail, item];

    if (item.key === key) {
      return nextTrail;
    }

    if (item.children) {
      const matchedTrail = findShellMenuTrail(item.children, key, nextTrail);
      if (matchedTrail) {
        return matchedTrail;
      }
    }
  }

  return undefined;
}

function findShellMenuItem(
  items: MenuSchemaNode[],
  key: string,
): MenuSchemaNode | undefined {
  for (const item of items) {
    if (item.key === key) {
      return item;
    }

    if (item.children) {
      const matchedChild = findShellMenuItem(item.children, key);
      if (matchedChild) {
        return matchedChild;
      }
    }
  }

  return undefined;
}

export function getShellBreadcrumbItems(
  key: string,
  items: MenuSchemaNode[] = [
    ...SHELL_MENU_SCHEMA,
    ...SHELL_BOTTOM_MENU_SCHEMA,
    ...SHELL_HIDDEN_MENU_SCHEMA,
  ],
): string[] {
  return findShellMenuTrail(items, key)?.map((item) => item.label ?? '') ?? [];
}

export function getShellExpandedKeys(
  key: string,
  items: MenuSchemaNode[] = SHELL_MENU_SCHEMA,
): (string | number)[] {
  const trail = findShellMenuTrail(items, key) ?? [];
  return trail.slice(0, -1).map((item) => item.key);
}

export function getShellPageTitle(key: string): string {
  return (
    findShellMenuItem(
      [
        ...SHELL_MENU_SCHEMA,
        ...SHELL_BOTTOM_MENU_SCHEMA,
        ...SHELL_HIDDEN_MENU_SCHEMA,
      ],
      key,
    )?.label ?? '仪表盘'
  );
}

export function flattenShellMenuLeaves(
  items: MenuSchemaNode[],
): MenuSchemaNode[] {
  return items.flatMap((item) =>
    item.children
      ? flattenShellMenuLeaves(item.children)
      : isShellPageKey(item.key)
        ? [item]
        : [],
  );
}
