import React, { useEffect, useState } from 'react';
import { Layout, Content } from '@expcat/tigercat-react';
import { MainHeader } from './MainHeader';
import { MainSidebar } from './MainSidebar';
import type { ThemeMode } from '../utils/types';

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
