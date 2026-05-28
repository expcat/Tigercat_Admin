import React from 'react';
import {
  DashboardIcon,
  InfoIcon,
  ServerIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from '../components/Icons';

export type ShellPageKey = 'home' | 'users' | 'roles' | 'settings' | 'about';
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
    ],
  },
];

export const SHELL_BOTTOM_MENU_ITEMS: ShellMenuItemDef[] = [
  pageMenuItems.about,
];

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

export function getShellPageTitle(key: string): string {
  return (
    findShellMenuItem([...SHELL_MENU_ITEMS, ...SHELL_BOTTOM_MENU_ITEMS], key)
      ?.label ?? '仪表盘'
  );
}
