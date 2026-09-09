export type MockMenuSchemaNode = {
  key: string;
  label?: string;
  icon?: string;
  path?: string;
  permission?: string | string[];
  hideInMenu?: boolean;
  hideInBreadcrumb?: boolean;
  flatMenu?: boolean;
  iframeSrc?: string;
  children?: MockMenuSchemaNode[];
};

export type MockMenuSchemaPayload = {
  items: MockMenuSchemaNode[];
  bottomItems: MockMenuSchemaNode[];
};

export type MockMenuNodeWrite = {
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
  placement?: string | null;
};

export type MockMenuMutation =
  | { ok: true; status: number; node: MockMenuSchemaNode | null; message: string }
  | { ok: false; status: number; message: string };

const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const PROTECTED_HOME_KEY = 'home';

const pageNodes: Record<string, MockMenuSchemaNode> = {
  home: {
    key: 'home',
    label: '仪表盘',
    icon: 'dashboard',
    permission: 'dashboard:view',
    path: '/dashboard',
  },
  analytics: {
    key: 'analytics',
    label: '数据分析看板',
    icon: 'trendingUp',
    path: '/analytics',
  },
  monitor: {
    key: 'monitor',
    label: '实时监控',
    icon: 'monitor',
    path: '/monitor',
  },
  projects: {
    key: 'projects',
    label: '项目列表',
    icon: 'package',
    path: '/projects',
  },
  tickets: {
    key: 'tickets',
    label: '工单中心',
    icon: 'ticket',
    path: '/tickets',
  },
  approvals: {
    key: 'approvals',
    label: '审批中心',
    icon: 'checkCircle',
    path: '/approvals',
  },
  workflowDesigner: {
    key: 'workflowDesigner',
    label: '流程设计',
    icon: 'gitBranch',
    path: '/workflow-designer',
  },
  calendar: {
    key: 'calendar',
    label: '团队日历',
    icon: 'calendar',
    path: '/calendar',
  },
  content: {
    key: 'content',
    label: '内容编辑',
    icon: 'edit',
    path: '/content',
  },
  gallery: {
    key: 'gallery',
    label: '媒体图库',
    icon: 'image',
    path: '/gallery',
  },
  jobs: {
    key: 'jobs',
    label: '定时任务',
    icon: 'clock',
    path: '/jobs',
  },
  import: {
    key: 'import',
    label: '数据导入',
    icon: 'upload',
    path: '/import',
  },
  performance: {
    key: 'performance',
    label: '大数据演示',
    icon: 'zap',
    path: '/performance',
  },
  help: {
    key: 'help',
    label: '帮助中心',
    icon: 'help',
    path: '/help',
  },
  reports: {
    key: 'reports',
    label: '报表打印',
    icon: 'fileText',
    path: '/reports',
  },
  users: {
    key: 'users',
    label: '用户管理',
    icon: 'users',
    permission: 'user:view',
    path: '/users',
  },
  roles: {
    key: 'roles',
    label: '角色管理',
    icon: 'shield',
    permission: 'role:view',
    path: '/roles',
  },
  menus: {
    key: 'menus',
    label: '菜单管理',
    icon: 'menu',
    permission: 'menu:view',
    path: '/menus',
  },
  permissionDemo: {
    key: 'permissionDemo',
    label: '按钮权限',
    icon: 'lock',
    path: '/permission-demo',
  },
  settings: {
    key: 'settings',
    label: '系统设置',
    icon: 'settings',
    path: '/settings',
  },
  files: {
    key: 'files',
    label: '文件管理',
    icon: 'fileText',
    permission: 'media:view',
    path: '/files',
  },
  notifications: {
    key: 'notifications',
    label: '通知中心',
    icon: 'bell',
    path: '/notifications',
  },
  tasks: {
    key: 'tasks',
    label: '任务面板',
    icon: 'clipboard',
    path: '/tasks',
  },
  audit: {
    key: 'audit',
    label: '审计日志',
    icon: 'activity',
    path: '/audit-logs',
  },
  about: {
    key: 'about',
    label: '关于',
    icon: 'info',
    path: '/about',
  },
};

export const MOCK_MENU_SCHEMA_ITEMS: MockMenuSchemaNode[] = [
  pageNodes.home,
  {
    key: 'analyticsGroup',
    label: '数据分析',
    icon: 'trendingUp',
    children: [pageNodes.analytics, pageNodes.monitor],
  },
  {
    key: 'collaborationGroup',
    label: '协作',
    icon: 'message',
    children: [pageNodes.tickets, pageNodes.approvals, pageNodes.workflowDesigner, pageNodes.calendar],
  },
  {
    key: 'contentGroup',
    label: '内容管理',
    icon: 'palette',
    children: [pageNodes.content, pageNodes.gallery],
  },
  {
    key: 'projectsGroup',
    label: '项目',
    icon: 'package',
    children: [pageNodes.projects],
  },
  {
    key: 'opsGroup',
    label: '运维',
    icon: 'terminal',
    children: [pageNodes.jobs, pageNodes.import, pageNodes.performance],
  },
  {
    key: 'helpGroup',
    label: '帮助支持',
    icon: 'help',
    children: [pageNodes.help, pageNodes.reports],
  },
  {
    key: 'system',
    label: '系统管理',
    icon: 'server',
    children: [
      pageNodes.users,
      pageNodes.roles,
      pageNodes.menus,
      pageNodes.permissionDemo,
      pageNodes.settings,
      pageNodes.files,
      pageNodes.notifications,
      pageNodes.tasks,
      pageNodes.audit,
    ],
  },
];

export const MOCK_MENU_SCHEMA_BOTTOM_ITEMS: MockMenuSchemaNode[] = [
  pageNodes.about,
];

export const MOCK_MENU_SCHEMA_PAYLOAD: MockMenuSchemaPayload = {
  items: MOCK_MENU_SCHEMA_ITEMS,
  bottomItems: MOCK_MENU_SCHEMA_BOTTOM_ITEMS,
};

export function cloneMenuSchemaPayload(
  payload: MockMenuSchemaPayload = MOCK_MENU_SCHEMA_PAYLOAD,
): MockMenuSchemaPayload {
  return JSON.parse(JSON.stringify(payload)) as MockMenuSchemaPayload;
}

type NodeLocation = {
  node: MockMenuSchemaNode;
  parentKey: string | null;
  siblings: MockMenuSchemaNode[];
  placement: 'items' | 'bottomItems';
};

function fail(status: number, message: string): MockMenuMutation {
  return { ok: false, status, message };
}

function ok(status: number, node: MockMenuSchemaNode | null, message = 'Success'): MockMenuMutation {
  return { ok: true, status, node, message };
}

function emptyToNull(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePlacement(value: string | null | undefined): 'items' | 'bottomItems' {
  return value === 'bottomItems' ? 'bottomItems' : 'items';
}

function normalizeParentKey(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function findIn(
  nodes: MockMenuSchemaNode[],
  key: string,
  parentKey: string | null,
  placement: 'items' | 'bottomItems',
): NodeLocation | null {
  for (const node of nodes) {
    if (node.key === key) {
      return { node, parentKey, siblings: nodes, placement };
    }
    if (node.children?.length) {
      const nested = findIn(node.children, key, node.key, placement);
      if (nested) return nested;
    }
  }
  return null;
}

function findNode(payload: MockMenuSchemaPayload, key: string): NodeLocation | null {
  return findIn(payload.items, key, null, 'items')
    ?? findIn(payload.bottomItems, key, null, 'bottomItems');
}

function isDescendant(node: MockMenuSchemaNode, key: string): boolean {
  return (node.children ?? []).some(
    (child) => child.key === key || isDescendant(child, key),
  );
}

function validateKey(key: string | undefined, required: boolean): string | null {
  const value = key?.trim() ?? '';
  if (!value) return required ? '请输入菜单节点 key' : null;
  if (!KEY_PATTERN.test(value)) {
    return 'key 需以字母开头，仅含字母、数字、下划线或连字符，最长 64 位';
  }
  return null;
}

function validateFields(input: MockMenuNodeWrite): string | null {
  if (input.label && input.label.length > 50) return '显示名长度不能超过 50';
  if (input.icon && input.icon.length > 32) return '图标名长度不能超过 32';
  if (input.path) {
    const path = input.path.trim();
    if (path.length > 128) return '路径长度不能超过 128';
    if (!path.startsWith('/')) return '路径必须以 / 开头';
  }
  if (input.permission && input.permission.length > 64) return '权限码长度不能超过 64';
  if (input.iframeSrc && input.iframeSrc.length > 512) return 'iframe 地址长度不能超过 512';
  if (
    input.placement
    && input.placement !== 'items'
    && input.placement !== 'bottomItems'
  ) {
    return 'placement 只能是 items 或 bottomItems';
  }
  return null;
}

function applyFields(
  node: MockMenuSchemaNode,
  input: MockMenuNodeWrite,
  replacing: boolean,
): MockMenuSchemaNode {
  if (!replacing || input.label !== undefined) node.label = emptyToNull(input.label);
  if (!replacing || input.icon !== undefined) node.icon = emptyToNull(input.icon);
  if (!replacing || input.path !== undefined) node.path = emptyToNull(input.path);
  if (!replacing || input.permission !== undefined) node.permission = emptyToNull(input.permission);
  if (!replacing || input.iframeSrc !== undefined) node.iframeSrc = emptyToNull(input.iframeSrc);
  if (input.hideInMenu !== undefined) node.hideInMenu = input.hideInMenu;
  if (input.hideInBreadcrumb !== undefined) node.hideInBreadcrumb = input.hideInBreadcrumb;
  if (input.flatMenu !== undefined) node.flatMenu = input.flatMenu;
  return node;
}

function resolveParent(
  payload: MockMenuSchemaPayload,
  parentKey: string | null | undefined,
  placement: string | null | undefined,
): { siblings: MockMenuSchemaNode[]; error?: string } {
  const normalizedParent = normalizeParentKey(parentKey);
  if (!normalizedParent) {
    return {
      siblings: normalizePlacement(placement) === 'bottomItems'
        ? payload.bottomItems
        : payload.items,
    };
  }
  const parent = findNode(payload, normalizedParent);
  if (!parent) return { siblings: [], error: '父节点不存在' };
  if (!parent.node.children) parent.node.children = [];
  return { siblings: parent.node.children };
}

export function createMenuNode(
  payload: MockMenuSchemaPayload,
  input: MockMenuNodeWrite,
): MockMenuMutation {
  const keyError = validateKey(input.key, true);
  if (keyError) return fail(400, keyError);
  const key = input.key!.trim();
  if (findNode(payload, key)) return fail(409, '菜单节点 key 已存在');
  const fieldError = validateFields(input);
  if (fieldError) return fail(400, fieldError);
  const parent = resolveParent(payload, input.parentKey, input.placement);
  if (parent.error) return fail(400, parent.error);
  const node = applyFields({ key }, input, false);
  parent.siblings.push(node);
  return ok(201, JSON.parse(JSON.stringify(node)) as MockMenuSchemaNode);
}

export function updateMenuNode(
  payload: MockMenuSchemaPayload,
  key: string,
  input: MockMenuNodeWrite,
): MockMenuMutation {
  if (!key.trim()) return fail(400, '请提供菜单节点 key');
  const current = findNode(payload, key);
  if (!current) return fail(404, '菜单节点不存在');
  const fieldError = validateFields(input);
  if (fieldError) return fail(400, fieldError);

  const nextParentKey = normalizeParentKey(input.parentKey);
  const moving = nextParentKey !== current.parentKey
    || (Boolean(input.placement)
      && normalizePlacement(input.placement) !== current.placement
      && nextParentKey === null);

  if (moving) {
    if (nextParentKey === key) return fail(400, '不能把节点移动到自身下面');
    if (nextParentKey && isDescendant(current.node, nextParentKey)) {
      return fail(400, '不能把节点移动到自己的子节点下面');
    }
    const next = resolveParent(payload, input.parentKey, input.placement);
    if (next.error) return fail(400, next.error);
    const index = current.siblings.findIndex((item) => item.key === key);
    if (index >= 0) current.siblings.splice(index, 1);
    if (current.parentKey) {
      const parent = findNode(payload, current.parentKey);
      if (parent && parent.node.children && parent.node.children.length === 0) {
        delete parent.node.children;
      }
    }
    applyFields(current.node, input, true);
    next.siblings.push(current.node);
  } else {
    applyFields(current.node, input, true);
  }

  return ok(200, JSON.parse(JSON.stringify(current.node)) as MockMenuSchemaNode);
}

export function deleteMenuNode(
  payload: MockMenuSchemaPayload,
  key: string,
): MockMenuMutation {
  if (!key.trim()) return fail(400, '请提供菜单节点 key');
  if (key === PROTECTED_HOME_KEY) return fail(400, '不能删除仪表盘节点');
  const current = findNode(payload, key);
  if (!current) return fail(404, '菜单节点不存在');
  if (current.node.children && current.node.children.length > 0) {
    return fail(400, '请先删除子节点');
  }
  const index = current.siblings.findIndex((item) => item.key === key);
  if (index >= 0) current.siblings.splice(index, 1);
  if (current.parentKey) {
    const parent = findNode(payload, current.parentKey);
    if (parent && parent.node.children && parent.node.children.length === 0) {
      delete parent.node.children;
    }
  }
  return ok(200, null, '删除成功');
}
