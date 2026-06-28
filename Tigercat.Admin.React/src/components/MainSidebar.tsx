import { useEffect, useMemo, useState } from 'react';
import { Sidebar, Menu } from '@expcat/tigercat-react';
import type { MenuItem } from '@expcat/tigercat-core';
import { LogoIcon, ChevronRightIcon, ChevronLeftIcon } from './Icons';
import { usePermission } from '../utils/permission';
import {
  SHELL_BOTTOM_MENU_ITEMS,
  SHELL_MENU_ITEMS,
  filterShellMenuItems,
  getShellExpandedKeys,
} from '../utils/shell-navigation';

interface MainSidebarProps {
  collapsed: boolean;
  activeMenu: string;
  showCollapseToggle?: boolean;
  sidebarWidth?: string;
  collapsedWidth?: string;
  onCollapsedChange: (collapsed: boolean) => void;
  onMenuSelect: (key: string) => void;
}

export function MainSidebar({
  collapsed,
  activeMenu,
  showCollapseToggle = true,
  sidebarWidth = '240px',
  collapsedWidth = '64px',
  onCollapsedChange,
  onMenuSelect,
}: MainSidebarProps) {
  const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([
    'system',
  ]);
  const { has: hasPerm } = usePermission();

  const filteredMenuItems = useMemo(() => {
    return filterShellMenuItems(SHELL_MENU_ITEMS, hasPerm);
  }, [hasPerm]);
  const filteredBottomMenuItems = useMemo(() => {
    return filterShellMenuItems(SHELL_BOTTOM_MENU_ITEMS, hasPerm);
  }, [hasPerm]);
  const requiredOpenKeys = useMemo(
    () => getShellExpandedKeys(activeMenu, filteredMenuItems),
    [activeMenu, filteredMenuItems],
  );

  useEffect(() => {
    setExpandedKeys(requiredOpenKeys);
  }, [requiredOpenKeys]);

  const handleSelect = (key: string | number) => {
    onMenuSelect(String(key));
  };

  const displayCollapsed = showCollapseToggle ? collapsed : false;

  return (
    <Sidebar
      collapsed={displayCollapsed}
      width={sidebarWidth}
      collapsedWidth={collapsedWidth}
      className="h-full shrink-0">
      <div className="flex h-full min-h-0 flex-col">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-(--tiger-border,#e2e8f0) overflow-hidden">
          <div className="flex items-center gap-3">
            <LogoIcon />
            <span
              className={`overflow-hidden whitespace-nowrap font-bold text-lg text-(--tiger-text,#1f2937) tracking-wide transition-[max-width,opacity,transform] duration-300 ease-in-out ${
                displayCollapsed ? 'max-w-0 -translate-x-2 opacity-0 pointer-events-none' : 'max-w-32 translate-x-0 opacity-100'
              }`}>
              Tigercat
            </span>
          </div>
        </div>

        {/* Menu */}
        <nav className="min-h-0 flex-1 overflow-y-auto py-2">
          <Menu
            selectedKeys={[activeMenu]}
            openKeys={expandedKeys}
            collapsed={false}
            mode="inline"
            items={filteredMenuItems as MenuItem[]}
            className={`!min-w-0 ${displayCollapsed ? 'menu-collapsed' : ''}`}
            onSelect={handleSelect}
            onOpenChange={(_key, info) => setExpandedKeys(info.openKeys)}
          />
        </nav>

        {/* Bottom menu */}
        <div className="shrink-0 border-t border-(--tiger-border,#e2e8f0) py-2">
          <Menu
            selectedKeys={[activeMenu]}
            collapsed={false}
            mode="inline"
            items={filteredBottomMenuItems as MenuItem[]}
            className={`!min-w-0 ${displayCollapsed ? 'menu-collapsed' : ''}`}
            onSelect={handleSelect}
          />
        </div>

        {/* 折叠按钮 */}
        {showCollapseToggle && (
          <div className="shrink-0 border-t border-(--tiger-border,#e2e8f0) p-3 overflow-hidden">
            <button
              onClick={() => onCollapsedChange(!collapsed)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm text-(--tiger-text-secondary,#64748b) hover:bg-(--tiger-bg-hover,#f3f4f6) hover:text-(--tiger-text,#1f2937) transition-all duration-200">
              <span className="shrink-0">
                {collapsed ? (
                  <ChevronRightIcon size={18} />
                ) : (
                  <ChevronLeftIcon size={18} />
                )}
              </span>
              <span
                className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-in-out ${
                  collapsed ? 'max-w-0 -translate-x-2 opacity-0 pointer-events-none' : 'max-w-20 translate-x-0 opacity-100'
                }`}>
                收起菜单
              </span>
            </button>
          </div>
        )}
      </div>
    </Sidebar>
  );
}
