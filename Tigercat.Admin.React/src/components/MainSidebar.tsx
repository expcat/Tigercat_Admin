import React, { useState } from 'react';
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

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
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
  },
  {
    key: 'system',
    label: '系统管理',
    icon: <ServerIcon size={20} />,
    children: [
      { key: 'users', label: '用户管理', icon: <UsersIcon size={18} /> },
      { key: 'roles', label: '角色管理', icon: <ShieldIcon size={18} /> },
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

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const isExpanded = (key: string) => expandedKeys.includes(key);
  const isActive = (key: string) => activeMenu === key;

  return (
    <aside
      className={`flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shrink-0 shadow-sm ${
        collapsed ? 'w-16' : 'w-60'
      }`}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-slate-100">
        <div className="flex items-center gap-3">
          <LogoIcon />
          {!collapsed && (
            <span className="font-bold text-lg text-slate-800 tracking-wide whitespace-nowrap">
              Tigercat
            </span>
          )}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="flex flex-col min-h-full">
          <ul className="space-y-1">
            {MENU_ITEMS.map((item) => (
              <li key={item.key}>
                {item.children && item.children.length > 0 ? (
                  // 有子菜单
                  <>
                    <button
                      onClick={() => toggleExpand(item.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isExpanded(item.key)
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}>
                      <span className="shrink-0 text-slate-500">
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="flex-1 text-left whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                      {!collapsed && (
                        <span
                          className={`text-slate-400 transition-transform duration-200 ${
                            isExpanded(item.key) ? 'rotate-180' : ''
                          }`}>
                          <ChevronDownIcon size={16} />
                        </span>
                      )}
                    </button>
                    {/* 子菜单 */}
                    {!collapsed && isExpanded(item.key) && (
                      <ul className="mt-1 ml-4 space-y-1 border-l-2 border-slate-200 pl-3">
                        {item.children.map((child) => (
                          <li key={child.key}>
                            <button
                              onClick={() => onMenuSelect(child.key)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                isActive(child.key)
                                  ? 'text-blue-600 font-medium bg-blue-50'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}>
                              <span
                                className={`shrink-0 ${isActive(child.key) ? 'text-blue-600' : 'text-slate-400'}`}>
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
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}>
                    <span
                      className={`shrink-0 ${isActive(item.key) ? 'text-white' : 'text-slate-500'}`}>
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
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}>
                  <span
                    className={`shrink-0 ${isActive(item.key) ? 'text-white' : 'text-slate-500'}`}>
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
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200">
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
