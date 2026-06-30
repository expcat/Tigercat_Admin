import React from 'react';
import {
  ActivityIcon,
  BellIcon,
  CalendarIcon,
  ClipboardIcon,
  DashboardIcon,
  EditIcon,
  FileTextIcon,
  ImageIcon,
  InfoIcon,
  MessageIcon,
  PaletteIcon,
  ServerIcon,
  SettingsIcon,
  ShieldIcon,
  TicketIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon,
} from '../components/Icons';

export type ShellPageKey =
  | 'home'
  | 'analytics'
  | 'tickets'
  | 'calendar'
  | 'content'
  | 'gallery'
  | 'users'
  | 'roles'
  | 'settings'
  | 'files'
  | 'notifications'
  | 'tasks'
  | 'audit'
  | 'about'
  | 'profile';
export type ShellMenuKey =
  | ShellPageKey
  | 'system'
  | 'analyticsGroup'
  | 'collaborationGroup'
  | 'contentGroup';

export interface ShellMenuItemDef {
  key: ShellMenuKey;
  label: string;
  icon: React.ReactNode;
  permission?: string | string[];
  children?: ShellMenuItemDef[];
}

const pageMenuItems: Record<ShellPageKey, ShellMenuItemDef> = {
  home: {
    key: 'home',
    label: '仪表盘',
    icon: <DashboardIcon size={20} />,
    permission: 'dashboard:view',
  },
  analytics: {
    key: 'analytics',
    label: '数据分析看板',
    icon: <TrendingUpIcon size={18} />,
  },
  tickets: {
    key: 'tickets',
    label: '工单中心',
    icon: <TicketIcon size={18} />,
  },
  calendar: {
    key: 'calendar',
    label: '团队日历',
    icon: <CalendarIcon size={18} />,
  },
  content: {
    key: 'content',
    label: '内容编辑',
    icon: <EditIcon size={18} />,
  },
  gallery: {
    key: 'gallery',
    label: '媒体图库',
    icon: <ImageIcon size={18} />,
  },
  users: {
    key: 'users',
    label: '用户管理',
    icon: <UsersIcon size={18} />,
    permission: 'user:view',
  },
  roles: {
    key: 'roles',
    label: '角色管理',
    icon: <ShieldIcon size={18} />,
    permission: 'role:view',
  },
  settings: {
    key: 'settings',
    label: '系统设置',
    icon: <SettingsIcon size={18} />,
  },
  files: {
    key: 'files',
    label: '文件管理',
    icon: <FileTextIcon size={18} />,
    permission: 'media:view',
  },
  notifications: {
    key: 'notifications',
    label: '通知中心',
    icon: <BellIcon size={18} />,
  },
  tasks: {
    key: 'tasks',
    label: '任务面板',
    icon: <ClipboardIcon size={18} />,
  },
  audit: {
    key: 'audit',
    label: '审计日志',
    icon: <ActivityIcon size={18} />,
  },
  about: {
    key: 'about',
    label: '关于',
    icon: <InfoIcon size={20} />,
  },
  profile: {
    key: 'profile',
    label: '个人中心',
    icon: <UserIcon size={18} />,
  },
};

export const SHELL_MENU_ITEMS: ShellMenuItemDef[] = [
  pageMenuItems.home,
  {
    key: 'analyticsGroup',
    label: '数据分析',
    icon: <TrendingUpIcon size={20} />,
    children: [pageMenuItems.analytics],
  },
  {
    key: 'collaborationGroup',
    label: '协作',
    icon: <MessageIcon size={20} />,
    children: [pageMenuItems.tickets, pageMenuItems.calendar],
  },
  {
    key: 'contentGroup',
    label: '内容管理',
    icon: <PaletteIcon size={20} />,
    children: [pageMenuItems.content, pageMenuItems.gallery],
  },
  {
    key: 'system',
    label: '系统管理',
    icon: <ServerIcon size={20} />,
    children: [
      pageMenuItems.users,
      pageMenuItems.roles,
      pageMenuItems.settings,
      pageMenuItems.files,
      pageMenuItems.notifications,
      pageMenuItems.tasks,
      pageMenuItems.audit,
    ],
  },
];

export const SHELL_BOTTOM_MENU_ITEMS: ShellMenuItemDef[] = [
  pageMenuItems.about,
];

// 不进左侧菜单、仅供标题/面包屑解析的页面（如头像下拉进入的个人中心）。
export const SHELL_HIDDEN_MENU_ITEMS: ShellMenuItemDef[] = [
  pageMenuItems.profile,
];

function isShellMenuItemPermitted(
  item: ShellMenuItemDef,
  hasPermission: (permission: string) => boolean,
): boolean {
  if (!item.permission) {
    return true;
  }

  const codes = Array.isArray(item.permission)
    ? item.permission
    : [item.permission];
  return codes.every((code) => hasPermission(code));
}

export function filterShellMenuItems(
  items: ShellMenuItemDef[],
  hasPermission: (permission: string) => boolean,
): ShellMenuItemDef[] {
  return items
    .map((item) => {
      if (item.children) {
        const visibleChildren = filterShellMenuItems(
          item.children,
          hasPermission,
        );
        if (visibleChildren.length === 0) {
          return null;
        }

        return {
          ...item,
          children: visibleChildren,
        };
      }

      return isShellMenuItemPermitted(item, hasPermission) ? item : null;
    })
    .filter(Boolean) as ShellMenuItemDef[];
}

function findShellMenuTrail(
  items: ShellMenuItemDef[],
  key: string,
  trail: ShellMenuItemDef[] = [],
): ShellMenuItemDef[] | undefined {
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
  items: ShellMenuItemDef[],
  key: string,
): ShellMenuItemDef | undefined {
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
  items: ShellMenuItemDef[] = [
    ...SHELL_MENU_ITEMS,
    ...SHELL_BOTTOM_MENU_ITEMS,
    ...SHELL_HIDDEN_MENU_ITEMS,
  ],
): string[] {
  return findShellMenuTrail(items, key)?.map((item) => item.label) ?? [];
}

export function getShellExpandedKeys(
  key: string,
  items: ShellMenuItemDef[] = SHELL_MENU_ITEMS,
): (string | number)[] {
  const trail = findShellMenuTrail(items, key) ?? [];
  return trail.slice(0, -1).map((item) => item.key);
}

export function getShellPageTitle(key: string): string {
  return (
    findShellMenuItem(
      [
        ...SHELL_MENU_ITEMS,
        ...SHELL_BOTTOM_MENU_ITEMS,
        ...SHELL_HIDDEN_MENU_ITEMS,
      ],
      key,
    )?.label ?? '仪表盘'
  );
}
