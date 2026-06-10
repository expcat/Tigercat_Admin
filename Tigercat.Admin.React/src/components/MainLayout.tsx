import React, { useEffect, useState } from 'react';
import { Layout, Content, Drawer } from '@expcat/tigercat-react';
import { MainHeader } from './MainHeader';
import { MainSidebar } from './MainSidebar';
import type { ThemeMode } from '../utils/types';
import {
  getShellBreadcrumbItems,
  getShellPageTitle,
} from '../utils/shell-navigation';

const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)';
const DEMO_MODE = import.meta.env.VITE_TIGERCAT_DEMO === 'true';

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

  const handleMenuSelect = (key: string) => {
    setInternalActiveMenu(key);
    if (isMobile) {
      setSidebarOpen(false);
    }
    onNavigate?.(key);
  };

  const handleSidebarToggle = () => {
    if (isMobile) {
      setSidebarOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const pageTitle = getShellPageTitle(currentActiveMenu);
  const breadcrumbItems = getShellBreadcrumbItems(currentActiveMenu);

  return (
    <Layout className="h-screen w-full overflow-hidden !flex-row">
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          placement="left"
          open={sidebarOpen}
          onClose={handleSidebarClose}
          onAfterLeave={() => {
            document
              .querySelector<HTMLButtonElement>('[aria-controls="main-sidebar"]')
              ?.focus();
          }}
          closable={false}
          mask={true}
          maskClosable={true}
          destroyOnClose={true}
          destroyOnCloseAfterLeave={true}
          fullscreenOnMobile={false}
          width="240px"
          panelStyle={{
            width: '240px',
            maxWidth: '240px',
          }}
          bodyClassName="!p-0 h-full"
        >
          <div id="main-sidebar" className="h-full">
            <MainSidebar
              collapsed={false}
              activeMenu={currentActiveMenu}
              showCollapseToggle={false}
              sidebarWidth="240px"
              collapsedWidth="64px"
              onCollapsedChange={setCollapsed}
              onMenuSelect={handleMenuSelect}
            />
          </div>
        </Drawer>
      ) : (
        <div 
          id="main-sidebar" 
          className="relative h-full shrink-0 overflow-hidden"
        >
          <MainSidebar
            collapsed={collapsed}
            activeMenu={currentActiveMenu}
            showCollapseToggle={true}
            sidebarWidth="240px"
            collapsedWidth="64px"
            onCollapsedChange={setCollapsed}
            onMenuSelect={handleMenuSelect}
          />
        </div>
      )}

      {/* Main Content Area */}
      <Layout className="h-full min-h-0 min-w-0 flex-1">
        {/* Header */}
        <MainHeader
          session={user}
          pageTitle={pageTitle}
          breadcrumbItems={breadcrumbItems}
          themeMode={themeMode}
          showSidebarToggle={true}
          sidebarOpen={!isMobile ? !collapsed : sidebarOpen}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
          onToggleTheme={onToggleTheme}
          onToggleSidebar={handleSidebarToggle}
          demoMode={DEMO_MODE}
        />

        {/* Content */}
        <Content className="min-h-0 overflow-auto p-3 scroll-smooth sm:p-4 md:p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
