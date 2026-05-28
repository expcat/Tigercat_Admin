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
}: MainHeaderProps) {
  const accountLabel = session?.username ?? '账户';
  const currentBreadcrumbItems =
    breadcrumbItems.length > 0 ? breadcrumbItems : [pageTitle];

  return (
    <Header className="flex items-center justify-between px-6 shadow-sm z-10">
      <div className="flex min-w-0 flex-col gap-1 py-3">
        {showSidebarToggle && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-controls="main-sidebar"
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? '关闭导航菜单' : '打开导航菜单'}
            className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-(--tiger-border,#e2e8f0) text-(--tiger-text-secondary,#64748b) transition-colors hover:border-(--tiger-primary,#3b82f6) hover:bg-(--tiger-bg-hover,#f3f4f6) hover:text-(--tiger-text,#1f2937) md:hidden">
            {sidebarOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
          </button>
        )}
        <Text size="lg" weight="bold" className="text-(--tiger-text,#1f2937)">
          管理中心
        </Text>
        <Breadcrumb className="text-sm text-(--tiger-text-secondary,#64748b)">
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
      <div className="flex items-center gap-3">
        <Dropdown trigger="click" placement="bottom-end">
          <button
            className="flex items-center gap-3 rounded-full border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-hover,#f3f4f6) px-3 py-1.5 text-left transition-colors hover:border-(--tiger-primary,#3b82f6) hover:text-(--tiger-text,#1f2937)"
            title={accountLabel}
            aria-label={accountLabel}>
            <Avatar className="bg-linear-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
              {accountLabel.charAt(0).toUpperCase()}
            </Avatar>
            <span className="text-sm font-medium text-(--tiger-text,#1f2937)">
              {accountLabel}
            </span>
          </button>

          <DropdownMenu className="min-w-56">
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
