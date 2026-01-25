import React from 'react';
import { Text, Avatar } from '@expcat/tigercat-react';

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
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 transition-colors">
      <div className="flex items-center">
        <Text size="lg" weight="bold">
          Admin Portal
        </Text>
      </div>

      <div className="flex items-center gap-4">
        {session && (
          <div className="flex items-center gap-2">
            <Avatar className="bg-blue-100 text-blue-600 font-bold">
              {session.username.charAt(0).toUpperCase()}
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{session.username}</span>
            </div>
          </div>
        )}

        <div className="h-6 w-px bg-slate-200 mx-2"></div>

        <button
          onClick={onChangePassword}
          className="text-sm text-slate-600 hover:text-blue-600 cursor-pointer">
          Password
        </button>
        <button
          onClick={onLogout}
          className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer">
          Logout
        </button>
      </div>
    </header>
  );
}
