import {
  Text,
  Avatar,
  Header,
  Breadcrumb,
  BreadcrumbItem,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Button,
  Tag,
} from '@expcat/tigercat-react';
import {
  LockIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  MenuIcon,
  XIcon,
  ChevronDownIcon,
} from './Icons';
import type { ThemeMode } from '../utils/types';
import { resolveEffectiveMode } from '../utils/theme';
import { NotificationBell } from './NotificationBell';

interface MainHeaderProps {
  session: { username: string } | null;
  pageTitle: string;
  breadcrumbItems: string[];
  themeMode: ThemeMode;
  showSidebarToggle?: boolean;
  sidebarOpen?: boolean;
  onLogout: () => void;
  onChangePassword: () => void;
  onToggleTheme: () => void;
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
  themeMode,
  showSidebarToggle,
  sidebarOpen,
  onLogout,
  onChangePassword,
  onToggleTheme,
  onToggleSidebar,
  demoMode,
}: MainHeaderProps) {
  const accountLabel = session?.username ?? '账户';
  const currentBreadcrumbItems =
    breadcrumbItems.length > 0 ? breadcrumbItems : [pageTitle];

  return (
    <Header height="auto" className="p2-main-header flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 z-10 md:flex-nowrap md:px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-2">
        <div className="flex items-center gap-2">
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
          <Text size="lg" weight="bold" className="p2-header-title">
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
      <div className="flex min-w-0 max-w-full shrink-0 items-center gap-2 sm:gap-3">
        {demoMode && (
          <Tag variant="warning" className="p2-header-demo-tag rounded-full px-3 font-medium">
            演示模式
          </Tag>
        )}
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
              <span className="min-w-0 truncate text-sm font-medium text-(--tiger-text,#1f2937)">
                {accountLabel}
              </span>
              <ChevronDownIcon
                size={14}
                className={`p2-header-chevron shrink-0 ${open ? 'rotate-180' : ''}`}
              />
            </button>
          )}>
          <DropdownMenu className="w-56 max-w-[calc(100vw-2rem)]">
            <DropdownItem onClick={onToggleTheme}>
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
            <DropdownItem divided onClick={onLogout}>
              <span className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <LogOutIcon size={16} />
                <span>退出登录</span>
              </span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </Header>
  );
}
