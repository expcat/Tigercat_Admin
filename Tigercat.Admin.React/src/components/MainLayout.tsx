import React, { useState } from 'react';
import { MainHeader } from './MainHeader';
import { MainSidebar } from './MainSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  user: { username: string } | null;
  onLogout: () => void;
  onChangePassword: () => void;
}

export function MainLayout({
  children,
  user,
  onLogout,
  onChangePassword,
}: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('home');

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <MainSidebar
        collapsed={collapsed}
        activeMenu={activeMenu}
        onCollapsedChange={setCollapsed}
        onMenuSelect={setActiveMenu}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <MainHeader
          session={user}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
        />

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 scroll-smooth">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
