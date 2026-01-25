import React from 'react';
import { Menu } from '@expcat/tigercat-react';

interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
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
    label: 'Dashboard',
    icon: '📊',
  },
  {
    key: 'system',
    label: 'System',
    icon: '⚙️',
    children: [
      { key: 'users', label: 'Users', icon: '👥' },
      { key: 'roles', label: 'Roles', icon: '🛡️' },
      { key: 'settings', label: 'Settings', icon: '🔧' },
    ],
  },
  {
    key: 'about',
    label: 'About',
    icon: 'ℹ️',
  },
];

export function MainSidebar({
  collapsed,
  activeMenu,
  onCollapsedChange,
  onMenuSelect,
}: MainSidebarProps) {
  return (
    <aside
      className={`flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}>
      <div className="flex h-16 items-center justify-center border-b border-slate-100">
        <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
          <span>🐯</span>
          {!collapsed && <span>Tigercat</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <Menu
          activeKey={activeMenu}
          onSelect={onMenuSelect}
          items={MENU_ITEMS}
        />
      </div>

      <div className="p-4 border-t border-slate-100 flex justify-center">
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="text-slate-500 hover:text-slate-700">
          {collapsed ? '➡️' : '⬅️ Collapse'}
        </button>
      </div>
    </aside>
  );
}
