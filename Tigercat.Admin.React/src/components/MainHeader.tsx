import React from 'react';
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
} from './Icons';
import type { ThemeMode } from '../utils/types';
import { resolveEffectiveMode } from '../utils/theme';

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
    <Header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 shadow-sm z-10 md:flex-nowrap md:px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-2">
        {showSidebarToggle && (
          <Button
            variant="outline"
            onClick={onToggleSidebar}
            aria-controls="main-sidebar"
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? '关闭导航菜单' : '打开导航菜单'}
            className="mb-1 h-10 w-10 !p-0 md:hidden">
            {sidebarOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
          </Button>
        )}
        <Text size="lg" weight="bold" className="text-(--tiger-text,#1f2937)">
          管理中心
        </Text>
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
          <Tag variant="warning" className="rounded-full px-3 font-medium">
            演示模式
          </Tag>
        )}
        <Dropdown trigger="click" placement="bottom-end">
          <button
            className="flex max-w-[12rem] items-center gap-2 rounded-full border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-hover,#f3f4f6) px-2.5 py-1.5 text-left transition-colors hover:border-(--tiger-primary,#3b82f6) hover:text-(--tiger-text,#1f2937) sm:max-w-56 sm:gap-3 sm:px-3"
            title={accountLabel}
            aria-label={accountLabel}>
            <Avatar className="shrink-0 font-bold text-sm bg-gradient-to-tr from-(--tiger-primary,#3b82f6) to-blue-400 text-white">
              {accountLabel.charAt(0).toUpperCase()}
            </Avatar>
            <span className="min-w-0 truncate text-sm font-medium text-(--tiger-text,#1f2937)">
              {accountLabel}
            </span>
          </button>

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
