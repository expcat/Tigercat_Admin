import React, { useState } from 'react';

interface MenuItem {
  key: string;
  label: string;
  icon: string;
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
    icon: '📊',
  },
  {
    key: 'system',
    label: '系统管理',
    icon: '⚙️',
    children: [
      { key: 'users', label: '用户管理', icon: '👥' },
      { key: 'roles', label: '角色管理', icon: '🛡️' },
      { key: 'settings', label: '系统设置', icon: '🔧' },
    ],
  },
  {
    key: 'about',
    label: '关于',
    icon: 'ℹ️',
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
      className={`flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shrink-0 ${
        collapsed ? 'w-16' : 'w-60'
      }`}>
      {/* Logo */}
      <div className="flex h-14 items-center justify-center border-b border-slate-100">
        <div className="flex items-center gap-2 font-bold text-lg text-slate-800">
          <span className="text-xl">🐯</span>
          {!collapsed && <span className="transition-opacity">Tigercat</span>}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <ul className="space-y-1">
          {MENU_ITEMS.map((item) => (
            <li key={item.key}>
              {item.children && item.children.length > 0 ? (
                // 有子菜单
                <>
                  <button
                    onClick={() => toggleExpand(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isExpanded(item.key)
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}>
                    <span className="text-base">{item.icon}</span>
                    {!collapsed && (
                      <span className="flex-1 text-left">{item.label}</span>
                    )}
                    {!collapsed && (
                      <span
                        className={`text-xs transition-transform ${
                          isExpanded(item.key) ? 'rotate-90' : ''
                        }`}>
                        ▶
                      </span>
                    )}
                  </button>
                  {/* 子菜单 */}
                  {!collapsed && isExpanded(item.key) && (
                    <ul className="mt-1 ml-4 space-y-1 border-l-2 border-slate-100 pl-2">
                      {item.children.map((child) => (
                        <li key={child.key}>
                          <button
                            onClick={() => onMenuSelect(child.key)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive(child.key)
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}>
                            <span className="text-sm">{child.icon}</span>
                            <span>{child.label}</span>
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.key)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}>
                  <span className="text-base">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* 折叠按钮 */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
          <span>{collapsed ? '▶' : '◀'}</span>
          {!collapsed && <span>收起菜单</span>}
        </button>
      </div>
    </aside>
  );
}
