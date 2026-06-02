import React from 'react';
import {
  ActivityIcon,
  BellIcon,
  ClipboardIcon,
  DashboardIcon,
  FileTextIcon,
  InfoIcon,
  ServerIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from '../components/Icons';

export type ShellPageKey =
  | 'home'
  | 'users'
  | 'roles'
  | 'settings'
  | 'files'
  | 'notifications'
  | 'tasks'
  | 'audit'
  | 'about';
export type ShellMenuKey = ShellPageKey | 'system';

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
};

export const SHELL_MENU_ITEMS: ShellMenuItemDef[] = [
  pageMenuItems.home,
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
  items: ShellMenuItemDef[] = [...SHELL_MENU_ITEMS, ...SHELL_BOTTOM_MENU_ITEMS],
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
    findShellMenuItem([...SHELL_MENU_ITEMS, ...SHELL_BOTTOM_MENU_ITEMS], key)
      ?.label ?? '仪表盘'
  );
}
