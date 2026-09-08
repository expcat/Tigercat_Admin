import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Menu } from '@expcat/tigercat-react/Menu';
import { Sidebar } from '@expcat/tigercat-react/Sidebar';
import type { MenuItem } from '@expcat/tigercat-core';
import {
  ActivityIcon,
  BellIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardIcon,
  ClockIcon,
  DashboardIcon,
  EditIcon,
  FileTextIcon,
  HelpIcon,
  ImageIcon,
  InfoIcon,
  LogoIcon,
  MenuIcon,
  MessageIcon,
  MonitorIcon,
  PackageIcon,
  PaletteIcon,
  ServerIcon,
  SettingsIcon,
  ShieldIcon,
  TerminalIcon,
  TicketIcon,
  TrendingUpIcon,
  UploadIcon,
  UsersIcon,
  ZapIcon,
} from './Icons';
import { usePermission } from '../utils/permission';
import {
  filterShellMenuSchema,
  getShellExpandedKeys,
  schemaToShellMenuItems,
  useShellMenuSchema,
} from '../utils/shell-navigation';

const MENU_ICONS: Record<string, (size: number) => ReactNode> = {
  dashboard: (size) => <DashboardIcon size={size} />,
  trendingUp: (size) => <TrendingUpIcon size={size} />,
  monitor: (size) => <MonitorIcon size={size} />,
  package: (size) => <PackageIcon size={size} />,
  ticket: (size) => <TicketIcon size={size} />,
  calendar: (size) => <CalendarIcon size={size} />,
  edit: (size) => <EditIcon size={size} />,
  image: (size) => <ImageIcon size={size} />,
  clock: (size) => <ClockIcon size={size} />,
  upload: (size) => <UploadIcon size={size} />,
  zap: (size) => <ZapIcon size={size} />,
  help: (size) => <HelpIcon size={size} />,
  fileText: (size) => <FileTextIcon size={size} />,
  users: (size) => <UsersIcon size={size} />,
  shield: (size) => <ShieldIcon size={size} />,
  menu: (size) => <MenuIcon size={size} />,
  settings: (size) => <SettingsIcon size={size} />,
  bell: (size) => <BellIcon size={size} />,
  clipboard: (size) => <ClipboardIcon size={size} />,
  activity: (size) => <ActivityIcon size={size} />,
  info: (size) => <InfoIcon size={size} />,
  message: (size) => <MessageIcon size={size} />,
  palette: (size) => <PaletteIcon size={size} />,
  terminal: (size) => <TerminalIcon size={size} />,
  server: (size) => <ServerIcon size={size} />,
};

function iconSizeForKey(key: MenuItem['key']): number {
  return key === 'home' || key === 'system' || key === 'about' ? 20 : 18;
}

function withMenuIcons(items: MenuItem[]): MenuItem[] {
  return items.map((item) => {
    const iconName = typeof item.icon === 'string' ? item.icon : undefined;
    const render = iconName ? MENU_ICONS[iconName] : undefined;
    return {
      ...item,
      icon: render ? render(iconSizeForKey(item.key)) : item.icon,
      children: item.children ? withMenuIcons(item.children) : undefined,
    };
  });
}

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
  const menuNavRef = useRef<HTMLElement | null>(null);
  const { has: hasPerm } = usePermission();
  const menuSchema = useShellMenuSchema();

  const filteredMenuItems = useMemo(() => {
    return filterShellMenuSchema(menuSchema.items, hasPerm);
  }, [hasPerm, menuSchema.items]);
  const filteredBottomMenuItems = useMemo(() => {
    return filterShellMenuSchema(menuSchema.bottomItems, hasPerm);
  }, [hasPerm, menuSchema.bottomItems]);
  const mainMenuItems = useMemo(
    () => withMenuIcons(schemaToShellMenuItems(filteredMenuItems)),
    [filteredMenuItems],
  );
  const bottomMenuItems = useMemo(
    () => withMenuIcons(schemaToShellMenuItems(filteredBottomMenuItems)),
    [filteredBottomMenuItems],
  );
  const requiredOpenKeys = useMemo(
    () => getShellExpandedKeys(activeMenu, filteredMenuItems),
    [activeMenu, filteredMenuItems],
  );

  useEffect(() => {
    setExpandedKeys(requiredOpenKeys);
  }, [requiredOpenKeys]);

  useEffect(() => {
    const nav = menuNavRef.current;
    if (!nav) return;
    const items = nav.querySelectorAll<HTMLElement>('button, a, [role="menuitem"]');
    items[items.length - 1]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [expandedKeys]);

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
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
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
        <nav ref={menuNavRef} className="min-h-0 flex-1 overflow-y-auto py-2">
          <Menu
            selectedKeys={[activeMenu]}
            openKeys={expandedKeys}
            collapsed={displayCollapsed}
            popupPortal
            mode="inline"
            items={mainMenuItems}
            searchable={!displayCollapsed}
            searchPlaceholder="搜索菜单"
            emptyText="没有匹配的菜单"
            className={`!min-w-0 ${displayCollapsed ? 'menu-collapsed' : ''}`}
            onSelect={handleSelect}
            onOpenChange={(_key, info) => setExpandedKeys(info.openKeys)}
          />
        </nav>

        {/* Bottom menu */}
        <div className="shrink-0 border-t border-(--tiger-border,#e2e8f0) py-2">
          <Menu
            selectedKeys={[activeMenu]}
            collapsed={displayCollapsed}
            popupPortal
            mode="inline"
            items={bottomMenuItems}
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
