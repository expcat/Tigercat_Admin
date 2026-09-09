import {
  filterMenuByPermission,
  menuSchemaToMenuItems,
  schemaToRouteRecords,
  type MenuItem,
  type MenuSchema,
  type MenuSchemaNode,
  type TreeNode,
} from '@expcat/tigercat-core';
import { apiRequest } from './request';
import { getAuthHeaders } from './auth';
import type { MenuSchemaPayload, PagedResult, RoleItem } from './types';

export const MENU_ROOT_ITEMS = '__root:items__';
export const MENU_ROOT_BOTTOM = '__root:bottomItems__';

export const MENU_ICON_OPTIONS = [
  { label: '菜单', value: 'menu' },
  { label: '锁', value: 'lock' },
  { label: '仪表盘', value: 'dashboard' },
  { label: '用户', value: 'users' },
  { label: '盾牌', value: 'shield' },
  { label: '设置', value: 'settings' },
  { label: '文件', value: 'fileText' },
  { label: '通知', value: 'bell' },
  { label: '任务', value: 'clipboard' },
  { label: '审计', value: 'activity' },
  { label: '帮助', value: 'help' },
  { label: '项目', value: 'package' },
  { label: '工单', value: 'ticket' },
  { label: '审批', value: 'checkCircle' },
  { label: '流程', value: 'gitBranch' },
  { label: '日历', value: 'calendar' },
  { label: '编辑', value: 'edit' },
  { label: '图片', value: 'image' },
  { label: '时钟', value: 'clock' },
  { label: '上传', value: 'upload' },
  { label: '闪电图标', value: 'zap' },
  { label: '趋势', value: 'trendingUp' },
  { label: '监控', value: 'monitor' },
  { label: '服务器', value: 'server' },
  { label: '终端', value: 'terminal' },
  { label: '调色板', value: 'palette' },
  { label: '消息', value: 'message' },
  { label: '信息', value: 'info' },
];

export type MenuNodeWrite = {
  key?: string;
  label?: string;
  icon?: string;
  path?: string;
  permission?: string;
  hideInMenu?: boolean;
  hideInBreadcrumb?: boolean;
  flatMenu?: boolean;
  iframeSrc?: string;
  parentKey?: string | null;
  placement?: 'items' | 'bottomItems';
};

export type MenuNodeForm = {
  key: string;
  label: string;
  icon: string;
  path: string;
  permission: string;
  parentKey: string;
  hideInMenu: boolean;
  hideInBreadcrumb: boolean;
  flatMenu: boolean;
  iframeSrc: string;
};

export const EMPTY_MENU_FORM: MenuNodeForm = {
  key: '',
  label: '',
  icon: 'menu',
  path: '',
  permission: '',
  parentKey: MENU_ROOT_ITEMS,
  hideInMenu: false,
  hideInBreadcrumb: false,
  flatMenu: false,
  iframeSrc: '',
};

export function fetchMenuSchema() {
  return apiRequest<MenuSchemaPayload>('/api/menus/schema', {
    headers: getAuthHeaders(),
  });
}

export function createMenuNode(payload: MenuNodeWrite) {
  return apiRequest<MenuSchemaNode>('/api/menus/nodes', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateMenuNode(key: string, payload: MenuNodeWrite) {
  return apiRequest<MenuSchemaNode>(`/api/menus/nodes/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function deleteMenuNode(key: string) {
  return apiRequest<{ message?: string }>(`/api/menus/nodes/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export function fetchRolesForPreview() {
  return apiRequest<PagedResult<RoleItem>>('/api/roles?page=1&pageSize=100', {
    headers: getAuthHeaders(),
  });
}

export function fetchRoleDetail(id: number) {
  return apiRequest<RoleItem>(`/api/roles/${id}`, {
    headers: getAuthHeaders(),
  });
}

export function isMenuRootKey(key: string): boolean {
  return key === MENU_ROOT_ITEMS || key === MENU_ROOT_BOTTOM;
}

export function schemaNodes(payload: MenuSchemaPayload): MenuSchema {
  return [...payload.items, ...payload.bottomItems];
}

export function findMenuNode(
  nodes: MenuSchema,
  key: string,
): MenuSchemaNode | undefined {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const nested = findMenuNode(node.children, key);
      if (nested) return nested;
    }
  }
  return undefined;
}

export function collectMenuKeys(nodes: MenuSchema): string[] {
  return nodes.flatMap((node) => [
    node.key,
    ...(node.children ? collectMenuKeys(node.children) : []),
  ]);
}

export function collectDescendantKeys(node: MenuSchemaNode): string[] {
  return node.children ? collectMenuKeys(node.children) : [];
}

function mapTreeNodes(nodes: MenuSchema): TreeNode[] {
  return nodes.map((node) => ({
    key: node.key,
    label: node.label || node.key,
    children: node.children?.length ? mapTreeNodes(node.children) : undefined,
  }));
}

export function toMenuTreeData(payload: MenuSchemaPayload): TreeNode[] {
  return [
    {
      key: MENU_ROOT_ITEMS,
      label: '主菜单',
      children: mapTreeNodes(payload.items),
    },
    {
      key: MENU_ROOT_BOTTOM,
      label: '底栏',
      children: mapTreeNodes(payload.bottomItems),
    },
  ];
}

export function parentSelectOptions(
  payload: MenuSchemaPayload,
  excludeKeys: string[] = [],
): Array<{ label: string; value: string }> {
  const excluded = new Set(excludeKeys);
  const walk = (
    nodes: MenuSchema,
    depth: number,
  ): Array<{ label: string; value: string }> =>
    nodes.flatMap((node) => {
      if (excluded.has(node.key)) return [];
      const prefix = depth > 0 ? `${'— '.repeat(depth)}` : '';
      return [
        { label: `${prefix}${node.label || node.key}`, value: node.key },
        ...(node.children ? walk(node.children, depth + 1) : []),
      ];
    });

  return [
    { label: '主菜单根', value: MENU_ROOT_ITEMS },
    { label: '底栏根', value: MENU_ROOT_BOTTOM },
    ...walk(payload.items, 0).filter((item) => !excluded.has(item.value)),
    ...walk(payload.bottomItems, 0).filter((item) => !excluded.has(item.value)),
  ];
}

export function locateParentKey(
  payload: MenuSchemaPayload,
  key: string,
): string {
  const search = (nodes: MenuSchema, parentKey: string): string | null => {
    for (const node of nodes) {
      if (node.key === key) return parentKey;
      if (node.children) {
        const nested = search(node.children, node.key);
        if (nested) return nested;
      }
    }
    return null;
  };

  return (
    search(payload.items, MENU_ROOT_ITEMS)
    ?? search(payload.bottomItems, MENU_ROOT_BOTTOM)
    ?? MENU_ROOT_ITEMS
  );
}

export function formFromNode(
  payload: MenuSchemaPayload,
  node: MenuSchemaNode,
): MenuNodeForm {
  const permission = Array.isArray(node.permission)
    ? node.permission.join(',')
    : (node.permission ?? '');
  return {
    key: node.key,
    label: node.label ?? '',
    icon: typeof node.icon === 'string' ? node.icon : 'menu',
    path: node.path ?? '',
    permission,
    parentKey: locateParentKey(payload, node.key),
    hideInMenu: Boolean(node.hideInMenu),
    hideInBreadcrumb: Boolean(node.hideInBreadcrumb),
    flatMenu: Boolean(node.flatMenu),
    iframeSrc: node.iframeSrc ?? '',
  };
}

export function formToWrite(form: MenuNodeForm, includeKey: boolean): MenuNodeWrite {
  const parentIsRoot = isMenuRootKey(form.parentKey);
  return {
    ...(includeKey ? { key: form.key.trim() } : {}),
    label: form.label.trim(),
    icon: form.icon.trim(),
    path: form.path.trim(),
    permission: form.permission.trim(),
    hideInMenu: form.hideInMenu,
    hideInBreadcrumb: form.hideInBreadcrumb,
    flatMenu: form.flatMenu,
    iframeSrc: form.iframeSrc.trim(),
    parentKey: parentIsRoot ? null : form.parentKey,
    placement: form.parentKey === MENU_ROOT_BOTTOM ? 'bottomItems' : 'items',
  };
}

export function defaultCreateForm(selectedKey: string | null): MenuNodeForm {
  return {
    ...EMPTY_MENU_FORM,
    parentKey: selectedKey || MENU_ROOT_ITEMS,
  };
}

function stripMenuHref(items: MenuItem[]): MenuItem[] {
  return items.map((item) => {
    const { href: _href, ...rest } = item;
    return {
      ...rest,
      children: item.children ? stripMenuHref(item.children) : undefined,
    };
  });
}

export function previewMenuItems(
  nodes: MenuSchema,
  codes: string[],
): MenuItem[] {
  const allowed = new Set(codes);
  const filtered = filterMenuByPermission(nodes, (code) => allowed.has(code));
  return stripMenuHref(menuSchemaToMenuItems(filtered));
}

export function previewRouteCount(nodes: MenuSchema, codes: string[]): number {
  const allowed = new Set(codes);
  return schemaToRouteRecords(nodes, (code) => allowed.has(code)).length;
}

export function flattenPreviewLabels(items: MenuItem[]): string[] {
  return items.flatMap((item) => [
    String(item.label ?? item.key ?? ''),
    ...(item.children ? flattenPreviewLabels(item.children) : []),
  ]);
}
