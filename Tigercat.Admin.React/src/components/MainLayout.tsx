import React, { useEffect, useState } from 'react';
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
    <div className="flex h-screen w-full bg-[var(--tiger-bg-page,#f9fafb)] overflow-hidden">
      {/* Sidebar */}
      <MainSidebar
        collapsed={collapsed}
        activeMenu={currentActiveMenu}
        onCollapsedChange={setCollapsed}
        onMenuSelect={handleMenuSelect}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <MainHeader
          session={user}
          themeMode={themeMode}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
          onToggleTheme={onToggleTheme}
        />

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 scroll-smooth">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
