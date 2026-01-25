import React, { useState } from 'react';
import { Menu, Button, Text, Card, Space } from '@expcat/tigercat-react';

interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
}

interface MainLayoutProps {
  children: React.ReactNode;
  user: { username: string } | null;
  onLogout: () => void;
  onChangePassword: () => void;
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

export function MainLayout({
  children,
  user,
  onLogout,
  onChangePassword,
}: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('home');

  const toggleCollapsed = () => setCollapsed(!collapsed);

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
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
          {/* Note: Assuming Menu supports inline/vertical mode and collapse */}
          <Menu
            activeKey={activeMenu}
            onSelect={(key) => setActiveMenu(key)}
            items={MENU_ITEMS}
            // Helper for collapsed state if supported by component, otherwise we might need to rely on CSS hiding or passing props
          />
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-center">
          <button
            onClick={toggleCollapsed}
            className="text-slate-500 hover:text-slate-700">
            {collapsed ? '➡️' : '⬅️ Collapse'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center">
            <Text size="lg" weight="bold">
              Admin Portal
            </Text>
          </div>

          <div className="flex items-center gap-4">
            {/* User Info / Actions */}
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.username}</span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            <button
              onClick={onChangePassword}
              className="text-sm text-slate-600 hover:text-blue-600">
              Password
            </button>
            <button
              onClick={onLogout}
              className="text-sm text-red-600 hover:text-red-700 font-medium">
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 scroll-smooth">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
