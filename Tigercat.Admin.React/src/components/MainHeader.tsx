import React from 'react';
import { Text, Avatar } from '@expcat/tigercat-react';
import {
  HomeIcon,
  LockIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
} from './Icons';
import type { ThemeMode } from '../utils/types';
import { resolveEffectiveMode } from '../utils/theme';

interface MainHeaderProps {
  session: { username: string } | null;
  themeMode: ThemeMode;
  onLogout: () => void;
  onChangePassword: () => void;
  onToggleTheme: () => void;
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
  themeMode,
  onLogout,
  onChangePassword,
  onToggleTheme,
}: MainHeaderProps) {
  return (
    <header className="h-16 bg-[var(--tiger-bg-card,#fff)] border-b border-[var(--tiger-border,#e2e8f0)] flex items-center justify-between px-6 shadow-sm z-10">
      {/* 左侧标题 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--tiger-text-secondary,#64748b)]">
            <HomeIcon size={24} />
          </span>
          <Text
            size="lg"
            weight="bold"
            className="text-[var(--tiger-text,#1f2937)]">
            管理中心
          </Text>
        </div>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-3">
        {/* 主题切换 */}
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--tiger-text-secondary,#64748b)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)] transition-colors"
          title={getThemeLabel(themeMode)}>
          <ThemeIcon mode={themeMode} />
        </button>

        {/* 用户信息 */}
        {session && (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-[var(--tiger-bg-hover,#f3f4f6)] border border-[var(--tiger-border,#e2e8f0)]">
            <Avatar className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
              {session.username.charAt(0).toUpperCase()}
            </Avatar>
            <span className="text-sm font-medium text-[var(--tiger-text,#1f2937)]">
              {session.username}
            </span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={onChangePassword}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--tiger-text-secondary,#64748b)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)] transition-colors">
            <LockIcon size={16} />
            <span>修改密码</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-medium transition-colors dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300">
            <LogOutIcon size={16} />
            <span>退出</span>
          </button>
        </div>
      </div>
    </header>
  );
}
