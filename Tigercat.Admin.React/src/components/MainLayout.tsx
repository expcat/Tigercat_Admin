import React, { useEffect, useRef, useState } from 'react';
import { Layout, Content, Drawer } from '@expcat/tigercat-react';
import { MainHeader } from './MainHeader';
import { MainSidebar } from './MainSidebar';
import type { ThemeMode } from '../utils/types';
import {
  getShellBreadcrumbItems,
  getShellPageTitle,
} from '../utils/shell-navigation';

const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)';
const MOBILE_SIDEBAR_ANIMATION_MS = 300;
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
  const [sidebarRendered, setSidebarRendered] = useState(false);
  const sidebarOpenFrame = useRef<number | null>(null);
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
      setSidebarRendered(false);
    };

    syncMobileState(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncMobileState(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      clearSidebarOpenFrame();
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

  useEffect(() => {
    if (!isMobile || sidebarOpen || !sidebarRendered) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSidebarRendered(false);
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>('[aria-controls="main-sidebar"]')
          ?.focus();
      });
    }, MOBILE_SIDEBAR_ANIMATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isMobile, sidebarOpen, sidebarRendered]);

  const handleSidebarOpen = () => {
    clearSidebarOpenFrame();
    if (sidebarRendered) {
      setSidebarOpen(true);
      return;
    }

    setSidebarRendered(true);
    sidebarOpenFrame.current = window.requestAnimationFrame(() => {
      setSidebarOpen(true);
      sidebarOpenFrame.current = null;
    });
  };

  const handleMenuSelect = (key: string) => {
    setInternalActiveMenu(key);
    if (isMobile) {
      setSidebarOpen(false);
    }
    onNavigate?.(key);
  };

  const handleSidebarToggle = () => {
    if (isMobile) {
      if (sidebarOpen) {
        setSidebarOpen(false);
      } else {
        handleSidebarOpen();
      }
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  const handleSidebarClose = () => {
    clearSidebarOpenFrame();
    setSidebarOpen(false);
  };

  function clearSidebarOpenFrame() {
    if (sidebarOpenFrame.current !== null) {
      window.cancelAnimationFrame(sidebarOpenFrame.current);
      sidebarOpenFrame.current = null;
    }
  }

  const pageTitle = getShellPageTitle(currentActiveMenu);
  const breadcrumbItems = getShellBreadcrumbItems(currentActiveMenu);

  return (
    <Layout className="h-screen w-full overflow-hidden !flex-row">
      {/* Sidebar */}
      {isMobile && sidebarRendered ? (
        <>
          <Drawer
            placement="left"
            open={sidebarRendered}
            onClose={handleSidebarClose}
            closable={false}
            mask={true}
            maskClosable={true}
            width="240px"
            style={{
              maxWidth: '240px',
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: `transform ${MOBILE_SIDEBAR_ANIMATION_MS}ms ease-in-out`,
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
        </>
      ) : !isMobile ? (
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
      ) : null}

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
