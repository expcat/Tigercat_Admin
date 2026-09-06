import React, { useEffect, useRef, useState } from 'react';
import { Content } from '@expcat/tigercat-react/Content';
import { Drawer } from '@expcat/tigercat-react/Drawer';
import { Layout } from '@expcat/tigercat-react/Layout';
import { Watermark } from '@expcat/tigercat-react/Watermark';
import { MainHeader } from './MainHeader';
import { MainSidebar } from './MainSidebar';
import { CommandPalette } from './CommandPalette';
import { ChatDock } from './ChatDock';
import { ShellQuickActions } from './ShellQuickActions';
import { OnboardingTour } from './OnboardingTour';
import type { ThemePreferences } from '../utils/types';
import {
  getWatermarkContent,
  SHELL_WATERMARK_CLASS,
  SHELL_WATERMARK_OVERLAY_CLASS,
  SHELL_WATERMARK_PANE_CLASS,
  useWatermarkEnabled,
} from '../utils/watermark';
import {
  getShellBreadcrumbItems,
  getShellPageTitle,
  isShellPageKey,
  type ShellPageKey,
} from '../utils/shell-navigation';
import { useTagsView } from '../utils/tags-view';
import { TagsView } from './TagsView';
import { LockScreen } from './LockScreen';
import { ShellFooter } from './ShellFooter';
import { useLockScreen } from '../utils/lock-screen';

const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)';
const DEMO_MODE = import.meta.env.VITE_TIGERCAT_DEMO === 'true';

interface MainLayoutProps {
  children: React.ReactNode;
  user: { username: string } | null;
  themePrefs: ThemePreferences;
  onLogout: () => void;
  onChangePassword: () => void;
  onToggleTheme: () => void;
  onUpdateTheme: (prefs: ThemePreferences) => void;
  onProfile: () => void;
  activeMenu?: string;
  onNavigate?: (key: string) => void;
}

export function MainLayout({
  children,
  user,
  themePrefs,
  onLogout,
  onChangePassword,
  onToggleTheme,
  onUpdateTheme,
  onProfile,
  activeMenu,
  onNavigate,
}: MainLayoutProps) {
  const compactMode = themePrefs.compactMode;
  const [collapsed, setCollapsed] = useState(compactMode);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [internalActiveMenu, setInternalActiveMenu] = useState(
    activeMenu ?? 'home',
  );
  const currentActiveMenu = activeMenu ?? internalActiveMenu;
  const currentPageKey: ShellPageKey = isShellPageKey(currentActiveMenu)
    ? currentActiveMenu
    : 'home';
  const tagsView = useTagsView(currentPageKey, onNavigate);
  const { locked, lock, unlock } = useLockScreen();
  const wasLockedRef = useRef(locked);

  useEffect(() => {
    if (wasLockedRef.current && !locked) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLButtonElement>('.p2-header-user-btn')?.focus();
      });
    }
    wasLockedRef.current = locked;
  }, [locked]);
  const { watermarkEnabled } = useWatermarkEnabled();
  const watermarkContent = getWatermarkContent(user?.username);

  useEffect(() => {
    if (activeMenu) {
      setInternalActiveMenu(activeMenu);
    }
  }, [activeMenu]);

  useEffect(() => {
    setCollapsed(compactMode);
  }, [compactMode]);

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
    <div className="relative h-screen w-full">
      <div
        className="h-screen w-full"
        inert={locked ? true : undefined}
        aria-hidden={locked || undefined}
      >
    <Layout className="h-screen w-full overflow-hidden !flex-row">
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          placement="left"
          open={sidebarOpen}
          onClose={handleSidebarClose}
          onAfterClose={() => {
            document
              .querySelector<HTMLButtonElement>('[aria-controls="main-sidebar"]')
              ?.focus();
          }}
          closable={false}
          mask={true}
          maskClosable={true}
          destroyOnClose={true}
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
          themePrefs={themePrefs}
          showSidebarToggle={true}
          sidebarOpen={!isMobile ? !collapsed : sidebarOpen}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
          onToggleTheme={onToggleTheme}
          onUpdateTheme={onUpdateTheme}
          onProfile={onProfile}
          onLockScreen={lock}
          onToggleSidebar={handleSidebarToggle}
          demoMode={DEMO_MODE}
        />

        <div className={`relative ${SHELL_WATERMARK_PANE_CLASS}`}>
          <TagsView
            keys={tagsView.keys}
            activeKey={currentPageKey}
            onSelect={tagsView.selectTab}
            onClose={tagsView.closeTab}
            onCloseCurrent={tagsView.closeCurrent}
            onCloseOthers={tagsView.closeOthers}
            onCloseAll={tagsView.closeAll}
          />
          <Content id="main-content-scroll" className="min-h-0 flex-1 overflow-auto p-3 pb-24 scroll-smooth sm:p-4 sm:pb-24 md:p-6 md:pb-28">
            <div className="mx-auto max-w-7xl animate-fade-in">
              {children}
              <ShellFooter />
            </div>
          </Content>
          {watermarkEnabled ? (
            <div
              className={SHELL_WATERMARK_OVERLAY_CLASS}
              data-testid="shell-watermark"
            >
              <Watermark
                content={watermarkContent}
                className={SHELL_WATERMARK_CLASS}
                width={180}
                height={80}
                font={{ fontSize: 14 }}
              />
            </div>
          ) : null}
        </div>
      </Layout>

      {/* 全局 Shell 挂件 */}
      <CommandPalette
        onToggleTheme={onToggleTheme}
        onChangePassword={onChangePassword}
        onLogout={onLogout}
        onOpenChat={() => setChatOpen(true)}
      />
      <ChatDock open={chatOpen} onOpenChange={setChatOpen} />
      <ShellQuickActions />
      <OnboardingTour />
    </Layout>
      </div>
      {locked ? <LockScreen session={user} onUnlock={unlock} /> : null}
    </div>
  );
}
