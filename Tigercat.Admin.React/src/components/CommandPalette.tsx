import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SpotlightItem } from '@expcat/tigercat-core';
import { Spotlight } from '@expcat/tigercat-react/Spotlight';
import {
  SHELL_MENU_ITEMS,
  SHELL_BOTTOM_MENU_ITEMS,
  SHELL_MENU_ROUTES,
  filterShellMenuItems,
  isShellPageKey,
  type ShellMenuItemDef,
} from '../utils/shell-navigation';
import { usePermission } from '../utils/permission';

interface CommandPaletteProps {
  onToggleTheme: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  onOpenChat: () => void;
}

type CommandData =
  | { kind: 'route'; value: string }
  | {
      kind: 'action';
      value: 'theme' | 'chat' | 'notifications' | 'password' | 'logout';
    };

const flattenRoutes = (items: ShellMenuItemDef[]): ShellMenuItemDef[] =>
  items.flatMap((item) =>
    item.children
      ? flattenRoutes(item.children)
      : isShellPageKey(item.key)
        ? [item]
        : [],
  );

export function CommandPalette({
  onToggleTheme,
  onChangePassword,
  onLogout,
  onOpenChat,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const { has: hasPerm } = usePermission();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') {
        return;
      }
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        lastFocusRef.current = active;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (next && !lastFocusRef.current) {
      const active = document.activeElement;
      lastFocusRef.current = active instanceof HTMLElement ? active : null;
    }
    setOpen(next);
    if (!next) {
      const target = lastFocusRef.current;
      lastFocusRef.current = null;
      if (target) {
        requestAnimationFrame(() => target.focus());
      }
    }
  };

  const items = useMemo<SpotlightItem[]>(() => {
    const permitted = filterShellMenuItems(
      [...SHELL_MENU_ITEMS, ...SHELL_BOTTOM_MENU_ITEMS],
      hasPerm,
    );
    const navItems: SpotlightItem[] = flattenRoutes(permitted).flatMap((item) => {
      if (!isShellPageKey(item.key)) {
        return [];
      }

      return [
        {
          key: `route:${item.key}`,
          label: item.label,
          description: `跳转到${item.label}`,
          group: '页面导航',
          keywords: [item.label, item.key],
          data: { kind: 'route', value: SHELL_MENU_ROUTES[item.key] } as CommandData,
        },
      ];
    });

    const actionItems: SpotlightItem[] = [
      {
        key: 'action:theme',
        label: '切换主题模式',
        description: '在浅色 / 深色 / 跟随系统之间切换',
        group: '快捷操作',
        keywords: ['主题', '深色', '浅色', 'theme', 'dark'],
        data: { kind: 'action', value: 'theme' } as CommandData,
      },
      {
        key: 'action:chat',
        label: '打开在线客服',
        description: '在右侧抽屉中与客服对话',
        group: '快捷操作',
        keywords: ['客服', '聊天', 'chat', '对话'],
        data: { kind: 'action', value: 'chat' } as CommandData,
      },
      {
        key: 'action:notifications',
        label: '查看通知中心',
        description: '前往通知中心页面',
        group: '快捷操作',
        keywords: ['通知', '消息', 'notification'],
        data: { kind: 'action', value: 'notifications' } as CommandData,
      },
      {
        key: 'action:password',
        label: '修改密码',
        description: '打开修改密码对话框',
        group: '快捷操作',
        keywords: ['密码', 'password', '安全'],
        data: { kind: 'action', value: 'password' } as CommandData,
      },
      {
        key: 'action:logout',
        label: '退出登录',
        description: '安全退出当前账户',
        group: '快捷操作',
        keywords: ['退出', '登出', 'logout'],
        data: { kind: 'action', value: 'logout' } as CommandData,
      },
    ];

    return [...navItems, ...actionItems];
  }, [hasPerm]);

  const handleSelect = (item: SpotlightItem) => {
    handleOpenChange(false);
    const data = item.data as CommandData | undefined;
    if (!data) {
      return;
    }

    if (data.kind === 'route') {
      navigate(data.value);
      return;
    }

    switch (data.value) {
      case 'theme':
        onToggleTheme();
        break;
      case 'chat':
        onOpenChat();
        break;
      case 'notifications':
        navigate('/notifications');
        break;
      case 'password':
        onChangePassword();
        break;
      case 'logout':
        onLogout();
        break;
    }
  };

  return (
    <Spotlight
      open={open}
      query={query}
      items={items}
      title="命令面板"
      placeholder="搜索页面或操作，按回车执行"
      emptyText="未找到匹配项"
      closeOnSelect
      onOpenChange={handleOpenChange}
      onQueryChange={setQuery}
      onSelect={handleSelect}
    />
  );
}
