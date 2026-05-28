export type ShellPageKey = 'home' | 'users' | 'roles' | 'settings' | 'about';
export type ShellMenuKey = ShellPageKey | 'system';

export interface ShellMenuItemDef {
  key: ShellMenuKey;
  label: string;
  icon: string;
  permission?: string | string[];
  routeName?: string;
  children?: ShellMenuItemDef[];
}

const pageMenuItems: Record<ShellPageKey, ShellMenuItemDef> = {
  home: {
    key: 'home',
    label: '仪表盘',
    icon: 'dashboard',
    permission: 'dashboard:view',
    routeName: 'dashboard',
  },
  users: {
    key: 'users',
    label: '用户管理',
    icon: 'users',
    permission: 'user:view',
    routeName: 'users',
  },
  roles: {
    key: 'roles',
    label: '角色管理',
    icon: 'shield',
    permission: 'role:view',
    routeName: 'roles',
  },
  settings: {
    key: 'settings',
    label: '系统设置',
    icon: 'settings',
    routeName: 'settings',
  },
  about: {
    key: 'about',
    label: '关于',
    icon: 'info',
    routeName: 'about',
  },
};

export const SHELL_MENU_ITEMS: ShellMenuItemDef[] = [
  pageMenuItems.home,
  {
    key: 'system',
    label: '系统管理',
    icon: 'server',
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

export const SHELL_MENU_ROUTES: Record<ShellPageKey, string> = {
  home: 'dashboard',
  users: 'users',
  roles: 'roles',
  settings: 'settings',
  about: 'about',
};

export const SHELL_ROUTE_TO_MENU: Record<string, ShellPageKey | undefined> = {
  dashboard: 'home',
  users: 'users',
  roles: 'roles',
  settings: 'settings',
  about: 'about',
};

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
