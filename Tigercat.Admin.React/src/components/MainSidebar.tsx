import React, { useMemo, useState } from 'react';
import {
  DashboardIcon,
  ServerIcon,
  UsersIcon,
  ShieldIcon,
  SettingsIcon,
  InfoIcon,
  LogoIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
} from './Icons';
import { usePermission } from '../utils/permission';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  /**
   * Permission code required to see this menu item.
   * - `string` — must have this single permission
   * - `string[]` — must have **ALL** listed permissions
   */
  permission?: string | string[];
  children?: MenuItem[];
}

interface MainSidebarProps {
  collapsed: boolean;
  activeMenu: string;
  onCollapsedChange: (collapsed: boolean) => void;
  onMenuSelect: (key: string) => void;
}

const MENU_ITEMS: MenuItem[] = [
  {
    key: 'home',
    label: '仪表盘',
    icon: <DashboardIcon size={20} />,
    permission: 'dashboard:view',
  },
  {
    key: 'system',
    label: '系统管理',
    icon: <ServerIcon size={20} />,
    children: [
      {
        key: 'users',
        label: '用户管理',
        icon: <UsersIcon size={18} />,
        permission: 'user:view',
      },
      {
        key: 'roles',
        label: '角色管理',
        icon: <ShieldIcon size={18} />,
        permission: 'role:view',
      },
      { key: 'settings', label: '系统设置', icon: <SettingsIcon size={18} /> },
    ],
  },
];

const BOTTOM_MENU_ITEMS: MenuItem[] = [
  {
    key: 'about',
    label: '关于',
    icon: <InfoIcon size={20} />,
  },
];

export function MainSidebar({
  collapsed,
  activeMenu,
  onCollapsedChange,
  onMenuSelect,
}: MainSidebarProps) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['system']);
  const { has: hasPerm } = usePermission();

  // ---- Permission-based menu filtering ----
  const filteredMenuItems = useMemo(() => {
    function isPermitted(item: MenuItem): boolean {
      if (!item.permission) return true;
      const codes = Array.isArray(item.permission)
        ? item.permission
        : [item.permission];
      return codes.every((c) => hasPerm(c));
    }

    return MENU_ITEMS.map((item) => {
      if (item.children) {
        const visibleChildren = item.children.filter(isPermitted);
        if (visibleChildren.length === 0) return null;
        return { ...item, children: visibleChildren };
      }
      return isPermitted(item) ? item : null;
    }).filter(Boolean) as MenuItem[];
  }, [hasPerm]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const isExpanded = (key: string) => expandedKeys.includes(key);
  const isActive = (key: string) => activeMenu === key;

  return (
    <aside
      className={`flex flex-col bg-[var(--tiger-bg-card,#fff)] border-r border-[var(--tiger-border,#e2e8f0)] transition-all duration-300 shrink-0 shadow-sm ${
        collapsed ? 'w-16' : 'w-60'
      }`}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-[var(--tiger-border,#e2e8f0)]">
        <div className="flex items-center gap-3">
          <LogoIcon />
          {!collapsed && (
            <span className="font-bold text-lg text-[var(--tiger-text,#1f2937)] tracking-wide whitespace-nowrap">
              Tigercat
            </span>
          )}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="flex flex-col min-h-full">
          <ul className="space-y-1">
            {filteredMenuItems.map((item) => (
              <li key={item.key}>
                {item.children && item.children.length > 0 ? (
                  // 有子菜单
                  <>
                    <button
                      onClick={() => toggleExpand(item.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isExpanded(item.key)
                          ? 'bg-[var(--tiger-bg-hover,#f3f4f6)] text-[var(--tiger-text,#1f2937)]'
                          : 'text-[var(--tiger-text-secondary,#64748b)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)]'
                      }`}>
                      <span className="shrink-0 text-[var(--tiger-text-secondary,#64748b)]">
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="flex-1 text-left whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                      {!collapsed && (
                        <span
                          className={`text-[var(--tiger-text-secondary,#64748b)] transition-transform duration-200 ${
                            isExpanded(item.key) ? 'rotate-180' : ''
                          }`}>
                          <ChevronDownIcon size={16} />
                        </span>
                      )}
                    </button>
                    {/* 子菜单 */}
                    {!collapsed && isExpanded(item.key) && (
                      <ul className="mt-1 ml-4 space-y-1 border-l-2 border-[var(--tiger-border,#e2e8f0)] pl-3">
                        {item.children.map((child) => (
                          <li key={child.key}>
                            <button
                              onClick={() => onMenuSelect(child.key)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                isActive(child.key)
                                  ? 'text-[var(--tiger-primary,#2563eb)] font-medium bg-[var(--tiger-primary-light,#e0e7ff)]'
                                  : 'text-[var(--tiger-text-secondary,#64748b)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)]'
                              }`}>
                              <span
                                className={`shrink-0 ${isActive(child.key) ? 'text-[var(--tiger-primary,#2563eb)]' : 'text-[var(--tiger-text-secondary,#64748b)]'}`}>
                                {child.icon}
                              </span>
                              <span className="whitespace-nowrap">
                                {child.label}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  // 无子菜单
                  <button
                    onClick={() => onMenuSelect(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(item.key)
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                        : 'text-[var(--tiger-text-secondary,#64748b)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)]'
                    }`}>
                    <span
                      className={`shrink-0 ${isActive(item.key) ? 'text-white' : 'text-[var(--tiger-text-secondary,#64748b)]'}`}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="whitespace-nowrap">{item.label}</span>
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <ul className="mt-auto space-y-1 pt-4">
            {BOTTOM_MENU_ITEMS.map((item) => (
              <li key={item.key}>
                <button
                  onClick={() => onMenuSelect(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(item.key)
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                      : 'text-[var(--tiger-text-secondary,#64748b)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)]'
                  }`}>
                  <span
                    className={`shrink-0 ${isActive(item.key) ? 'text-white' : 'text-[var(--tiger-text-secondary,#64748b)]'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="whitespace-nowrap">{item.label}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* 折叠按钮 */}
      <div className="p-3 border-t border-[var(--tiger-border,#e2e8f0)]">
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-[var(--tiger-text-secondary,#64748b)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)] transition-all duration-200">
          <span className="shrink-0">
            {collapsed ? (
              <ChevronRightIcon size={18} />
            ) : (
              <ChevronLeftIcon size={18} />
            )}
          </span>
          {!collapsed && <span className="whitespace-nowrap">收起菜单</span>}
        </button>
      </div>
    </aside>
  );
}
