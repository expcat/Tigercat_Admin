import React from 'react';
import { Text, Avatar } from '@expcat/tigercat-react';
import { HomeIcon, LockIcon, LogOutIcon } from './Icons';

interface MainHeaderProps {
  session: { username: string } | null;
  onLogout: () => void;
  onChangePassword: () => void;
}

export function MainHeader({
  session,
  onLogout,
  onChangePassword,
}: MainHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
      {/* 左侧标题 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">
            <HomeIcon size={24} />
          </span>
          <Text size="lg" weight="bold" className="text-slate-800">
            管理中心
          </Text>
        </div>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-3">
        {/* 用户信息 */}
        {session && (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
            <Avatar className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
              {session.username.charAt(0).toUpperCase()}
            </Avatar>
            <span className="text-sm font-medium text-slate-700">
              {session.username}
            </span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={onChangePassword}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors">
            <LockIcon size={16} />
            <span>修改密码</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-medium transition-colors">
            <LogOutIcon size={16} />
            <span>退出</span>
          </button>
        </div>
      </div>
    </header>
  );
}
