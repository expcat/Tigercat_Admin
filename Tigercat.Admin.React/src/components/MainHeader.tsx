import { useEffect, useState } from 'react';
import { Avatar } from '@expcat/tigercat-react/Avatar';
import { Icon } from '@expcat/tigercat-react/Icon';
import type { IconDefinition } from '@expcat/tigercat-core/icons/registry';
import {
  Breadcrumb,
  BreadcrumbItem,
} from '@expcat/tigercat-react/Breadcrumb';
import { Button } from '@expcat/tigercat-react/Button';
import {
  Dropdown,
  DropdownMenu,
  DropdownItem,
} from '@expcat/tigercat-react/Dropdown';
import { Header } from '@expcat/tigercat-react/Header';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import {
  LockIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  MenuIcon,
  XIcon,
  ChevronDownIcon,
  UserIcon,
  PaletteIcon,
} from './Icons';
import type { ThemeMode, ThemePreferences } from '../utils/types';
import { resolveEffectiveMode } from '../utils/theme';
import { NotificationBell } from './NotificationBell';
import { ThemeConfigDrawer } from './ThemeConfigDrawer';
import {
  isDocumentFullscreen,
  toggleDocumentFullscreen,
} from '../utils/fullscreen';

const ENTER_FULLSCREEN_ICON: IconDefinition = {
  viewBox: '0 0 24 24',
  mode: 'stroke',
  paths: [
    'M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15',
  ],
};

const EXIT_FULLSCREEN_ICON: IconDefinition = {
  viewBox: '0 0 24 24',
  mode: 'stroke',
  paths: [
    'M9 9 3.75 3.75M9 9H4.5M9 9V4.5M15 9l5.25-5.25M15 9h4.5M15 9V4.5M9 15l-5.25 5.25M9 15H4.5M9 15v4.5M15 15l5.25 5.25M15 15h4.5M15 15v4.5',
  ],
};

interface MainHeaderProps {
  session: { username: string } | null;
  pageTitle: string;
  breadcrumbItems: string[];
  themePrefs: ThemePreferences;
  showSidebarToggle?: boolean;
  sidebarOpen?: boolean;
  onLogout: () => void;
  onChangePassword: () => void;
  onToggleTheme: () => void;
  onUpdateTheme: (prefs: ThemePreferences) => void;
  onProfile: () => void;
  onLockScreen: () => void;
  onToggleSidebar?: () => void;
  demoMode?: boolean;
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === 'system') return <MonitorIcon size={16} />;
  return resolveEffectiveMode(mode) === 'dark' ? (
    <MoonIcon size={16} />
  ) : (
    <SunIcon size={16} />
  );
}

function getThemeLabel(mode: ThemeMode): string {
  if (mode === 'light') return '浅色';
  if (mode === 'dark') return '深色';
  return '跟随系统';
}

export function MainHeader({
  session,
  pageTitle,
  breadcrumbItems,
  themePrefs,
  showSidebarToggle,
  sidebarOpen,
  onLogout,
  onChangePassword,
  onToggleTheme,
  onUpdateTheme,
  onProfile,
  onLockScreen,
  onToggleSidebar,
  demoMode,
}: MainHeaderProps) {
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const themeMode = themePrefs.mode;
  const accountLabel = session?.username ?? '账户';
  const currentBreadcrumbItems =
    breadcrumbItems.length > 0 ? breadcrumbItems : [pageTitle];

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(isDocumentFullscreen());
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  return (
    <Header height="auto" className="p2-main-header flex min-h-16 flex-wrap items-center justify-between gap-2 px-3 py-2 z-10 sm:gap-3 sm:px-4 md:flex-nowrap md:px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {showSidebarToggle && (
            <Button
              variant="outline"
              onClick={onToggleSidebar}
              aria-controls="main-sidebar"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? '关闭导航菜单' : '打开导航菜单'}
              className="p2-header-toggle-btn h-10 w-10 !p-0 shrink-0">
              {sidebarOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
            </Button>
          )}
          <Text size="lg" weight="bold" className="p2-header-title whitespace-nowrap">
            管理中心
          </Text>
        </div>
        <Breadcrumb
          className="min-w-0 max-w-full overflow-hidden text-sm text-(--tiger-text-secondary,#64748b)"
          maxItems={4}>
          <BreadcrumbItem>管理中心</BreadcrumbItem>
          {currentBreadcrumbItems.map((item, index) => (
            <BreadcrumbItem
              key={`${item}-${index}`}
              current={index === currentBreadcrumbItems.length - 1}>
              {item}
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
      </div>

      {/* 右侧操作区 */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        {demoMode && (
          <Tag variant="warning" className="p2-header-demo-tag hidden rounded-full px-3 font-medium sm:inline-flex">
            演示模式
          </Tag>
        )}
        <button
          type="button"
          data-testid="shell-fullscreen-toggle"
          aria-label={fullscreen ? '退出全屏' : '进入全屏'}
          title={fullscreen ? '退出全屏' : '进入全屏'}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-(--tiger-text,#1f2937) transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9)"
          onClick={() => {
            void toggleDocumentFullscreen().catch(() => undefined);
          }}>
          <Icon
            icon={fullscreen ? EXIT_FULLSCREEN_ICON : ENTER_FULLSCREEN_ICON}
            size="md"
          />
        </button>
        <button
          type="button"
          data-testid="shell-theme-config-trigger"
          aria-label="主题配置"
          title="主题配置"
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-(--tiger-text,#1f2937) transition-colors hover:bg-(--tiger-bg-hover,#f1f5f9) ${themeDrawerOpen ? 'bg-(--tiger-bg-hover,#f1f5f9)' : ''}`}
          onClick={() => setThemeDrawerOpen(true)}>
          <PaletteIcon size={20} />
        </button>
        <NotificationBell />
        <Dropdown
          trigger="click"
          placement="bottom-end"
          showArrow={false}
          renderTrigger={({ open }) => (
            <button
              className="p2-header-user-btn"
              title={accountLabel}
              aria-label={accountLabel}>
              <Avatar className="p2-avatar shrink-0 font-bold text-sm bg-gradient-to-tr from-(--tiger-primary,#3b82f6) to-blue-400 text-white">
                {accountLabel.charAt(0).toUpperCase()}
              </Avatar>
              <span className="p2-header-user-name hidden min-w-0 truncate text-sm font-medium text-(--tiger-text,#1f2937) sm:inline">
                {accountLabel}
              </span>
              <ChevronDownIcon
                size={14}
                className={`p2-header-chevron hidden shrink-0 sm:block ${open ? 'rotate-180' : ''}`}
              />
            </button>
          )}>
          <DropdownMenu className="w-56 max-w-[calc(100vw-2rem)]">
            <DropdownItem onClick={onProfile}>
              <span className="flex items-center gap-2 text-sm">
                <UserIcon size={16} />
                <span>个人中心</span>
              </span>
            </DropdownItem>
            <DropdownItem divided onClick={onToggleTheme}>
              <span className="flex items-center gap-2 text-sm">
                <ThemeIcon mode={themeMode} />
                <span>主题模式：{getThemeLabel(themeMode)}</span>
              </span>
            </DropdownItem>
            <DropdownItem onClick={onChangePassword}>
              <span className="flex items-center gap-2 text-sm">
                <LockIcon size={16} />
                <span>修改密码</span>
              </span>
            </DropdownItem>
            <DropdownItem onClick={onLockScreen}>
              <span className="flex items-center gap-2 text-sm">
                <LockIcon size={16} />
                <span>锁定屏幕</span>
              </span>
            </DropdownItem>
            <DropdownItem divided onClick={onLogout}>
              <span className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <LogOutIcon size={16} />
                <span>退出登录</span>
              </span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
      <ThemeConfigDrawer
        open={themeDrawerOpen}
        themePrefs={themePrefs}
        onClose={() => setThemeDrawerOpen(false)}
        onUpdateTheme={onUpdateTheme}
      />
    </Header>
  );
}
