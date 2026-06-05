type ApiResponse<T = unknown> = {
  code: number;
  message: string;
  success: boolean;
  data: T;
};

type PermissionInfo = {
  id: number;
  code: string;
  description: string | null;
};

type RoleInfo = {
  id: number;
  name: string;
};

type DemoUser = {
  id: number;
  username: string;
  displayName: string | null;
  status: number;
  avatarMediaId: number | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  roleIds: number[];
};

type UserItem = Omit<DemoUser, 'roleIds'> & {
  roles: RoleInfo[];
};

type DemoRole = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  permissionIds: number[];
};

type RoleItem = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  permissions: PermissionInfo[];
  users: Array<{ id: number; username: string; displayName: string | null }>;
};

type SettingItem = {
  id: number;
  key: string;
  value: string;
  defaultValue: string;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type MediaItem = {
  id: number;
  publicId: string;
  originalFileName: string;
  storageProvider: string;
  contentType: string;
  extension: string | null;
  sizeBytes: number;
  sha256Hash: string | null;
  width: number | null;
  height: number | null;
  url: string;
  uploadedBy: string | null;
  createdAt: string;
  referenceCount: number;
};

type MediaReference = {
  id: number;
  referenceType: string;
  referenceKey: string;
  displayName: string | null;
};

type NotificationItem = {
  id: string;
  groupKey: 'ops' | 'security' | 'release';
  title: string;
  description: string;
  time: string;
  read: boolean;
  toastType: 'success' | 'warning' | 'error' | 'info';
  meta: Record<string, string>;
  linkUrl?: string | null;
};

type TaskItem = {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  status: 'backlog' | 'todo' | 'doing' | 'review' | 'done';
  dueAt: string;
  estimateHours: number;
  blocked?: boolean;
  blockedReason?: string | null;
  completionNote?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string | null;
  completedAt?: string | null;
};

type AuditLogItem = {
  id: string;
  stream: string;
  category: 'auth' | 'user' | 'task' | 'system';
  eventType: string;
  occurredAtUtc: string;
  traceId: string | null;
  title: string;
  description: string;
  actor: string | null;
  data: Record<string, string | null>;
};

type DemoState = {
  users: DemoUser[];
  roles: DemoRole[];
  settings: SettingItem[];
  media: MediaItem[];
  notifications: NotificationItem[];
  tasks: TaskItem[];
  auditLogs: AuditLogItem[];
  retentionDays: number;
  nextUserId: number;
  nextRoleId: number;
  nextMediaId: number;
  nextTaskId: number;
};

type InstallOptions = {
  enabled?: boolean;
  storageKey?: string;
};

const DEFAULT_STORAGE_KEY = 'tigercat.admin.demo.mock-state';
const DEMO_TOKEN = 'demo-static-token';
const CREATED_AT = '2026-06-03T02:00:00.000Z';

const permissions: PermissionInfo[] = [
  ['dashboard:view', '查看仪表盘'],
  ['user:view', '查看用户列表'],
  ['user:create', '创建用户'],
  ['user:edit', '编辑用户'],
  ['user:delete', '删除用户'],
  ['role:view', '查看角色列表'],
  ['role:create', '创建角色'],
  ['role:edit', '编辑角色'],
  ['role:delete', '删除角色'],
  ['setting:view', '查看系统设置'],
  ['setting:edit', '编辑系统设置'],
  ['media:view', '查看媒体资源'],
  ['media:upload', '上传媒体资源'],
  ['media:delete', '删除媒体资源'],
  ['audit:view', '查看审计日志'],
  ['audit:export', '导出审计日志'],
  ['notification:view', '查看通知中心'],
  ['notification:edit', '更新通知状态'],
  ['task:view', '查看任务面板'],
  ['task:create', '创建运维任务'],
  ['task:edit', '编辑运维任务'],
].map(([code, description], index) => ({
  id: index + 1,
  code,
  description,
}));

const allPermissionIds = permissions.map((item) => item.id);

function initialState(): DemoState {
  return {
    users: [
      {
        id: 1,
        username: 'admin',
        displayName: '管理员',
        status: 0,
        avatarMediaId: null,
        avatarUrl: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: null,
        roleIds: [1],
      },
      {
        id: 2,
        username: 'editor',
        displayName: '内容编辑',
        status: 0,
        avatarMediaId: null,
        avatarUrl: null,
        createdAt: '2026-02-12T08:20:00.000Z',
        updatedAt: null,
        roleIds: [2],
      },
      {
        id: 3,
        username: 'viewer',
        displayName: '只读访客',
        status: 0,
        avatarMediaId: null,
        avatarUrl: null,
        createdAt: '2026-03-08T11:10:00.000Z',
        updatedAt: null,
        roleIds: [3],
      },
    ],
    roles: [
      {
        id: 1,
        name: 'Admin',
        description: '超级管理员，拥有所有权限',
        createdAt: '2026-01-01T00:00:00.000Z',
        permissionIds: allPermissionIds,
      },
      {
        id: 2,
        name: 'Editor',
        description: '编辑员，可查看和编辑',
        createdAt: '2026-01-02T00:00:00.000Z',
        permissionIds: permissions
          .filter((item) => !['user:delete', 'role:delete', 'audit:export'].includes(item.code))
          .map((item) => item.id),
      },
      {
        id: 3,
        name: 'Viewer',
        description: '只读用户，仅可查看',
        createdAt: '2026-01-03T00:00:00.000Z',
        permissionIds: permissions
          .filter((item) => item.code.endsWith(':view') || item.code === 'dashboard:view' || item.code === 'task:view')
          .map((item) => item.id),
      },
    ],
    settings: [
      setting(1, 'site.name', 'Tigercat Admin', '站点名称'),
      setting(2, 'site.logo', '', '站点 Logo URL'),
      setting(3, 'auth.sessionTimeout', '1440', '会话超时时间（分钟）'),
      setting(4, 'auth.maxAttempts', '5', '最大登录失败次数'),
      setting(5, 'auth.loginLockoutMinutes', '5', '登录失败锁定时长（分钟）'),
      setting(6, 'auth.passwordMinLength', '6', '密码最小长度'),
      setting(7, 'auth.requireComplexPassword', 'false', '是否要求密码同时包含字母和数字'),
      setting(8, 'theme.mode', 'system', '默认主题模式（light / dark / system）'),
      setting(9, 'theme.primaryColor', '#2563eb', '默认主色调'),
      setting(10, 'theme.compactMode', 'false', '紧凑模式（侧边栏默认折叠）'),
      setting(11, 'ops.auditRetentionDays', '90', '审计日志保留天数'),
      setting(12, 'security.permissionSeedVersion', '2026.06.02.1', '权限种子数据版本'),
      setting(13, 'security.permissionSeedChecksum', 'demo-static-checksum', '权限种子数据摘要'),
    ],
    media: [
      media(1, 'demo-logo', 'tigercat-logo.png', 'image/png', 42872, 'logo', 1),
      media(2, 'demo-report', 'release-checklist.pdf', 'application/pdf', 184220, 'file', 0),
      media(3, 'demo-avatar', 'admin-avatar.png', 'image/png', 24190, 'avatar', 0),
    ],
    notifications: [
      {
        id: 'release-window',
        groupKey: 'ops',
        title: '发布窗口确认',
        description: '今晚 20:00 的发布窗口已创建，请确认导出任务与健康检查状态。',
        time: '2026-06-03T08:00:00.000Z',
        read: false,
        toastType: 'warning',
        meta: { source: 'deployment', severity: 'medium' },
        linkUrl: '/tasks',
      },
      {
        id: 'security-session-review',
        groupKey: 'security',
        title: '会话策略复核',
        description: '检测到会话超时时间仍为默认值，建议在生产前完成安全策略确认。',
        time: '2026-06-03T06:30:00.000Z',
        read: false,
        toastType: 'info',
        meta: { source: 'security', severity: 'low' },
        linkUrl: '/settings',
      },
      {
        id: 'release-audit-ready',
        groupKey: 'release',
        title: '审计日志已接入',
        description: '后台审计日志支持分页、筛选、详情和导出，可进入审计页继续核对。',
        time: '2026-06-02T15:20:00.000Z',
        read: true,
        toastType: 'success',
        meta: { source: 'audit', severity: 'low' },
        linkUrl: '/audit-logs',
      },
    ],
    tasks: [
      task('task-asset-review', '补齐媒体资源持久化方案', '为 Logo 与头像预留真实存储方案，明确对象存储与权限校验边界。', '王一哲', 'high', 'backlog', '2026-06-03T10:00:00.000Z', 6, false),
      task('task-e2e-plan', '梳理用户与设置核心流程 E2E 用例', '覆盖登录、用户 CRUD、设置保存与权限保护的最小回归集合。', '平台测试', 'medium', 'backlog', '2026-06-05T04:00:00.000Z', 4, false),
      task('task-postgres-docs', '整理 PostgreSQL 生产配置文档', '补齐连接串、迁移、备份策略与 Aspire 环境变量示例。', '后端组', 'high', 'todo', '2026-05-30T10:00:00.000Z', 5, false),
      task('task-cache-observe', '定位导出缓存命中率下降原因', '需要结合 Redis 指标与导出模板变更记录继续排查。', '平台运维', 'high', 'doing', '2026-05-28T09:30:00.000Z', 4, true, '等待 Redis 指标与导出模板变更记录交叉确认。'),
      task('task-notification-review', '通知中心交互复核', '确认分组筛选、已读切换与浮层反馈在双端一致。', '产品验收', 'medium', 'review', '2026-05-29T07:00:00.000Z', 2, false),
      task('task-audit-page', '审计日志页联调完成', '后端聚合 Redis Streams，双端页面已完成 ActivityFeed 与 Timeline 验证。', '管理后台', 'medium', 'done', '2026-05-28T06:00:00.000Z', 3, false),
    ],
    auditLogs: [
      audit('auth-login', 'auth', 'auth.user.login', '用户登录', 'admin 登录了系统。', 'admin'),
      audit('user-update', 'user', 'admin.user.updated', '更新用户', 'admin 更新了用户 editor 的资料或角色配置。', 'admin'),
      audit('task-moved', 'task', 'admin.task.moved', '任务流转', '平台运维将任务移动到执行中。', 'admin'),
      audit('system-demo', 'system', 'demo.static.enabled', '演示模式启用', '当前页面由前端静态 Mock API 提供数据。', 'system'),
    ],
    retentionDays: 90,
    nextUserId: 4,
    nextRoleId: 4,
    nextMediaId: 4,
    nextTaskId: 7,
  };
}

function setting(id: number, key: string, value: string, description: string): SettingItem {
  return { id, key, value, defaultValue: value, description, createdAt: CREATED_AT, updatedAt: null };
}

function media(
  id: number,
  publicId: string,
  name: string,
  contentType: string,
  sizeBytes: number,
  extension: string,
  referenceCount: number,
): MediaItem {
  return {
    id,
    publicId,
    originalFileName: name,
    storageProvider: 'Local',
    contentType,
    extension,
    sizeBytes,
    sha256Hash: `demo-${publicId}-${sizeBytes}`,
    width: contentType.startsWith('image/') ? 512 : null,
    height: contentType.startsWith('image/') ? 512 : null,
    url: toStaticMediaUrl(publicId, name, contentType),
    uploadedBy: 'admin',
    createdAt: CREATED_AT,
    referenceCount,
  };
}

function mediaReferencesFor(item: MediaItem): MediaReference[] {
  if (item.referenceCount <= 0) return [];
  if (item.originalFileName.toLowerCase().includes('avatar')) {
    return [{ id: item.id * 10 + 1, referenceType: 'user.avatar', referenceKey: '1', displayName: '用户头像：admin' }];
  }

  return [{ id: item.id * 10 + 1, referenceType: 'site.logo', referenceKey: 'site.logo', displayName: '站点 Logo' }];
}

function toStaticMediaUrl(publicId: string, name: string, contentType: string): string {
  if (contentType.startsWith('image/')) {
    const label = encodeURIComponent(name.slice(0, 24));
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120"><rect width="240" height="120" rx="12" fill="%23eff6ff"/><circle cx="58" cy="60" r="28" fill="%233b82f6"/><text x="96" y="56" font-family="Arial" font-size="16" font-weight="700" fill="%231e3a8a">Tigercat</text><text x="96" y="78" font-family="Arial" font-size="12" fill="%2364758b">${label}</text></svg>`;
  }
  return `data:text/plain;charset=utf-8,${encodeURIComponent(`Static demo media: ${publicId}`)}`;
}

function task(
  id: string,
  title: string,
  description: string,
  assignee: string,
  priority: TaskItem['priority'],
  status: TaskItem['status'],
  dueAt: string,
  estimateHours: number,
  blocked: boolean,
  blockedReason: string | null = null,
): TaskItem {
  return {
    id,
    title,
    description,
    assignee,
    priority,
    status,
    dueAt,
    estimateHours,
    blocked,
    blockedReason,
    completionNote: status === 'done' ? '演示任务已完成。' : null,
    createdBy: 'system',
    createdAt: CREATED_AT,
    updatedAt: null,
    completedAt: status === 'done' ? CREATED_AT : null,
  };
}

function audit(
  id: string,
  category: AuditLogItem['category'],
  eventType: string,
  title: string,
  description: string,
  actor: string | null,
): AuditLogItem {
  return {
    id,
    stream: category === 'auth' ? 'stream:auth' : 'stream:admin',
    category,
    eventType,
    occurredAtUtc: new Date(Date.now() - Math.floor(Math.random() * 1800000)).toISOString(),
    traceId: 'demo-trace',
    title,
    description,
    actor,
    data: { mode: 'static-demo', actor },
  };
}

function makeJson<T>(data: T, init?: ResponseInit): Response {
  const status = init?.status ?? 200;
  const payload: ApiResponse<T> = {
    code: status,
    message: status >= 400 ? 'Mock request failed' : 'Success',
    success: status < 400,
    data,
  };
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(init?.headers ?? {}) },
  });
}

function makeError(message: string, status = 400, data: unknown = null): Response {
  return new Response(JSON.stringify({ code: status, message, success: false, data }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function makeBlob(text: string, filename: string, contentType = 'text/csv; charset=utf-8'): Response {
  return new Response(new Blob([text], { type: contentType }), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function readState(storageKey: string): DemoState {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw) as DemoState;
  } catch {
    // Fall through and re-seed.
  }
  const state = initialState();
  writeState(storageKey, state);
  return state;
}

function writeState(storageKey: string, state: DemoState) {
  window.sessionStorage.setItem(storageKey, JSON.stringify(state));
}

function toUserItem(state: DemoState, user: DemoUser): UserItem {
  const roles = user.roleIds
    .map((id) => state.roles.find((role) => role.id === id))
    .filter((role): role is DemoRole => Boolean(role))
    .map((role) => ({ id: role.id, name: role.name }));
  const { roleIds: _roleIds, ...rest } = user;
  return { ...rest, roles };
}

function toRoleItem(state: DemoState, role: DemoRole): RoleItem {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    createdAt: role.createdAt,
    permissions: role.permissionIds
      .map((id) => permissions.find((item) => item.id === id))
      .filter((item): item is PermissionInfo => Boolean(item)),
    users: state.users
      .filter((user) => user.roleIds.includes(role.id))
      .map((user) => ({ id: user.id, username: user.username, displayName: user.displayName })),
  };
}

function page<T>(items: T[], url: URL) {
  const current = Math.max(Number(url.searchParams.get('page') ?? '1'), 1);
  const pageSize = Math.max(Number(url.searchParams.get('pageSize') ?? '10'), 1);
  const start = (current - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page: current,
    pageSize,
  };
}

function parseBody(value: BodyInit | null | undefined): unknown {
  if (!value || typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function handleRequest(input: RequestInfo | URL, init: RequestInit, storageKey: string): Promise<Response> {
  const request = input instanceof Request ? input : null;
  const method = (init.method ?? request?.method ?? 'GET').toUpperCase();
  const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
  const url = new URL(rawUrl, window.location.origin);
  const state = readState(storageKey);
  const body = parseBody(init.body ?? null) as Record<string, unknown>;
  const path = url.pathname;

  if (path === '/api/info' && method === 'GET') {
    return makeJson({ name: 'Tigercat Admin', version: 'static-demo', description: 'Frontend static mock API' });
  }

  if (path === '/api/home' && method === 'GET') return makeJson('Hello world');

  if (path === '/api/auth/login' && method === 'POST') {
    const username = String(body.username ?? 'admin');
    const password = String(body.password ?? '');
    if (!['admin', 'demo'].includes(username) || !['admin123', 'demo'].includes(password)) {
      return makeError('账号或密码错误', 401);
    }
    return makeJson({
      token: DEMO_TOKEN,
      username,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    });
  }

  if (path === '/api/auth/register' && method === 'POST') {
    return makeJson({ username: String(body.username ?? 'demo-user') }, { status: 201 });
  }

  if (path === '/api/auth/change-password' && method === 'POST') return makeJson({ message: '密码修改成功' });
  if (path === '/api/auth/logout' && method === 'POST') return makeJson({ message: '退出成功' });

  if (path === '/api/auth/permissions' && method === 'GET') {
    return makeJson({ username: 'admin', permissions });
  }

  if (path === '/api/stats/overview' && method === 'GET') {
    return makeJson({
      totalUsers: state.users.length,
      activeUsers: state.users.filter((item) => item.status === 0).length,
      disabledUsers: state.users.filter((item) => item.status !== 0).length,
      totalRoles: state.roles.length,
      totalPermissions: permissions.length,
    });
  }

  if (path === '/api/stats/trend' && method === 'GET') {
    const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? '7'), 1), 30);
    return makeJson({
      points: Array.from({ length: days }, (_, index) => ({
        date: new Date(Date.now() - (days - index - 1) * 86400000).toISOString().slice(0, 10),
        count: 2 + index + (index % 3),
      })),
    });
  }

  if (path === '/api/users' && method === 'GET') {
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase();
    const status = url.searchParams.get('status');
    let items = state.users.map((user) => toUserItem(state, user));
    if (keyword) {
      items = items.filter((user) =>
        `${user.username} ${user.displayName ?? ''}`.toLowerCase().includes(keyword),
      );
    }
    if (status !== null) items = items.filter((user) => user.status === Number(status));
    return makeJson(page(items, url));
  }

  if (path === '/api/users' && method === 'POST') {
    const username = String(body.username ?? '').trim();
    if (!username) return makeError('请输入用户名');
    if (state.users.some((user) => user.username === username)) return makeError('用户已存在', 409);
    const user: DemoUser = {
      id: state.nextUserId++,
      username,
      displayName: (body.displayName as string | null) ?? null,
      status: 0,
      avatarMediaId: null,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      roleIds: Array.isArray(body.roleIds) ? (body.roleIds as number[]) : [],
    };
    state.users.push(user);
    writeState(storageKey, state);
    return makeJson(toUserItem(state, user), { status: 201 });
  }

  const userIdMatch = path.match(/^\/api\/users\/(\d+)$/);
  if (userIdMatch) {
    const user = state.users.find((item) => item.id === Number(userIdMatch[1]));
    if (!user) return makeError('用户不存在', 404);
    if (method === 'GET') return makeJson(toUserItem(state, user));
    if (method === 'PUT') {
      user.displayName = (body.displayName as string | null | undefined) ?? user.displayName;
      user.status = typeof body.status === 'number' ? body.status : user.status;
      user.roleIds = Array.isArray(body.roleIds) ? (body.roleIds as number[]) : user.roleIds;
      if (typeof body.avatarMediaId === 'number') {
        user.avatarMediaId = body.avatarMediaId > 0 ? body.avatarMediaId : null;
        user.avatarUrl = state.media.find((item) => item.id === user.avatarMediaId)?.url ?? null;
      }
      user.updatedAt = new Date().toISOString();
      writeState(storageKey, state);
      return makeJson(toUserItem(state, user));
    }
    if (method === 'DELETE') {
      if (user.username === 'admin') return makeError('不能删除自己');
      state.users = state.users.filter((item) => item.id !== user.id);
      writeState(storageKey, state);
      return makeJson({ message: '删除成功' });
    }
  }

  if (path === '/api/users/batch-delete' && method === 'POST') {
    const ids = Array.isArray(body.ids) ? (body.ids as number[]) : [];
    state.users = state.users.filter((user) => user.username === 'admin' || !ids.includes(user.id));
    writeState(storageKey, state);
    return makeJson({ message: `成功删除 ${ids.length} 个用户` });
  }

  if (path === '/api/roles/permissions' && method === 'GET') return makeJson(permissions);

  if (path === '/api/roles' && method === 'GET') {
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase();
    let items = state.roles.map((role) => toRoleItem(state, role));
    if (keyword) {
      items = items.filter((role) => `${role.name} ${role.description ?? ''}`.toLowerCase().includes(keyword));
    }
    return makeJson(page(items, url));
  }

  if (path === '/api/roles' && method === 'POST') {
    const name = String(body.name ?? '').trim();
    if (!name) return makeError('请输入角色名称');
    if (state.roles.some((role) => role.name.toLowerCase() === name.toLowerCase())) {
      return makeError('角色名称已存在', 409);
    }
    const role: DemoRole = {
      id: state.nextRoleId++,
      name,
      description: (body.description as string | null) ?? null,
      createdAt: new Date().toISOString(),
      permissionIds: Array.isArray(body.permissionIds) ? (body.permissionIds as number[]) : [],
    };
    state.roles.push(role);
    writeState(storageKey, state);
    return makeJson(toRoleItem(state, role), { status: 201 });
  }

  const rolePermissionMatch = path.match(/^\/api\/roles\/(\d+)\/permissions$/);
  if (rolePermissionMatch && method === 'PUT') {
    const role = state.roles.find((item) => item.id === Number(rolePermissionMatch[1]));
    if (!role) return makeError('角色不存在', 404);
    role.permissionIds = Array.isArray(body.permissionIds) ? (body.permissionIds as number[]) : role.permissionIds;
    writeState(storageKey, state);
    return makeJson(toRoleItem(state, role));
  }

  const roleIdMatch = path.match(/^\/api\/roles\/(\d+)$/);
  if (roleIdMatch) {
    const role = state.roles.find((item) => item.id === Number(roleIdMatch[1]));
    if (!role) return makeError('角色不存在', 404);
    if (method === 'GET') return makeJson(toRoleItem(state, role));
    if (method === 'PUT') {
      role.name = String(body.name ?? role.name).trim();
      role.description = (body.description as string | null | undefined) ?? role.description;
      role.permissionIds = Array.isArray(body.permissionIds) ? (body.permissionIds as number[]) : role.permissionIds;
      writeState(storageKey, state);
      return makeJson(toRoleItem(state, role));
    }
    if (method === 'DELETE') {
      if (role.name === 'Admin') return makeError('不能删除管理员角色');
      state.roles = state.roles.filter((item) => item.id !== role.id);
      state.users.forEach((user) => {
        user.roleIds = user.roleIds.filter((id) => id !== role.id);
      });
      writeState(storageKey, state);
      return makeJson({ message: '删除成功' });
    }
  }

  if (path === '/api/settings' && method === 'GET') return makeJson(state.settings);

  if (path === '/api/settings' && method === 'PUT') {
    const updates = Array.isArray(body.settings) ? (body.settings as Array<{ key: string; value: string }>) : [];
    const changedKeys: string[] = [];
    for (const update of updates) {
      const item = state.settings.find((setting) => setting.key === update.key);
      if (item) {
        item.value = String(update.value ?? '');
        item.updatedAt = new Date().toISOString();
        changedKeys.push(item.key);
      }
    }
    if (changedKeys.length > 0) {
      const notificationId = `notif-setting-${Date.now()}`;
      state.notifications.unshift({
        id: notificationId,
        groupKey: changedKeys.some((key) => key.startsWith('auth.')) ? 'security' : 'ops',
        title: '系统设置已更新',
        description: `admin 更新了 ${changedKeys.join(', ')}。`,
        time: new Date().toISOString(),
        read: false,
        toastType: changedKeys.some((key) => key.startsWith('auth.')) ? 'warning' : 'info',
        meta: { source: 'settings', severity: 'low', eventType: 'admin.setting.updated' },
        linkUrl: `/settings?key=${encodeURIComponent(changedKeys[0])}`,
      });
      state.auditLogs.unshift(audit(
        `audit-setting-${Date.now()}`,
        'system',
        'admin.setting.updated',
        '系统设置已更新',
        `admin 更新了 ${changedKeys.join(', ')}。`,
        'admin',
      ));
    }
    writeState(storageKey, state);
    return makeJson(state.settings);
  }

  const settingMatch = path.match(/^\/api\/settings\/(.+)$/);
  if (settingMatch && method === 'GET') {
    const item = state.settings.find((setting) => setting.key === decodeURIComponent(settingMatch[1]));
    return item ? makeJson(item) : makeError('设置项不存在', 404);
  }

  if (path === '/api/notifications' && method === 'GET') {
    let items = [...state.notifications];
    const groupKey = url.searchParams.get('groupKey');
    const unread = url.searchParams.get('unread');
    if (groupKey) items = items.filter((item) => item.groupKey === groupKey);
    if (unread === 'true') items = items.filter((item) => !item.read);
    return makeJson(page(items, url));
  }

  const notificationMatch = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (notificationMatch && method === 'PUT') {
    const item = state.notifications.find((notification) => notification.id === notificationMatch[1]);
    if (!item) return makeError('通知不存在', 404);
    item.read = Boolean(body.read);
    writeState(storageKey, state);
    return makeJson(item);
  }

  if (path === '/api/notifications/mark-read' && method === 'POST') {
    const groupKey = body.groupKey ? String(body.groupKey) : null;
    state.notifications.forEach((item) => {
      if (!groupKey || item.groupKey === groupKey) item.read = true;
    });
    writeState(storageKey, state);
    return makeJson({ message: '标记已读成功' });
  }

  if (path === '/api/tasks' && method === 'GET') {
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase();
    const status = url.searchParams.get('status');
    const assignee = url.searchParams.get('assignee')?.trim().toLowerCase();
    const blocked = url.searchParams.get('blocked');
    const dueFrom = url.searchParams.get('dueFrom');
    const dueTo = url.searchParams.get('dueTo');
    let items = [...state.tasks];
    if (keyword) items = items.filter((item) => `${item.title} ${item.description ?? ''} ${item.assignee}`.toLowerCase().includes(keyword));
    if (status) items = items.filter((item) => item.status === status);
    if (assignee) items = items.filter((item) => item.assignee.toLowerCase().includes(assignee));
    if (blocked === 'true') items = items.filter((item) => Boolean(item.blocked));
    if (blocked === 'false') items = items.filter((item) => !item.blocked);
    if (dueFrom) items = items.filter((item) => new Date(item.dueAt).getTime() >= new Date(dueFrom).getTime());
    if (dueTo) items = items.filter((item) => new Date(item.dueAt).getTime() <= new Date(dueTo).getTime());
    return makeJson(page(items, url));
  }

  if (path === '/api/tasks' && method === 'POST') {
    const id = `task-demo-${state.nextTaskId++}`;
    const item: TaskItem = {
      id,
      title: String(body.title ?? '新建演示任务'),
      description: (body.description as string | undefined) ?? '',
      assignee: String(body.assignee ?? '待分配'),
      priority: (body.priority as TaskItem['priority']) ?? 'medium',
      status: (body.status as TaskItem['status']) ?? 'backlog',
      dueAt: String(body.dueAt ?? new Date(Date.now() + 86400000).toISOString()),
      estimateHours: Number(body.estimateHours ?? 2),
      blocked: Boolean(body.blocked),
      blockedReason: body.blocked ? String(body.blockedReason ?? '') || null : null,
      completionNote: null,
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: null,
      completedAt: null,
    };
    state.tasks.push(item);
    writeState(storageKey, state);
    return makeJson(item, { status: 201 });
  }

  const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch && method === 'PUT') {
    const item = state.tasks.find((taskItem) => taskItem.id === taskMatch[1]);
    if (!item) return makeError('任务不存在', 404);
    item.title = String(body.title ?? item.title);
    item.description = (body.description as string | undefined) ?? item.description;
    item.assignee = String(body.assignee ?? item.assignee);
    item.priority = (body.priority as TaskItem['priority']) ?? item.priority;
    item.status = (body.status as TaskItem['status']) ?? item.status;
    item.dueAt = String(body.dueAt ?? item.dueAt);
    item.estimateHours = Number(body.estimateHours ?? item.estimateHours);
    if (typeof body.blocked === 'boolean') item.blocked = body.blocked;
    item.blockedReason = item.blocked ? (String(body.blockedReason ?? item.blockedReason ?? '') || null) : null;
    item.updatedAt = new Date().toISOString();
    writeState(storageKey, state);
    return makeJson(item);
  }

  const taskStatusMatch = path.match(/^\/api\/tasks\/([^/]+)\/status$/);
  if (taskStatusMatch && method === 'PUT') {
    const item = state.tasks.find((taskItem) => taskItem.id === taskStatusMatch[1]);
    if (!item) return makeError('任务不存在', 404);
    if (item.blocked && body.status === 'done') return makeError('阻塞任务不能直接移动到已完成');
    item.status = (body.status as TaskItem['status']) ?? item.status;
    item.updatedAt = new Date().toISOString();
    item.completedAt = item.status === 'done' ? item.updatedAt : null;
    writeState(storageKey, state);
    return makeJson(item);
  }

  const taskCompleteMatch = path.match(/^\/api\/tasks\/([^/]+)\/complete$/);
  if (taskCompleteMatch && method === 'POST') {
    const item = state.tasks.find((taskItem) => taskItem.id === taskCompleteMatch[1]);
    if (!item) return makeError('任务不存在', 404);
    if (!body.confirm) return makeError('完成任务前需要确认', 400);
    if (item.blocked) return makeError('阻塞任务不能直接完成', 400);
    item.status = 'done';
    item.completionNote = String(body.completionNote ?? '') || null;
    item.updatedAt = new Date().toISOString();
    item.completedAt = item.updatedAt;
    state.notifications.unshift({
      id: `notif-task-${Date.now()}`,
      groupKey: 'ops',
      title: '运维任务已完成',
      description: `admin 完成了任务 ${item.title}。`,
      time: new Date().toISOString(),
      read: false,
      toastType: 'success',
      meta: { source: 'task', severity: 'low', eventType: 'admin.task.completed' },
      linkUrl: `/tasks?taskId=${encodeURIComponent(item.id)}`,
    });
    writeState(storageKey, state);
    return makeJson(item);
  }

  if (path === '/api/audit-logs' && method === 'GET') {
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase();
    let items = [...state.auditLogs];
    if (keyword) items = items.filter((item) => `${item.title} ${item.description} ${item.eventType}`.toLowerCase().includes(keyword));
    return makeJson(page(items, url));
  }

  if (path === '/api/audit-logs/retention-policy' && method === 'GET') {
    return makeJson({ retentionDays: state.retentionDays, updatedAtUtc: new Date().toISOString() });
  }

  if (path === '/api/audit-logs/retention-policy' && method === 'PUT') {
    state.retentionDays = Number(body.retentionDays ?? state.retentionDays);
    writeState(storageKey, state);
    return makeJson({ retentionDays: state.retentionDays, updatedAtUtc: new Date().toISOString() });
  }

  if (path === '/api/audit-logs/retention/cleanup' && method === 'POST') {
    const cutoff = new Date(Date.now() - state.retentionDays * 86400000);
    const expired = state.auditLogs.filter((item) => new Date(item.occurredAtUtc).getTime() < cutoff.getTime());
    const dryRun = Boolean(body.dryRun);
    if (!dryRun) {
      state.auditLogs = state.auditLogs.filter((item) => new Date(item.occurredAtUtc).getTime() >= cutoff.getTime());
      state.notifications.unshift({
        id: `notif-audit-cleanup-${Date.now()}`,
        groupKey: 'ops',
        title: '审计日志清理完成',
        description: `admin 清理了 ${expired.length} 条过期审计日志。`,
        time: new Date().toISOString(),
        read: false,
        toastType: 'success',
        meta: { source: 'audit', severity: 'low', eventType: 'admin.audit.retention.cleaned' },
        linkUrl: '/audit-logs',
      });
      writeState(storageKey, state);
    }
    return makeJson({
      dryRun,
      retentionDays: state.retentionDays,
      cutoffUtc: cutoff.toISOString(),
      matchedCount: expired.length,
      deletedCount: dryRun ? 0 : expired.length,
    });
  }

  if (path === '/api/audit-logs/export' && method === 'GET') {
    return makeBlob('id,title,eventType\n' + state.auditLogs.map((item) => `${item.id},${item.title},${item.eventType}`).join('\n'), 'audit-logs.csv');
  }

  if (path.startsWith('/api/export/') && method === 'GET') {
    const entity = path.split('/').pop() ?? 'data';
    return makeBlob(`entity,id,name\n${entity},1,static-demo\n`, `${entity}.${url.searchParams.get('format') ?? 'csv'}`);
  }

  if (path === '/api/media' && method === 'GET') {
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase();
    const contentType = url.searchParams.get('contentType');
    let items = [...state.media];
    if (keyword) items = items.filter((item) => item.originalFileName.toLowerCase().includes(keyword));
    if (contentType) items = items.filter((item) => item.contentType.startsWith(contentType));
    return makeJson(page(items, url));
  }

  if (path === '/api/media' && method === 'POST') {
    let fileName = `demo-upload-${state.nextMediaId}.png`;
    let contentType = 'image/png';
    let sizeBytes = 1024;
    const requestBody = init.body;
    if (requestBody instanceof FormData) {
      const file = requestBody.get('file');
      if (file instanceof File) {
        fileName = file.name || fileName;
        contentType = file.type || contentType;
        sizeBytes = file.size || sizeBytes;
      }
    }
    const duplicate = state.media.find((item) =>
      item.originalFileName === fileName &&
      item.contentType === contentType &&
      item.sizeBytes === sizeBytes);
    if (duplicate) {
      return makeError('文件已存在，可复用已有媒体资源', 409, { existing: duplicate });
    }

    const id = state.nextMediaId++;
    const publicId = `demo-upload-${id}`;
    const item = media(id, publicId, fileName, contentType, sizeBytes, fileName.split('.').pop() ?? 'file', 0);
    state.media.unshift(item);
    writeState(storageKey, state);
    return makeJson(item, { status: 201 });
  }

  const mediaDetailMatch = path.match(/^\/api\/media\/(\d+)$/);
  if (mediaDetailMatch && method === 'GET') {
    const item = state.media.find((mediaItem) => mediaItem.id === Number(mediaDetailMatch[1]));
    if (!item) return makeError('媒体资源不存在', 404);
    return makeJson({ ...item, references: mediaReferencesFor(item) });
  }

  const mediaContentMatch = path.match(/^\/api\/media\/([^/]+)\/content$/);
  if (mediaContentMatch && method === 'GET') {
    const item = state.media.find((mediaItem) => mediaItem.publicId === mediaContentMatch[1]);
    if (!item) return new Response(null, { status: 404 });
    return new Response(new Blob(['static demo media content'], { type: item.contentType }), {
      status: 200,
      headers: { 'Cache-Control': 'public,max-age=3600', 'X-Content-Type-Options': 'nosniff' },
    });
  }

  if (path === '/api/media/batch-delete' && method === 'POST') {
    const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)).filter(Number.isFinite) : [];
    const force = body.force === true;
    if (ids.length === 0) return makeError('请选择要删除的媒体资源', 400);

    const selected = state.media.filter((item) => ids.includes(item.id));
    if (selected.length !== ids.length) return makeError('以下媒体资源 ID 不存在', 404);

    const references = selected.flatMap(mediaReferencesFor);
    if (references.length > 0 && !force) {
      return makeError('选中的媒体资源正在被引用，不能批量删除', 409, references);
    }

    if (force) {
      for (const item of selected) {
        for (const reference of mediaReferencesFor(item)) {
          if (reference.referenceType === 'site.logo') {
            const settingItem = state.settings.find((settingValue) => settingValue.key === 'site.logo');
            if (settingItem) settingItem.value = '';
          }
          if (reference.referenceType === 'user.avatar') {
            for (const user of state.users.filter((userItem) => userItem.avatarMediaId === item.id)) {
              user.avatarMediaId = null;
              user.avatarUrl = null;
            }
          }
        }
      }
    }

    state.media = state.media.filter((item) => !ids.includes(item.id));
    writeState(storageKey, state);
    return makeJson({ message: `成功删除 ${selected.length} 个媒体资源` });
  }

  if (path === '/api/media/orphans/cleanup' && method === 'POST') {
    return makeJson({ dryRun: body.dryRun !== false, matchedCount: 0, deletedCount: 0, items: [] });
  }

  const mediaDeleteMatch = path.match(/^\/api\/media\/(\d+)$/);
  if (mediaDeleteMatch && method === 'DELETE') {
    const item = state.media.find((mediaItem) => mediaItem.id === Number(mediaDeleteMatch[1]));
    if (!item) return makeError('媒体资源不存在', 404);
    const force = url.searchParams.get('force') === 'true';
    const references = mediaReferencesFor(item);
    if (references.length > 0 && !force) return makeError('媒体资源正在被引用，不能删除', 409, references);
    state.media = state.media.filter((mediaItem) => mediaItem.id !== item.id);
    writeState(storageKey, state);
    return makeJson({ message: '删除成功' });
  }

  return makeError(`演示模式尚未覆盖接口：${method} ${path}`, 404);
}

function shouldIntercept(input: RequestInfo | URL): boolean {
  const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
  const url = new URL(rawUrl, window.location.origin);
  return url.origin === window.location.origin && url.pathname.startsWith('/api/');
}

export function installTigercatMockApi(options: InstallOptions = {}) {
  if (!options.enabled || typeof window === 'undefined') return;
  const target = window as Window & { __tigercatMockApiInstalled?: boolean };
  if (target.__tigercatMockApiInstalled) return;
  target.__tigercatMockApiInstalled = true;

  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (!shouldIntercept(input)) return nativeFetch(input, init);
    return handleRequest(input, init, storageKey);
  };
}

export function isTigercatDemoEnabled(value: unknown): boolean {
  return String(value).toLowerCase() === 'true';
}
