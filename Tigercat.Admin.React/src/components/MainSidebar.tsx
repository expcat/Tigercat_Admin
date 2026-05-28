import React, { useMemo, useState } from 'react';
import { Sidebar, Menu, MenuItem, SubMenu } from '@expcat/tigercat-react';
import { LogoIcon, ChevronRightIcon, ChevronLeftIcon } from './Icons';
import { usePermission } from '../utils/permission';
import {
  SHELL_BOTTOM_MENU_ITEMS,
  SHELL_MENU_ITEMS,
  type ShellMenuItemDef,
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

  // ---- Permission-based menu filtering ----
  const filteredMenuItems = useMemo(() => {
    function isPermitted(item: ShellMenuItemDef): boolean {
      if (!item.permission) return true;
      const codes = Array.isArray(item.permission)
        ? item.permission
        : [item.permission];
      return codes.every((c) => hasPerm(c));
    }

    return SHELL_MENU_ITEMS.map((item) => {
      if (item.children) {
        const visibleChildren = item.children.filter(isPermitted);
        if (visibleChildren.length === 0) return null;
        return { ...item, children: visibleChildren };
      }
      return isPermitted(item) ? item : null;
    }).filter(Boolean) as ShellMenuItemDef[];
  }, [hasPerm]);

  const handleSelect = (key: string | number) => {
    onMenuSelect(String(key));
  };

  const displayCollapsed = showCollapseToggle ? collapsed : false;

  return (
    <Sidebar
      collapsed={displayCollapsed}
      width={sidebarWidth}
      collapsedWidth={collapsedWidth}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-[var(--tiger-border,#e2e8f0)]">
        <div className="flex items-center gap-3">
          <LogoIcon />
          {!displayCollapsed && (
            <span className="font-bold text-lg text-[var(--tiger-text,#1f2937)] tracking-wide whitespace-nowrap">
              Tigercat
            </span>
          )}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="flex flex-col min-h-full">
          <Menu
            selectedKeys={[activeMenu]}
            openKeys={expandedKeys}
            collapsed={displayCollapsed}
            onSelect={handleSelect}
            onOpenChange={(_key, info) => setExpandedKeys(info.openKeys)}>
            {filteredMenuItems.map((item) =>
              item.children && item.children.length > 0 ? (
                <SubMenu
                  key={item.key}
                  itemKey={item.key}
                  title={item.label}
                  icon={item.icon}>
                  {item.children.map((child) => (
                    <MenuItem
                      key={child.key}
                      itemKey={child.key}
                      icon={child.icon}>
                      {child.label}
                    </MenuItem>
                  ))}
                </SubMenu>
              ) : (
                <MenuItem key={item.key} itemKey={item.key} icon={item.icon}>
                  {item.label}
                </MenuItem>
              ),
            )}
          </Menu>

          {/* Bottom menu */}
          <div className="mt-auto pt-2">
            <Menu
              selectedKeys={[activeMenu]}
              collapsed={displayCollapsed}
              onSelect={handleSelect}>
              {SHELL_BOTTOM_MENU_ITEMS.map((item) => (
                <MenuItem key={item.key} itemKey={item.key} icon={item.icon}>
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
          </div>
        </div>
      </nav>

      {/* 折叠按钮 */}
      {showCollapseToggle && (
        <div className="p-3 border-t border-[var(--tiger-border,#e2e8f0)]">
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-[var(--tiger-text-secondary,#64748b)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)] transition-all duration-200">
            <span className="shrink-0">
              {collapsed ? (
                <ChevronRightIcon size={18} />
              ) : (
                <ChevronLeftIcon size={18} />
              )}
            </span>
            {!collapsed && <span className="whitespace-nowrap">收起菜单</span>}
          </button>
        </div>
      )}
    </Sidebar>
  );
}
