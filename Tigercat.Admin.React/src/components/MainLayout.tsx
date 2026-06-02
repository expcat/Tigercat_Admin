import React, { useEffect, useState } from 'react';
import { Layout, Content } from '@expcat/tigercat-react';
import { MainHeader } from './MainHeader';
import { MainSidebar } from './MainSidebar';
import type { ThemeMode } from '../utils/types';
import {
  getShellBreadcrumbItems,
  getShellPageTitle,
} from '../utils/shell-navigation';

const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)';

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
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [internalActiveMenu, setInternalActiveMenu] = useState(
    activeMenu ?? 'home',
  );
  const currentActiveMenu = activeMenu ?? internalActiveMenu;

  useEffect(() => {
    if (activeMenu) {
      setInternalActiveMenu(activeMenu);
    }
  }, [activeMenu]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);

    const syncMobileState = (matches: boolean) => {
      setIsMobile(matches);
      setSidebarOpen(false);
    };

    syncMobileState(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncMobileState(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobile || !sidebarOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobile, sidebarOpen]);

  const handleMenuSelect = (key: string) => {
    setInternalActiveMenu(key);
    if (isMobile) {
      setSidebarOpen(false);
    }
    onNavigate?.(key);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const pageTitle = getShellPageTitle(currentActiveMenu);
  const breadcrumbItems = getShellBreadcrumbItems(currentActiveMenu);

  return (
    <Layout className="h-screen w-full overflow-hidden">
      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label="关闭导航菜单"
          onClick={handleSidebarClose}
          className="fixed inset-0 z-30 bg-slate-950/45 md:hidden"
        />
      )}

      {/* Sidebar */}
      <div
        id="main-sidebar"
        aria-hidden={isMobile && !sidebarOpen}
        className={
          isMobile
            ? `fixed inset-y-0 left-0 z-40 shrink-0 transform transition-transform duration-200 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : 'relative shrink-0'
        }>
        <MainSidebar
          collapsed={isMobile ? !sidebarOpen : collapsed}
          activeMenu={currentActiveMenu}
          showCollapseToggle={!isMobile}
          sidebarWidth="240px"
          collapsedWidth={isMobile ? '0px' : '64px'}
          onCollapsedChange={setCollapsed}
          onMenuSelect={handleMenuSelect}
        />
      </div>

      {/* Main Content Area */}
      <Layout className="min-w-0">
        {/* Header */}
        <MainHeader
          session={user}
          pageTitle={pageTitle}
          breadcrumbItems={breadcrumbItems}
          themeMode={themeMode}
          showSidebarToggle={isMobile}
          sidebarOpen={sidebarOpen}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
          onToggleTheme={onToggleTheme}
          onToggleSidebar={handleSidebarToggle}
        />

        {/* Content */}
        <Content className="overflow-auto p-4 scroll-smooth md:p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
