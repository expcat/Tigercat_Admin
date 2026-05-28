import React, { useEffect, useState } from 'react';
import { Layout, Content } from '@expcat/tigercat-react';
import { MainHeader } from './MainHeader';
import { MainSidebar } from './MainSidebar';
import type { ThemeMode } from '../utils/types';

const PAGE_TITLES: Record<string, string> = {
  home: '仪表盘',
  users: '用户管理',
  roles: '角色管理',
  settings: '系统设置',
  about: '关于',
};

interface MainLayoutProps {
  children: React.ReactNode;
  user: { username: string } | null;
  themeMode: ThemeMode;
  compactMode?: boolean;
  onLogout: () => void;
  onChangePassword: () => void;
  onToggleTheme: () => void;
  activeMenu?: string;
  onNavigate?: (key: string) => void;
}

export function MainLayout({
  children,
  user,
  themeMode,
  compactMode,
  onLogout,
  onChangePassword,
  onToggleTheme,
  activeMenu,
  onNavigate,
}: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(compactMode ?? false);
  const [internalActiveMenu, setInternalActiveMenu] = useState(
    activeMenu ?? 'home',
  );
  const currentActiveMenu = activeMenu ?? internalActiveMenu;

  useEffect(() => {
    if (activeMenu) {
      setInternalActiveMenu(activeMenu);
    }
  }, [activeMenu]);

  const handleMenuSelect = (key: string) => {
    setInternalActiveMenu(key);
    onNavigate?.(key);
  };

  const pageTitle = PAGE_TITLES[currentActiveMenu] ?? '仪表盘';

  return (
    <Layout className="h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <MainSidebar
        collapsed={collapsed}
        activeMenu={currentActiveMenu}
        onCollapsedChange={setCollapsed}
        onMenuSelect={handleMenuSelect}
      />

      {/* Main Content Area */}
      <Layout>
        {/* Header */}
        <MainHeader
          session={user}
          pageTitle={pageTitle}
          themeMode={themeMode}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
          onToggleTheme={onToggleTheme}
        />

        {/* Content */}
        <Content className="overflow-auto p-6 scroll-smooth">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
