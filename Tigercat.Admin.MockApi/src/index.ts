import {
  cloneMenuSchemaPayload,
  createMenuNode,
  deleteMenuNode,
  updateMenuNode,
  type MockMenuNodeWrite,
  type MockMenuSchemaPayload,
} from './menu-schema';
import {
  applyApprovalAction,
  createApproval,
  getApproval,
  listApprovals,
  restoreApprovals,
  seedApprovals,
  type ApprovalInstance,
} from './approvals';

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

type TicketStatus = 'open' | 'accepted' | 'progress' | 'resolved' | 'closed';
type TicketPriority = 'high' | 'medium' | 'low';
type ChatDirection = 'self' | 'other';
type CommentTargetType = 'ticket' | 'project';

type TicketMessageItem = {
  id: string;
  content: string;
  direction: ChatDirection;
  time: string;
};

type TicketItem = {
  id: string;
  title: string;
  requester: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  satisfaction: number;
  description: string;
  messages: TicketMessageItem[];
};

type ChatMessageItem = {
  id: string;
  content: string;
  direction: ChatDirection;
  time: string;
};

type CommentItem = {
  id: string;
  content: string;
  user: { name: string };
  time: string;
  targetType: CommentTargetType;
  targetId: string;
};

type ProjectStatus = 'planning' | 'active' | 'paused' | 'done';
type CalendarEventType = 'meeting' | 'review' | 'release' | 'reminder';

type ProjectMemberItem = {
  id: string;
  name: string;
  role: string;
  color: string;
};

type ProjectActivityItem = {
  key: string;
  label: string;
  content: string;
  color: string;
};

type ProjectItem = {
  id: string;
  name: string;
  summary: string;
  owner: string;
  department: string;
  status: ProjectStatus;
  progress: number;
  milestone: number;
  budget: number;
  startAt: string;
  endAt: string;
  members: ProjectMemberItem[];
  activities: ProjectActivityItem[];
};

type CalendarEventItem = {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  type: CalendarEventType;
  location: string;
};

type ArticleEditorType = 'rich' | 'markdown' | 'code';
type JobStatus = 'running' | 'paused' | 'failed';
type ImportJobStatus = 'pending' | 'running' | 'completed' | 'failed';
type ImportMode = 'append' | 'overwrite' | 'upsert';
type ImportConflict = 'skip' | 'overwrite' | 'error';

type ArticleItem = {
  id: string;
  title: string;
  editorType: ArticleEditorType;
  body: string;
  tags: string[];
  category: string;
  column: string[];
  published: boolean;
};

type JobItem = {
  id: string;
  name: string;
  cron: string;
  concurrency: number;
  timeout: string;
  batchSize: string;
  enabled: boolean;
  status: JobStatus;
  lastRun: string;
  nextRun: string;
  progress: number;
  phase: number;
  start: string;
  end: string;
  color: string;
};

type ImportJobResultItem = {
  imported: number;
  skipped: number;
  message: string;
};

type ImportJobItem = {
  id: string;
  source: string;
  target: string[];
  mappings: string[];
  mode: ImportMode;
  conflict: ImportConflict;
  batchSize: number;
  status: ImportJobStatus;
  progress: number;
  result: ImportJobResultItem | null;
};

type DemoState = {
  users: DemoUser[];
  roles: DemoRole[];
  settings: SettingItem[];
  media: MediaItem[];
  notifications: NotificationItem[];
  tasks: TaskItem[];
  tickets: TicketItem[];
  approvals: ApprovalInstance[];
  chatMessages: ChatMessageItem[];
  comments: CommentItem[];
  projects: ProjectItem[];
  calendarEvents: CalendarEventItem[];
  articles: ArticleItem[];
  jobs: JobItem[];
  importJobs: ImportJobItem[];
  auditLogs: AuditLogItem[];
  menuSchema: MockMenuSchemaPayload;
  retentionDays: number;
  nextUserId: number;
  nextRoleId: number;
  nextMediaId: number;
  nextTaskId: number;
  nextTicketNumber: number;
  nextApprovalNumber: number;
  nextJobNumber: number;
  nextImportJobNumber: number;
  nextMessageSeq: number;
  passwords: Record<string, string>;
  twoFactorByUser: Record<string, boolean>;
  pendingTwoFactor: Record<string, string>;
  pendingForgot: Record<string, string>;
};

type InstallOptions = {
  enabled?: boolean;
  storageKey?: string;
};

const DEFAULT_STORAGE_KEY = 'tigercat.admin.demo.mock-state';
const DEMO_TOKEN = 'demo-static-token';
const CREATED_AT = '2026-06-03T02:00:00.000Z';
const DEMO_OTP_CODE = '123456';

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
  ['notification:create', '创建通知'],
  ['menu:view', '查看菜单管理'],
  ['menu:create', '创建菜单节点'],
  ['menu:edit', '编辑菜单节点'],
  ['menu:delete', '删除菜单节点'],
].map(([code, description], index) => ({
  id: index + 1,
  code,
  description,
}));

const allPermissionIds = permissions.map((item) => item.id);

/**
 * Permissions granted to the read-only `demo` account: it can browse
 * view-only pages but lacks user/role/media management, so hitting /users,
 * /roles or /files redirects to /403 (stage 6 exception-page demo).
 */
const DEMO_ACCOUNT_PERMISSIONS = [
  'dashboard:view',
  'setting:view',
  'audit:view',
  'notification:view',
  'task:view',
];

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
          .filter((item) => !['user:delete', 'role:delete', 'menu:delete', 'audit:export'].includes(item.code))
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
      setting(12, 'security.permissionSeedVersion', '2026.08.27.1', '权限种子数据版本'),
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
    tickets: seedTickets(),
    approvals: seedApprovals(),
    chatMessages: [
      {
        id: 'chat-welcome',
        content: '你好，我是在线客服小虎，有任何关于后台的问题都可以问我～',
        direction: 'other',
        time: '2026-06-29T09:00:00.000Z',
      },
    ],
    comments: [
      {
        id: 'n-2048-1',
        targetType: 'ticket',
        targetId: 'TK-2048',
        content: '初步定位为导出队列在高峰期超时，已 @张运维 调整 worker 并发。',
        user: { name: '李工' },
        time: '2026-06-28 14:30',
      },
      {
        id: 'n-2041-1',
        targetType: 'ticket',
        targetId: 'TK-2041',
        content: '根因：刷新接口未带上最新 token，已修复并补充回归用例。',
        user: { name: '王小虎' },
        time: '2026-06-26 17:40',
      },
      {
        id: 'c-p-1001-1',
        targetType: 'project',
        targetId: '1001',
        content: '仪表盘空状态文案建议改成「暂无运营数据」。',
        user: { name: '赵敏' },
        time: '2026-08-21 11:20',
      },
      {
        id: 'c-p-1001-2',
        targetType: 'project',
        targetId: '1001',
        content: '权限码过滤菜单已经对上，demo 账号可用来演示 403。',
        user: { name: '李工' },
        time: '2026-08-22 09:40',
      },
    ],
    projects: seedProjects(),
    calendarEvents: seedCalendarEvents(),
    articles: seedArticles(),
    jobs: seedJobs(),
    importJobs: [],
    menuSchema: cloneMenuSchemaPayload(),
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
    nextTicketNumber: 2051,
    nextApprovalNumber: 1100,
    nextJobNumber: 1005,
    nextImportJobNumber: 1001,
    nextMessageSeq: 1,
    passwords: {
      admin: 'admin123',
      demo: 'demo',
    },
    twoFactorByUser: {
      admin: false,
      demo: true,
    },
    pendingTwoFactor: {},
    pendingForgot: {},
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

function seedTickets(): TicketItem[] {
  return [
    {
      id: 'TK-2048',
      title: '导出报表时偶发 500 错误',
      requester: '赵敏',
      category: '缺陷',
      priority: 'high',
      status: 'progress',
      createdAt: '2026-06-28 10:24',
      updatedAt: '2026-06-29 09:02',
      satisfaction: 0,
      description: '在数据分析页导出近 90 天报表时，约 1/5 概率返回 500，刷新后可恢复。',
      messages: [
        { id: 'm-2048-1', content: '你好，导出报表偶尔会失败，麻烦看下。', direction: 'other', time: '2026-06-28 10:24' },
        { id: 'm-2048-2', content: '已收到，正在排查导出服务的超时配置。', direction: 'self', time: '2026-06-28 11:10' },
      ],
    },
    {
      id: 'TK-2050',
      title: '希望支持按部门筛选用户',
      requester: '孙莉',
      category: '需求',
      priority: 'medium',
      status: 'accepted',
      createdAt: '2026-06-27 16:40',
      updatedAt: '2026-06-28 09:15',
      satisfaction: 0,
      description: '用户管理列表希望增加“部门”筛选项，便于按团队管理成员。',
      messages: [
        { id: 'm-2050-1', content: '能否在用户列表加一个部门筛选？', direction: 'other', time: '2026-06-27 16:40' },
      ],
    },
    {
      id: 'TK-2041',
      title: '登录后偶尔跳回登录页',
      requester: '周杰',
      category: '缺陷',
      priority: 'high',
      status: 'resolved',
      createdAt: '2026-06-25 08:12',
      updatedAt: '2026-06-26 17:50',
      satisfaction: 4,
      description: '部分用户登录成功后数秒内被登出，疑似 token 续期问题。',
      messages: [
        { id: 'm-2041-1', content: '登录后过一会就被踢出来了。', direction: 'other', time: '2026-06-25 08:12' },
        { id: 'm-2041-2', content: '已修复 token 续期逻辑，请再试试。', direction: 'self', time: '2026-06-26 17:50' },
        { id: 'm-2041-3', content: '可以了，谢谢！', direction: 'other', time: '2026-06-26 18:05' },
      ],
    },
  ];
}

function seedProjects(): ProjectItem[] {
  const wang: ProjectMemberItem = { id: 'm-wang', name: '王小虎', role: '前端', color: '#3b82f6' };
  const li: ProjectMemberItem = { id: 'm-li', name: '李工', role: '后端', color: '#22c55e' };
  const zhang: ProjectMemberItem = { id: 'm-zhang', name: '张运维', role: '运维', color: '#f59e0b' };
  const chen: ProjectMemberItem = { id: 'm-chen', name: '陈测试', role: '测试', color: '#a855f7' };
  const zhao: ProjectMemberItem = { id: 'm-zhao', name: '赵敏', role: '产品', color: '#ef4444' };
  const sun: ProjectMemberItem = { id: 'm-sun', name: '孙莉', role: '设计', color: '#14b8a6' };
  return [
    {
      id: '1001',
      name: '智能运营台',
      summary: '统一仪表盘、快捷跳转与运营指标的卡片工作台。',
      owner: '王小虎',
      department: '平台研发部',
      status: 'active',
      progress: 68,
      milestone: 2,
      budget: 86,
      startAt: '2026-03-12',
      endAt: '2026-09-30',
      members: [wang, li, zhao, sun],
      activities: [
        { key: 'a1', label: '今天 09:20', content: '王小虎 更新了里程碑「联调验收」', color: '#3b82f6' },
        { key: 'a2', label: '昨天 18:04', content: '李工 合并权限接口联调分支', color: '#22c55e' },
        { key: 'a3', label: '08-21 11:12', content: '赵敏 补充运营指标口径说明', color: '#64748b' },
      ],
    },
    {
      id: '1002',
      name: '权限治理升级',
      summary: '梳理角色权限树、入口守卫与只读演示账号策略。',
      owner: '李工',
      department: '安全治理组',
      status: 'planning',
      progress: 18,
      milestone: 0,
      budget: 42,
      startAt: '2026-08-04',
      endAt: '2026-11-15',
      members: [li, chen, zhang],
      activities: [
        { key: 'a1', label: '08-18 16:30', content: '李工 提交权限矩阵初稿', color: '#3b82f6' },
        { key: 'a2', label: '08-16 10:05', content: '陈测试 列出回归用例范围', color: '#a855f7' },
      ],
    },
    {
      id: '1003',
      name: '媒体资源中台',
      summary: '图库、裁剪、标注与文件管理共用同一套媒体契约。',
      owner: '孙莉',
      department: '内容中台',
      status: 'active',
      progress: 54,
      milestone: 1,
      budget: 63,
      startAt: '2026-05-08',
      endAt: '2026-10-20',
      members: [sun, wang, zhang, chen],
      activities: [
        { key: 'a1', label: '08-20 15:44', content: '孙莉 完成 16:9 裁剪交互', color: '#14b8a6' },
        { key: 'a2', label: '08-19 09:18', content: '张运维 调整本地媒体存储配额', color: '#f59e0b' },
      ],
    },
    {
      id: '1004',
      name: '工单协作 2.0',
      summary: '主从分栏、生命周期步骤与内部备注讨论的协作模板。',
      owner: '赵敏',
      department: '客户成功',
      status: 'paused',
      progress: 41,
      milestone: 1,
      budget: 55,
      startAt: '2026-04-22',
      endAt: '2026-12-01',
      members: [zhao, wang, li],
      activities: [
        { key: 'a1', label: '08-12 19:00', content: '赵敏 暂停迭代，等待客服排期', color: '#f59e0b' },
        { key: 'a2', label: '08-08 11:26', content: '王小虎 完成 CommentThread 接入', color: '#3b82f6' },
      ],
    },
    {
      id: '1005',
      name: '报表打印服务',
      summary: 'A4 打印布局、水印与渠道明细的导出演示。',
      owner: '陈测试',
      department: '数据分析',
      status: 'done',
      progress: 100,
      milestone: 3,
      budget: 28,
      startAt: '2026-02-10',
      endAt: '2026-06-30',
      members: [chen, li, zhao],
      activities: [
        { key: 'a1', label: '06-30 17:40', content: '陈测试 关闭里程碑「发布上线」', color: '#22c55e' },
        { key: 'a2', label: '06-28 10:16', content: '李工 补齐打印分页分隔', color: '#3b82f6' },
      ],
    },
    {
      id: '1006',
      name: '监控可观测性',
      summary: '资源水位、QPS/延迟滚动窗口与节点事件流。',
      owner: '张运维',
      department: '基础设施',
      status: 'active',
      progress: 72,
      milestone: 2,
      budget: 91,
      startAt: '2026-06-01',
      endAt: '2026-09-15',
      members: [zhang, li, chen, wang],
      activities: [
        { key: 'a1', label: '今天 08:11', content: '张运维 调整默认刷新间隔为 3 秒', color: '#f59e0b' },
        { key: 'a2', label: '昨天 21:33', content: '李工 封顶事件流环形缓冲', color: '#22c55e' },
      ],
    },
    {
      id: '1007',
      name: '导入向导优化',
      summary: '字段映射、冲突策略与导入进度结果页的体验打磨。',
      owner: '李工',
      department: '平台研发部',
      status: 'planning',
      progress: 8,
      milestone: 0,
      budget: 36,
      startAt: '2026-08-18',
      endAt: '2026-12-20',
      members: [li, sun, chen],
      activities: [
        { key: 'a1', label: '08-19 14:22', content: '李工 收集现有向导痛点', color: '#3b82f6' },
      ],
    },
    {
      id: '1008',
      name: '帮助中心改版',
      summary: '锚点目录、FAQ 手风琴与无限加载文章列表。',
      owner: '王小虎',
      department: '体验设计',
      status: 'done',
      progress: 100,
      milestone: 3,
      budget: 19,
      startAt: '2026-01-15',
      endAt: '2026-05-20',
      members: [wang, sun, zhao],
      activities: [
        { key: 'a1', label: '05-20 16:00', content: '王小虎 发布帮助中心改版', color: '#22c55e' },
        { key: 'a2', label: '05-18 09:42', content: '孙莉 完成目录吸顶视觉', color: '#14b8a6' },
      ],
    },
  ];
}

function seedCalendarEvents(): CalendarEventItem[] {
  return [
    { id: 'e1', date: '2026-06-29', start: '10:00', end: '11:00', title: '迭代站会', type: 'meeting', location: '线上 · 腾讯会议' },
    { id: 'e2', date: '2026-06-29', start: '14:30', end: '15:30', title: '组件库设计评审', type: 'review', location: '会议室 A' },
    { id: 'e3', date: '2026-06-30', start: '16:00', end: '17:00', title: 'v1.6 发布窗口', type: 'release', location: '生产环境' },
    { id: 'e4', date: '2026-07-01', start: '09:30', end: '10:00', title: '季度 OKR 对齐', type: 'meeting', location: '会议室 B' },
    { id: 'e5', date: '2026-07-02', start: '15:00', end: '15:30', title: '安全合规提醒', type: 'reminder', location: '—' },
  ];
}

function seedArticles(): ArticleItem[] {
  return [
    {
      id: 'a1',
      title: '组件库 v1.6 发布说明',
      editorType: 'rich',
      body: '<h2>组件库 v1.6 发布说明</h2><p>本次更新带来内容编辑工作台，支持富文本 / Markdown / 代码三种模式互切。</p>',
      tags: ['发布', '组件库'],
      category: 'frontend',
      column: ['docs', 'guide'],
      published: false,
    },
  ];
}

function seedJobs(): JobItem[] {
  return [
    {
      id: 'JOB-1001',
      name: '每日对账批处理',
      cron: '0 2 * * *',
      concurrency: 4,
      timeout: '120',
      batchSize: '2000',
      enabled: true,
      status: 'running',
      lastRun: '2026-07-01 02:00',
      nextRun: '2026-07-02 02:00',
      progress: 64,
      phase: 1,
      start: '2026-06-30',
      end: '2026-07-02',
      color: '#22c55e',
    },
    {
      id: 'JOB-1002',
      name: '订单数据归档',
      cron: '0 3 * * 0',
      concurrency: 2,
      timeout: '300',
      batchSize: '5000',
      enabled: true,
      status: 'running',
      lastRun: '2026-06-29 03:00',
      nextRun: '2026-07-06 03:00',
      progress: 28,
      phase: 1,
      start: '2026-06-29',
      end: '2026-07-01',
      color: '#3b82f6',
    },
    {
      id: 'JOB-1003',
      name: '缓存预热',
      cron: '*/30 * * * *',
      concurrency: 8,
      timeout: '60',
      batchSize: '500',
      enabled: false,
      status: 'paused',
      lastRun: '2026-06-30 23:30',
      nextRun: '—',
      progress: 100,
      phase: 3,
      start: '2026-06-28',
      end: '2026-06-30',
      color: '#94a3b8',
    },
    {
      id: 'JOB-1004',
      name: '报表快照生成',
      cron: '0 6 * * *',
      concurrency: 1,
      timeout: '180',
      batchSize: '1000',
      enabled: true,
      status: 'failed',
      lastRun: '2026-07-01 06:00',
      nextRun: '2026-07-02 06:00',
      progress: 42,
      phase: 2,
      start: '2026-07-01',
      end: '2026-07-03',
      color: '#ef4444',
    },
  ];
}

const ARTICLE_EDITOR_TYPES: ArticleEditorType[] = ['rich', 'markdown', 'code'];
const JOB_STATUSES: JobStatus[] = ['running', 'paused', 'failed'];
const IMPORT_MODES: ImportMode[] = ['append', 'overwrite', 'upsert'];
const IMPORT_CONFLICTS: ImportConflict[] = ['skip', 'overwrite', 'error'];
const IMPORT_MODE_LABELS: Record<ImportMode, string> = {
  append: '追加',
  overwrite: '覆盖',
  upsert: '更新插入',
};
const IMPORT_TARGET_LABELS: Record<string, string> = {
  hr: '人力资源',
  employees: '员工表',
  departments: '部门表',
  crm: '客户管理',
  customers: '客户表',
  contacts: '联系人表',
};

function normalizeStringList(value: unknown, itemMaxLength: number, maxCount: number): string[] | null {
  if (!Array.isArray(value)) return [];
  const items = value
    .map((item) => String(item ?? '').trim())
    .filter((item) => item.length > 0);
  if (items.length > maxCount || items.some((item) => item.length > itemMaxLength)) return null;
  return items;
}

function applyJobStatusMachine(job: JobItem, wasEnabled: boolean) {
  if (!job.enabled) {
    job.status = 'paused';
    job.nextRun = '—';
    return;
  }
  if (!wasEnabled) {
    job.status = 'running';
    if (!job.nextRun || job.nextRun === '—') job.nextRun = '待调度';
    return;
  }
  if (job.status === 'failed') return;
  job.status = 'running';
  if (!job.nextRun || job.nextRun === '—') job.nextRun = '待调度';
}

function advanceImportJob(job: ImportJobItem) {
  if (job.status === 'completed' || job.status === 'failed') return;
  job.status = 'running';
  job.progress = Math.min(100, job.progress + 25);
  if (job.progress < 100) return;
  job.progress = 100;
  job.status = 'completed';
  const modeLabel = IMPORT_MODE_LABELS[job.mode];
  const targetText = job.target.length
    ? job.target.map((segment) => IMPORT_TARGET_LABELS[segment] ?? segment).join(' / ')
    : '未选择';
  job.result = {
    imported: job.mappings.length,
    skipped: job.conflict === 'skip' ? 1 : 0,
    message: `已按「${modeLabel}」模式导入至 ${targetText}，映射 ${job.mappings.length} 个字段。`,
  };
}

function nowTicketLabel() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pageTickets(items: TicketItem[], url: URL) {
  return pageItems(items, url, 50);
}

function pageItems<T>(items: T[], url: URL, defaultPageSize: number) {
  const current = Math.max(Number(url.searchParams.get('page') ?? '1') || 1, 1);
  const rawSize = Number(url.searchParams.get('pageSize') ?? String(defaultPageSize));
  const pageSize = Math.min(
    Math.max(Number.isFinite(rawSize) && rawSize > 0 ? rawSize : defaultPageSize, 1),
    200,
  );
  const start = (current - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page: current,
    pageSize,
  };
}

function actorName(state: DemoState, request: Request | null, init: RequestInit) {
  const username = sessionUsername(request, init);
  const user = state.users.find((item) => item.username === username);
  return user?.displayName?.trim() || username || 'unknown';
}

function nextMockId(state: DemoState, prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${state.nextMessageSeq++}`;
}

type MonitorNodeStatus = 'healthy' | 'warning' | 'critical';
type MonitorNodeState = {
  id: string;
  name: string;
  zone: string;
  cpu: number;
  memory: number;
};
type MonitorEventItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  status: { label: string; variant: string };
};

const MONITOR_EVENT_TEMPLATES: Array<{ title: string; description: string; label: string; variant: string }> = [
  { title: 'API 网关流量升高', description: '入口 QPS 超过近窗均值', label: '告警', variant: 'warning' },
  { title: '工作节点恢复', description: '心跳已恢复，流量重新接入', label: '恢复', variant: 'success' },
  { title: '缓存命中率回升', description: '热点 key 预热完成', label: '正常', variant: 'success' },
  { title: 'CPU 水位抖动', description: '瞬时计算任务推高水位', label: '抖动', variant: 'info' },
  { title: '磁盘清理完成', description: '临时文件回收，可用空间回升', label: '运维', variant: 'primary' },
  { title: '延迟回落到基线', description: 'P95 延迟已回到滚动窗口中位', label: '正常', variant: 'success' },
  { title: '节点探活超时', description: '单次探活未响应，已自动重试', label: '异常', variant: 'danger' },
  { title: '自动扩容触发', description: '副本数 +1，等待就绪', label: '扩容', variant: 'info' },
];

const MONITOR_FEED_CAP = 20;

function clampMonitor(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function walkMonitor(current: number, min: number, max: number, step: number) {
  return clampMonitor(current + (Math.random() * 2 - 1) * step, min, max);
}

function monitorHealth(cpu: number, memory: number): MonitorNodeStatus {
  const load = Math.max(cpu, memory);
  if (load >= 85) return 'critical';
  if (load >= 70) return 'warning';
  return 'healthy';
}

function createMonitorEvent(tickCount: number, at: Date, template: (typeof MONITOR_EVENT_TEMPLATES)[number]): MonitorEventItem {
  return {
    id: `evt-${tickCount}-${at.getTime()}`,
    title: template.title,
    description: template.description,
    time: at.toISOString(),
    status: { label: template.label, variant: template.variant },
  };
}

const monitorWalker = {
  cpu: 54,
  memory: 61,
  disk: 67,
  qps: 1056,
  latency: 45,
  tickCount: 3,
  nodes: [
    { id: 'api-hz-1', name: 'api-hz-1', zone: '华东', cpu: 46, memory: 58 },
    { id: 'api-bj-1', name: 'api-bj-1', zone: '华北', cpu: 62, memory: 71 },
    { id: 'worker-hz-1', name: 'worker-hz-1', zone: '华东', cpu: 38, memory: 44 },
    { id: 'cache-hz-1', name: 'cache-hz-1', zone: '华东', cpu: 51, memory: 63 },
  ] as MonitorNodeState[],
  events: [
    createMonitorEvent(1, new Date(Date.now() - 9000), MONITOR_EVENT_TEMPLATES[0]),
    createMonitorEvent(2, new Date(Date.now() - 6000), MONITOR_EVENT_TEMPLATES[1]),
    createMonitorEvent(3, new Date(Date.now() - 3000), MONITOR_EVENT_TEMPLATES[2]),
  ] as MonitorEventItem[],
};

function nextMonitorSnapshot() {
  monitorWalker.tickCount += 1;
  monitorWalker.cpu = Math.round(walkMonitor(monitorWalker.cpu, 18, 96, 5));
  monitorWalker.memory = Math.round(walkMonitor(monitorWalker.memory, 28, 92, 4));
  monitorWalker.disk = Math.round(walkMonitor(monitorWalker.disk, 40, 88, 2));
  monitorWalker.qps = Math.round(walkMonitor(monitorWalker.qps, 720, 1480, 48));
  monitorWalker.latency = Math.round(walkMonitor(monitorWalker.latency, 18, 86, 3.5) * 10) / 10;
  monitorWalker.nodes = monitorWalker.nodes.map((node, index) => ({
    ...node,
    cpu: Math.round(walkMonitor(node.cpu, 16, 96, 6 + index)),
    memory: Math.round(walkMonitor(node.memory, 24, 94, 5)),
  }));
  const template = monitorWalker.tickCount < MONITOR_EVENT_TEMPLATES.length
    ? MONITOR_EVENT_TEMPLATES[monitorWalker.tickCount % MONITOR_EVENT_TEMPLATES.length]
    : MONITOR_EVENT_TEMPLATES[Math.floor(Math.random() * MONITOR_EVENT_TEMPLATES.length)];
  monitorWalker.events = [
    createMonitorEvent(monitorWalker.tickCount, new Date(), template),
    ...monitorWalker.events,
  ].slice(0, MONITOR_FEED_CAP);
  const serverTime = new Date().toISOString();
  return {
    cpu: monitorWalker.cpu,
    memory: monitorWalker.memory,
    disk: monitorWalker.disk,
    qps: monitorWalker.qps,
    latency: monitorWalker.latency,
    nodes: monitorWalker.nodes.map((node) => ({
      ...node,
      status: monitorHealth(node.cpu, node.memory),
    })),
    events: monitorWalker.events,
    serverTime,
    tickCount: monitorWalker.tickCount,
    lastTickAt: serverTime,
  };
}

function toCommentResponse(item: CommentItem) {
  return { id: item.id, content: item.content, user: item.user, time: item.time };
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

const EXPORT_FORMATS = ['csv', 'json', 'xlsx'] as const;
const REPORT_TYPES = ['daily', 'weekly', 'monthly'] as const;
const REPORT_KPI: Record<(typeof REPORT_TYPES)[number], { visits: string; orders: string; conversionRate: string; revenue: string }> = {
  daily: { visits: '18420', orders: '642', conversionRate: '3.5%', revenue: '128600 元' },
  weekly: { visits: '126800', orders: '4380', conversionRate: '3.4%', revenue: '892400 元' },
  monthly: { visits: '542000', orders: '18960', conversionRate: '3.6%', revenue: '3846200 元' },
};
const REPORT_CHANNELS = [
  { channel: '自然搜索', channelVisits: '6820', channelOrders: '248', channelRate: '3.6%', channelAmount: '¥ 48,200' },
  { channel: '付费广告', channelVisits: '5140', channelOrders: '196', channelRate: '3.8%', channelAmount: '¥ 39,600' },
  { channel: '社交媒体', channelVisits: '3260', channelOrders: '108', channelRate: '3.3%', channelAmount: '¥ 21,400' },
  { channel: '直接访问', channelVisits: '3200', channelOrders: '90', channelRate: '2.8%', channelAmount: '¥ 19,400' },
];
const REPORT_FIELDS = ['section', 'visits', 'orders', 'conversionRate', 'revenue', 'channel', 'channelVisits', 'channelOrders', 'channelRate', 'channelAmount'];
const REPORT_KPI_FIELDS = ['visits', 'orders', 'conversionRate', 'revenue'];
const REPORT_CHANNEL_FIELDS = ['channel', 'channelVisits', 'channelOrders', 'channelRate', 'channelAmount'];
const OVERVIEW_FIELDS = ['section', 'key', 'label', 'value'];
const AUDIT_EXPORT_FIELDS = ['id', 'stream', 'category', 'eventType', 'occurredAtUtc', 'traceId', 'title', 'description', 'actor'];

function parseExportFormat(url: URL): string | Response {
  const format = (url.searchParams.get('format') ?? 'csv').trim().toLowerCase();
  if (!EXPORT_FORMATS.includes(format as (typeof EXPORT_FORMATS)[number])) {
    return makeError(`不支持的格式，可选值：${EXPORT_FORMATS.join(', ')}`, 400);
  }
  return format;
}

function parseExportFields(raw: string | null, allFields: string[]): string[] {
  if (!raw?.trim()) return allFields;
  const requested = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => allFields.some((field) => field.toLowerCase() === item.toLowerCase()))
    .map((item) => allFields.find((field) => field.toLowerCase() === item.toLowerCase()) ?? item);
  return requested.length > 0 ? requested : allFields;
}

function escapeCsv(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function makeExportFile(rows: Array<Record<string, unknown>>, fields: string[], format: string, entityName: string): Response {
  const filtered = rows.map((row) => {
    const next: Record<string, unknown> = {};
    for (const field of fields) next[field] = row[field] ?? '';
    return next;
  });

  if (format === 'json') {
    return makeBlob(JSON.stringify(filtered, null, 2), `${entityName}.json`, 'application/json; charset=utf-8');
  }

  const csv = [
    fields.join(','),
    ...filtered.map((row) => fields.map((field) => escapeCsv(row[field])).join(',')),
  ].join('\n');

  if (format === 'xlsx') {
    return makeBlob(
      csv,
      `${entityName}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  return makeBlob(`\uFEFF${csv}`, `${entityName}.csv`, 'text/csv; charset=utf-8');
}

function filterAuditLogs(items: AuditLogItem[], url: URL): AuditLogItem[] {
  const keyword = url.searchParams.get('keyword')?.trim().toLowerCase();
  const category = url.searchParams.get('category')?.trim();
  const eventType = url.searchParams.get('eventType')?.trim();
  const actor = url.searchParams.get('actor')?.trim().toLowerCase();
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  let next = [...items];
  if (keyword) {
    next = next.filter((item) => `${item.title} ${item.description} ${item.eventType}`.toLowerCase().includes(keyword));
  }
  if (category) {
    next = next.filter((item) => item.category.toLowerCase() === category.toLowerCase());
  }
  if (eventType) {
    next = next.filter((item) => item.eventType.toLowerCase() === eventType.toLowerCase());
  }
  if (actor) {
    next = next.filter((item) => (item.actor ?? '').toLowerCase().includes(actor));
  }
  if (from) {
    const value = new Date(from).getTime();
    if (!Number.isNaN(value)) next = next.filter((item) => new Date(item.occurredAtUtc).getTime() >= value);
  }
  if (to) {
    const value = new Date(to).getTime();
    if (!Number.isNaN(value)) next = next.filter((item) => new Date(item.occurredAtUtc).getTime() <= value);
  }
  return next.slice(0, 1000);
}

function readState(storageKey: string): DemoState {
  const seeded = initialState();
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DemoState>;
      return {
        ...seeded,
        ...parsed,
        tickets: parsed.tickets ?? seeded.tickets,
        approvals: restoreApprovals(parsed.approvals, seeded.approvals),
        chatMessages: parsed.chatMessages ?? seeded.chatMessages,
        comments: parsed.comments ?? seeded.comments,
        projects: parsed.projects ?? seeded.projects,
        calendarEvents: parsed.calendarEvents ?? seeded.calendarEvents,
        articles: parsed.articles ?? seeded.articles,
        jobs: parsed.jobs ?? seeded.jobs,
        importJobs: parsed.importJobs ?? seeded.importJobs,
        menuSchema: parsed.menuSchema ?? seeded.menuSchema,
        nextTicketNumber: parsed.nextTicketNumber ?? seeded.nextTicketNumber,
        nextApprovalNumber: parsed.nextApprovalNumber ?? seeded.nextApprovalNumber,
        nextJobNumber: parsed.nextJobNumber ?? seeded.nextJobNumber,
        nextImportJobNumber: parsed.nextImportJobNumber ?? seeded.nextImportJobNumber,
        nextMessageSeq: parsed.nextMessageSeq ?? seeded.nextMessageSeq,
        passwords: { ...seeded.passwords, ...(parsed.passwords ?? {}) },
        twoFactorByUser: { ...seeded.twoFactorByUser, ...(parsed.twoFactorByUser ?? {}) },
        pendingTwoFactor: parsed.pendingTwoFactor ?? {},
        pendingForgot: parsed.pendingForgot ?? {},
      };
    }
  } catch {
    // Fall through and re-seed.
  }
  writeState(storageKey, seeded);
  return seeded;
}

function userPermissionCodes(state: DemoState, username: string): string[] {
  if (username === 'demo') return [...DEMO_ACCOUNT_PERMISSIONS];
  if (username === 'admin') return permissions.map((item) => item.code);
  const user = state.users.find((item) => item.username === username);
  if (!user) return [];
  const codes = new Set<string>();
  for (const roleId of user.roleIds) {
    const role = state.roles.find((item) => item.id === roleId);
    if (!role) continue;
    for (const permissionId of role.permissionIds) {
      const permission = permissions.find((item) => item.id === permissionId);
      if (permission) codes.add(permission.code);
    }
  }
  return [...codes];
}

function requireMenuPermission(
  state: DemoState,
  request: Request | null,
  init: RequestInit,
  code: string,
): Response | null {
  const username = sessionUsername(request, init);
  if (!username) return makeError('未授权', 401);
  if (!userPermissionCodes(state, username).includes(code)) {
    return makeError('权限不足', 403);
  }
  return null;
}

function sessionUsername(request: Request | null, init: RequestInit): string {
  const authHeader =
    request?.headers.get('Authorization') ||
    request?.headers.get('X-Token') ||
    (init.headers instanceof Headers
      ? init.headers.get('Authorization') || init.headers.get('X-Token')
      : Array.isArray(init.headers)
        ? init.headers.find(([key]) =>
            ['authorization', 'x-token'].includes(key.toLowerCase()),
          )?.[1]
        : (init.headers as Record<string, string> | undefined)?.Authorization ||
          (init.headers as Record<string, string> | undefined)?.['X-Token']);
  const token = String(authHeader ?? '').replace(/^Bearer\s+/i, '');
  if (token.startsWith(`${DEMO_TOKEN}:`)) return token.slice(DEMO_TOKEN.length + 1);
  if (token === DEMO_TOKEN) return 'admin';
  return '';
}

function issueSession(username: string) {
  return {
    token: `${DEMO_TOKEN}:${username}`,
    username,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  };
}

function resolveForgotUsername(channel: string, target: string): string {
  const value = target.trim();
  if (channel === 'email' || value.includes('@')) {
    const at = value.indexOf('@');
    if (at > 0) return value.slice(0, at).trim().toLowerCase();
  }
  return value.toLowerCase();
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

  if (path === '/api/monitor/snapshot' && method === 'GET') {
    return makeJson(nextMonitorSnapshot());
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const username = String(body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const expected = state.passwords[username];
    if (!expected || expected !== password) {
      return makeError('账号或密码错误', 401);
    }
    if (state.twoFactorByUser[username]) {
      const challengeId = `challenge-${username}-${Date.now()}`;
      state.pendingTwoFactor[username] = challengeId;
      writeState(storageKey, state);
      return makeJson({ requiresTwoFactor: true, username, challengeId });
    }
    return makeJson(issueSession(username));
  }

  if (path === '/api/auth/two-factor/verify' && method === 'POST') {
    const username = String(body.username ?? '').trim().toLowerCase();
    const code = String(body.code ?? '').trim();
    const challengeId = body.challengeId ? String(body.challengeId) : '';
    const pending = state.pendingTwoFactor[username];
    if (!pending || (challengeId && challengeId !== pending) || code !== DEMO_OTP_CODE || !state.twoFactorByUser[username]) {
      return makeError('验证码错误', 401);
    }
    delete state.pendingTwoFactor[username];
    writeState(storageKey, state);
    return makeJson(issueSession(username));
  }

  if (path === '/api/auth/two-factor' && method === 'GET') {
    const username = sessionUsername(request, init);
    if (!username) return makeError('未授权', 401);
    return makeJson({ enabled: Boolean(state.twoFactorByUser[username]) });
  }

  if (path === '/api/auth/two-factor' && method === 'PUT') {
    const username = sessionUsername(request, init);
    if (!username) return makeError('未授权', 401);
    const enabled = Boolean(body.enabled);
    state.twoFactorByUser[username] = enabled;
    writeState(storageKey, state);
    return makeJson({ enabled });
  }

  if (path === '/api/auth/forgot-password/code' && method === 'POST') {
    const target = String(body.target ?? '').trim();
    if (!target) return makeError('请输入邮箱或手机号', 400);
    const channel = String(body.channel ?? '').toLowerCase() === 'email' || target.includes('@') ? 'email' : 'phone';
    state.pendingForgot[`${channel}:${target.toLowerCase()}`] = DEMO_OTP_CODE;
    writeState(storageKey, state);
    return makeJson({ sentTo: target });
  }

  if (path === '/api/auth/forgot-password' && method === 'POST') {
    const target = String(body.target ?? '').trim();
    const code = String(body.code ?? '');
    const password = String(body.password ?? '');
    const channel = String(body.channel ?? '').toLowerCase() === 'email' || target.includes('@') ? 'email' : 'phone';
    const pending = state.pendingForgot[`${channel}:${target.toLowerCase()}`];
    if (!target) return makeError('请输入邮箱或手机号', 400);
    if (!pending || code !== DEMO_OTP_CODE) return makeError('验证码错误', 400);
    if (password.length < 6) return makeError('密码长度不能少于 6 位', 400);
    const username = resolveForgotUsername(channel, target);
    if (state.passwords[username] !== undefined) {
      state.passwords[username] = password;
    }
    delete state.pendingForgot[`${channel}:${target.toLowerCase()}`];
    writeState(storageKey, state);
    return makeJson({ message: '密码重置成功' });
  }

  if (path === '/api/auth/register' && method === 'POST') {
    return makeJson({ username: String(body.username ?? 'demo-user') }, { status: 201 });
  }

  if (path === '/api/auth/change-password' && method === 'POST') return makeJson({ message: '密码修改成功' });
  if (path === '/api/auth/logout' && method === 'POST') return makeJson({ message: '退出成功' });

  if (path === '/api/menus/schema' && method === 'GET') {
    const username = sessionUsername(request, init);
    if (!username) return makeError('未授权', 401);
    return makeJson(cloneMenuSchemaPayload(state.menuSchema));
  }

  if (path === '/api/menus/nodes' && method === 'POST') {
    const denied = requireMenuPermission(state, request, init, 'menu:create');
    if (denied) return denied;
    const result = createMenuNode(state.menuSchema, body as MockMenuNodeWrite);
    if (!result.ok) return makeError(result.message, result.status);
    writeState(storageKey, state);
    return makeJson(result.node, { status: 201 });
  }

  const menuNodeMatch = path.match(/^\/api\/menus\/nodes\/([^/]+)$/);
  if (menuNodeMatch) {
    const key = decodeURIComponent(menuNodeMatch[1]);
    if (method === 'PUT') {
      const denied = requireMenuPermission(state, request, init, 'menu:edit');
      if (denied) return denied;
      const result = updateMenuNode(state.menuSchema, key, body as MockMenuNodeWrite);
      if (!result.ok) return makeError(result.message, result.status);
      writeState(storageKey, state);
      return makeJson(result.node);
    }
    if (method === 'DELETE') {
      const denied = requireMenuPermission(state, request, init, 'menu:delete');
      if (denied) return denied;
      const result = deleteMenuNode(state.menuSchema, key);
      if (!result.ok) return makeError(result.message, result.status);
      writeState(storageKey, state);
      return makeJson({ message: result.message });
    }
  }

  if (path === '/api/auth/permissions' && method === 'GET') {
    const username = sessionUsername(request, init);
    const accountPermissions =
      username === 'demo'
        ? permissions.filter((item) => DEMO_ACCOUNT_PERMISSIONS.includes(item.code))
        : username === 'admin'
          ? permissions
          : [];
    return makeJson({ username, permissions: accountPermissions });
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

  if (path === '/api/notifications' && method === 'POST') {
    const title = String(body.title ?? '').trim();
    if (!title) return makeError('标题不能为空', 400);
    const groupKey = String(body.groupKey ?? '').trim().toLowerCase();
    if (!['ops', 'security', 'release'].includes(groupKey)) {
      return makeError('无效的通知分组', 400);
    }
    const toastType = String(body.toastType ?? '').trim().toLowerCase();
    if (!['info', 'success', 'warning', 'error'].includes(toastType)) {
      return makeError('无效的通知类型', 400);
    }
    const rawLink = body.linkUrl == null ? '' : String(body.linkUrl).trim();
    if (rawLink && !(rawLink.startsWith('/') && !rawLink.startsWith('//'))) {
      return makeError('通知链接必须是站内路径', 400);
    }
    const now = new Date().toISOString();
    const meta = body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta)
      ? Object.fromEntries(
          Object.entries(body.meta as Record<string, unknown>)
            .filter(([key, value]) => key.trim() && value != null)
            .map(([key, value]) => [key.trim(), String(value)]),
        )
      : {};
    const item: NotificationItem = {
      id: `notif-${Date.now().toString(36)}-${state.nextMessageSeq++}`,
      groupKey: groupKey as NotificationItem['groupKey'],
      title,
      description: String(body.description ?? '').trim(),
      time: now,
      read: false,
      toastType: toastType as NotificationItem['toastType'],
      meta,
      linkUrl: rawLink || null,
    };
    state.notifications.unshift(item);
    writeState(storageKey, state);
    return makeJson({
      ...item,
      createdAt: now,
      readAt: null,
      updatedAt: null,
    });
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
    const items = filterAuditLogs(state.auditLogs, url);
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
    const format = parseExportFormat(url);
    if (format instanceof Response) return format;
    const fields = parseExportFields(url.searchParams.get('fields'), AUDIT_EXPORT_FIELDS);
    const items = filterAuditLogs(state.auditLogs, url);
    const rows = items.map((item) => ({
      id: item.id,
      stream: item.stream,
      category: item.category,
      eventType: item.eventType,
      occurredAtUtc: item.occurredAtUtc,
      traceId: item.traceId,
      title: item.title,
      description: item.description,
      actor: item.actor,
    }));
    return makeExportFile(rows, fields, format, 'audit-logs');
  }

  if (path === '/api/export/reports' && method === 'GET') {
    const reportType = (url.searchParams.get('type') ?? '').trim().toLowerCase();
    if (!REPORT_TYPES.includes(reportType as (typeof REPORT_TYPES)[number])) {
      return makeError(`不支持的报表类型，可选值：${REPORT_TYPES.join(', ')}`, 400);
    }
    const format = parseExportFormat(url);
    if (format instanceof Response) return format;
    const fields = parseExportFields(url.searchParams.get('fields'), REPORT_FIELDS);
    const includeKpi = fields.some((field) => REPORT_KPI_FIELDS.includes(field));
    const includeChannel = fields.some((field) => REPORT_CHANNEL_FIELDS.includes(field));
    const rows: Array<Record<string, unknown>> = [];
    if (includeKpi || !includeChannel) {
      const kpi = REPORT_KPI[reportType as (typeof REPORT_TYPES)[number]];
      rows.push({
        section: 'kpi',
        visits: kpi.visits,
        orders: kpi.orders,
        conversionRate: kpi.conversionRate,
        revenue: kpi.revenue,
        channel: '',
        channelVisits: '',
        channelOrders: '',
        channelRate: '',
        channelAmount: '',
      });
    }
    if (includeChannel || !includeKpi) {
      for (const channel of REPORT_CHANNELS) {
        rows.push({
          section: 'channel',
          visits: '',
          orders: '',
          conversionRate: '',
          revenue: '',
          ...channel,
        });
      }
    }
    return makeExportFile(rows, fields, format, 'reports');
  }

  if (path === '/api/export/overview' && method === 'GET') {
    const format = parseExportFormat(url);
    if (format instanceof Response) return format;
    const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? '7') || 7, 1), 90);
    const rows: Array<Record<string, unknown>> = [
      { section: 'overview', key: 'totalUsers', label: '总用户数', value: String(state.users.length) },
      { section: 'overview', key: 'activeUsers', label: '活跃用户', value: String(state.users.filter((item) => item.status === 0).length) },
      { section: 'overview', key: 'disabledUsers', label: '禁用用户', value: String(state.users.filter((item) => item.status !== 0).length) },
      { section: 'overview', key: 'totalRoles', label: '总角色数', value: String(state.roles.length) },
      { section: 'overview', key: 'totalPermissions', label: '总权限数', value: String(permissions.length) },
    ];
    for (let index = 0; index < days; index += 1) {
      const date = new Date(Date.now() - (days - index - 1) * 86400000).toISOString().slice(0, 10);
      rows.push({
        section: 'trend',
        key: date,
        label: date,
        value: String(2 + index + (index % 3)),
      });
    }
    return makeExportFile(rows, OVERVIEW_FIELDS, format, 'overview');
  }

  if (path.startsWith('/api/export/') && method === 'GET') {
    const entity = path.split('/').pop() ?? 'data';
    const format = parseExportFormat(url);
    if (format instanceof Response) return format;
    return makeBlob(`entity,id,name\n${entity},1,static-demo\n`, `${entity}.${format}`);
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

  const TICKET_STATUSES: TicketStatus[] = ['open', 'accepted', 'progress', 'resolved', 'closed'];
  const TICKET_PRIORITIES: TicketPriority[] = ['high', 'medium', 'low'];
  const COMMENT_TARGETS: CommentTargetType[] = ['ticket', 'project'];

  if (path === '/api/approvals' && method === 'GET') {
    const username = sessionUsername(request, init);
    if (!username) return makeError('未授权', 401);
    const listed = listApprovals(
      state.approvals,
      username,
      url.searchParams.get('lane'),
      url.searchParams.get('keyword'),
    );
    if (listed.error) return makeError(listed.error, 400);
    return makeJson(pageItems(listed.items, url, 50));
  }

  if (path === '/api/approvals' && method === 'POST') {
    const username = sessionUsername(request, init);
    if (!username) return makeError('未授权', 401);
    const created = createApproval(
      state.approvals,
      state.nextApprovalNumber,
      username,
      body as {
        title?: string;
        category?: string;
        reason?: string;
        amount?: string;
        ticketId?: string;
        assignee?: string;
        cc?: string[];
      },
      nowTicketLabel(),
    );
    if (created.error || !created.detail) return makeError(created.error ?? '创建失败', 400);
    state.nextApprovalNumber = created.nextNumber;
    writeState(storageKey, state);
    return makeJson(created.detail, { status: 201 });
  }

  const approvalActionMatch = path.match(/^\/api\/approvals\/([^/]+)\/actions$/);
  if (approvalActionMatch && method === 'POST') {
    const username = sessionUsername(request, init);
    if (!username) return makeError('未授权', 401);
    const result = applyApprovalAction(
      state.approvals,
      decodeURIComponent(approvalActionMatch[1]),
      username,
      body as { action?: string; comment?: string; transferTo?: string },
      nowTicketLabel(),
    );
    if (!result.ok) return makeError(result.message, result.status);
    if (result.ticketId && result.ticketStatus) {
      const ticket = state.tickets.find((item) => item.id === result.ticketId);
      if (ticket && ticket.status !== result.ticketStatus) {
        ticket.status = result.ticketStatus as TicketStatus;
        ticket.updatedAt = nowTicketLabel();
      }
    }
    writeState(storageKey, state);
    return makeJson(result.detail);
  }

  const approvalMatch = path.match(/^\/api\/approvals\/([^/]+)$/);
  if (approvalMatch && method === 'GET') {
    const username = sessionUsername(request, init);
    if (!username) return makeError('未授权', 401);
    const detail = getApproval(state.approvals, decodeURIComponent(approvalMatch[1]));
    return detail ? makeJson(detail) : makeError('审批实例不存在', 404);
  }

  if (path === '/api/tickets' && method === 'GET') {
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase();
    const status = url.searchParams.get('status')?.trim().toLowerCase();
    if (status && !TICKET_STATUSES.includes(status as TicketStatus)) {
      return makeError('无效的工单状态', 400);
    }
    let items = [...state.tickets];
    if (status) items = items.filter((item) => item.status === status);
    if (keyword) {
      items = items.filter((item) => `${item.title} ${item.requester} ${item.id}`.toLowerCase().includes(keyword));
    }
    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id));
    return makeJson(pageTickets(items, url));
  }

  if (path === '/api/tickets' && method === 'POST') {
    const title = String(body.title ?? '').trim();
    if (!title) return makeError('工单标题不能为空', 400);
    const priority = String(body.priority ?? 'medium').trim().toLowerCase();
    if (!TICKET_PRIORITIES.includes(priority as TicketPriority)) return makeError('无效的工单优先级', 400);
    const stamp = nowTicketLabel();
    const item: TicketItem = {
      id: `TK-${state.nextTicketNumber++}`,
      title,
      requester: actorName(state, request, init),
      category: String(body.category ?? '缺陷').trim() || '缺陷',
      priority: priority as TicketPriority,
      status: 'open',
      createdAt: stamp,
      updatedAt: stamp,
      satisfaction: 0,
      description: String(body.description ?? '').trim() || '（无描述）',
      messages: [],
    };
    state.tickets.unshift(item);
    writeState(storageKey, state);
    return makeJson(item);
  }

  const ticketMessageMatch = path.match(/^\/api\/tickets\/([^/]+)\/messages$/);
  if (ticketMessageMatch && method === 'POST') {
    const item = state.tickets.find((ticket) => ticket.id === decodeURIComponent(ticketMessageMatch[1]));
    if (!item) return makeError('工单不存在', 404);
    const content = String(body.content ?? '').trim();
    if (!content) return makeError('消息内容不能为空', 400);
    const stamp = nowTicketLabel();
    item.messages = [
      ...item.messages,
      { id: nextMockId(state, 'm'), content, direction: 'self', time: stamp },
      { id: nextMockId(state, 'm'), content: '收到，我们会尽快跟进本工单（演示自动回复）。', direction: 'other', time: stamp },
    ];
    item.updatedAt = stamp;
    writeState(storageKey, state);
    return makeJson(item);
  }

  const ticketMatch = path.match(/^\/api\/tickets\/([^/]+)$/);
  if (ticketMatch && method === 'GET') {
    const item = state.tickets.find((ticket) => ticket.id === decodeURIComponent(ticketMatch[1]));
    return item ? makeJson(item) : makeError('工单不存在', 404);
  }

  if (ticketMatch && method === 'PUT') {
    const item = state.tickets.find((ticket) => ticket.id === decodeURIComponent(ticketMatch[1]));
    if (!item) return makeError('工单不存在', 404);
    if (body.priority != null) {
      const priority = String(body.priority).trim().toLowerCase();
      if (!TICKET_PRIORITIES.includes(priority as TicketPriority)) return makeError('无效的工单优先级', 400);
      item.priority = priority as TicketPriority;
    }
    if (body.status != null) {
      const status = String(body.status).trim().toLowerCase();
      if (!TICKET_STATUSES.includes(status as TicketStatus)) return makeError('无效的工单状态', 400);
      item.status = status as TicketStatus;
    }
    if (body.title != null) {
      const title = String(body.title).trim();
      if (!title) return makeError('工单标题不能为空', 400);
      item.title = title;
    }
    if (body.category != null) item.category = String(body.category).trim() || item.category;
    if (body.description != null) item.description = String(body.description).trim() || '（无描述）';
    if (typeof body.satisfaction === 'number') item.satisfaction = body.satisfaction;
    item.updatedAt = nowTicketLabel();
    writeState(storageKey, state);
    return makeJson(item);
  }

  if (path === '/api/chat/messages' && method === 'GET') {
    return makeJson(state.chatMessages);
  }

  if (path === '/api/chat/messages' && method === 'POST') {
    const content = String(body.content ?? '').trim();
    if (!content) return makeError('消息内容不能为空', 400);
    const now = new Date().toISOString();
    state.chatMessages = [
      ...state.chatMessages,
      { id: nextMockId(state, 'chat'), content, direction: 'self', time: now },
      {
        id: nextMockId(state, 'chat'),
        content: `已收到你的消息：“${content}”。这是演示客服坞，稍后会有同事跟进（ChatWindow 组件示例）。`,
        direction: 'other',
        time: now,
      },
    ];
    writeState(storageKey, state);
    return makeJson(state.chatMessages);
  }

  if (path === '/api/comments' && method === 'GET') {
    const targetType = url.searchParams.get('targetType')?.trim().toLowerCase();
    const targetId = url.searchParams.get('targetId')?.trim();
    if (!targetType || !COMMENT_TARGETS.includes(targetType as CommentTargetType)) {
      return makeError('无效的评论目标类型', 400);
    }
    if (!targetId) return makeError('目标 ID 不能为空', 400);
    const items = state.comments
      .filter((item) => item.targetType === targetType && item.targetId === targetId)
      .map(toCommentResponse);
    return makeJson(items);
  }

  if (path === '/api/comments' && method === 'POST') {
    const targetType = String(body.targetType ?? '').trim().toLowerCase();
    const targetId = String(body.targetId ?? '').trim();
    const content = String(body.body ?? '').trim();
    if (!COMMENT_TARGETS.includes(targetType as CommentTargetType)) {
      return makeError('无效的评论目标类型', 400);
    }
    if (!targetId) return makeError('目标 ID 不能为空', 400);
    if (!content) return makeError('评论内容不能为空', 400);
    const item: CommentItem = {
      id: nextMockId(state, 'c'),
      targetType: targetType as CommentTargetType,
      targetId,
      content,
      user: { name: actorName(state, request, init) },
      time: nowTicketLabel(),
    };
    state.comments.push(item);
    writeState(storageKey, state);
    return makeJson(toCommentResponse(item));
  }

  const PROJECT_STATUSES: ProjectStatus[] = ['planning', 'active', 'paused', 'done'];
  const CALENDAR_TYPES: CalendarEventType[] = ['meeting', 'review', 'release', 'reminder'];
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const timePattern = /^\d{2}:\d{2}$/;

  if (path === '/api/projects' && method === 'GET') {
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase();
    const status = url.searchParams.get('status')?.trim().toLowerCase();
    if (status && !PROJECT_STATUSES.includes(status as ProjectStatus)) {
      return makeError('无效的项目状态', 400);
    }
    let items = [...state.projects];
    if (status) items = items.filter((item) => item.status === status);
    if (keyword) {
      items = items.filter((item) => `${item.name} ${item.owner} ${item.id}`.toLowerCase().includes(keyword));
    }
    items.sort((a, b) => a.id.localeCompare(b.id));
    return makeJson(pageItems(items, url, 6));
  }

  const projectMatch = path.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch && method === 'GET') {
    const item = state.projects.find((project) => project.id === decodeURIComponent(projectMatch[1]));
    return item ? makeJson(item) : makeError('项目不存在', 404);
  }

  if (path === '/api/calendar/events' && method === 'GET') {
    const from = url.searchParams.get('from')?.trim();
    const to = url.searchParams.get('to')?.trim();
    if (from && !datePattern.test(from)) return makeError('开始日期格式无效，需为 YYYY-MM-DD', 400);
    if (to && !datePattern.test(to)) return makeError('结束日期格式无效，需为 YYYY-MM-DD', 400);
    if (from && to && from > to) return makeError('开始日期不能晚于结束日期', 400);
    let items = [...state.calendarEvents];
    if (from) items = items.filter((item) => item.date >= from);
    if (to) items = items.filter((item) => item.date <= to);
    items.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
    return makeJson(items);
  }

  if (path === '/api/calendar/events' && method === 'POST') {
    const title = String(body.title ?? '').trim();
    if (!title) return makeError('日程标题不能为空', 400);
    const date = String(body.date ?? '').trim();
    if (!datePattern.test(date)) return makeError('日期格式无效，需为 YYYY-MM-DD', 400);
    const start = String(body.start ?? '').trim();
    if (!timePattern.test(start)) return makeError('开始时间格式无效，需为 HH:mm', 400);
    const end = String(body.end ?? '').trim();
    if (!timePattern.test(end)) return makeError('结束时间格式无效，需为 HH:mm', 400);
    const type = String(body.type ?? '').trim().toLowerCase();
    if (!CALENDAR_TYPES.includes(type as CalendarEventType)) return makeError('无效的日程类型', 400);
    const location = String(body.location ?? '').trim() || '—';
    const item: CalendarEventItem = {
      id: nextMockId(state, 'e'),
      date,
      start,
      end,
      title,
      type: type as CalendarEventType,
      location,
    };
    state.calendarEvents.push(item);
    writeState(storageKey, state);
    return makeJson(item);
  }

  if (path === '/api/content/articles' && method === 'GET') {
    const items = [...state.articles].sort((a, b) => a.id.localeCompare(b.id));
    return makeJson(items);
  }

  const articleMatch = path.match(/^\/api\/content\/articles\/([^/]+)$/);
  if (articleMatch && method === 'GET') {
    const item = state.articles.find((article) => article.id === decodeURIComponent(articleMatch[1]));
    return item ? makeJson(item) : makeError('文章不存在', 404);
  }

  if (articleMatch && method === 'PUT') {
    const item = state.articles.find((article) => article.id === decodeURIComponent(articleMatch[1]));
    if (!item) return makeError('文章不存在', 404);
    const published = typeof body.published === 'boolean' ? body.published : item.published;
    const title = body.title == null ? item.title : String(body.title).trim();
    if (published && !title) return makeError('内容标题不能为空', 400);
    const editorType = body.editorType == null
      ? item.editorType
      : String(body.editorType).trim().toLowerCase();
    if (!ARTICLE_EDITOR_TYPES.includes(editorType as ArticleEditorType)) {
      return makeError('无效的编辑器类型', 400);
    }
    const tags = body.tags == null ? item.tags : normalizeStringList(body.tags, 40, 12);
    if (!tags) return makeError('标签最多 12 个，且单项长度不能超过 40', 400);
    const column = body.column == null ? item.column : normalizeStringList(body.column, 40, 8);
    if (!column) return makeError('栏目路径无效', 400);
    item.title = title;
    item.editorType = editorType as ArticleEditorType;
    if (body.body != null) item.body = String(body.body);
    item.tags = tags;
    if (body.category != null) item.category = String(body.category).trim();
    item.column = column;
    item.published = published;
    writeState(storageKey, state);
    return makeJson(item);
  }

  if (path === '/api/jobs' && method === 'GET') {
    const items = [...state.jobs].sort((a, b) => a.id.localeCompare(b.id));
    return makeJson(items);
  }

  if (path === '/api/jobs' && method === 'POST') {
    const name = String(body.name ?? '').trim();
    if (!name) return makeError('任务名称不能为空', 400);
    const enabled = body.enabled !== false;
    const item: JobItem = {
      id: `JOB-${state.nextJobNumber++}`,
      name,
      cron: String(body.cron ?? '0 2 * * *').trim() || '0 2 * * *',
      concurrency: Math.min(20, Math.max(1, Number(body.concurrency ?? 2) || 2)),
      timeout: String(body.timeout ?? '60').trim() || '60',
      batchSize: String(body.batchSize ?? '500').trim() || '500',
      enabled,
      status: enabled ? 'running' : 'paused',
      lastRun: '—',
      nextRun: enabled ? '待调度' : '—',
      progress: 0,
      phase: 0,
      start: '2026-07-01',
      end: '2026-07-02',
      color: '#3b82f6',
    };
    state.jobs.push(item);
    writeState(storageKey, state);
    return makeJson(item);
  }

  const jobMatch = path.match(/^\/api\/jobs\/([^/]+)$/);
  if (jobMatch && method === 'PUT') {
    const item = state.jobs.find((job) => job.id === decodeURIComponent(jobMatch[1]));
    if (!item) return makeError('任务不存在', 404);
    if (body.name != null) {
      const name = String(body.name).trim();
      if (!name) return makeError('任务名称不能为空', 400);
      item.name = name;
    }
    if (body.cron != null) item.cron = String(body.cron).trim() || item.cron;
    if (body.concurrency != null) {
      item.concurrency = Math.min(20, Math.max(1, Number(body.concurrency) || item.concurrency));
    }
    if (body.timeout != null) item.timeout = String(body.timeout).trim() || item.timeout;
    if (body.batchSize != null) item.batchSize = String(body.batchSize).trim() || item.batchSize;
    const wasEnabled = item.enabled;
    if (typeof body.enabled === 'boolean') item.enabled = body.enabled;
    if (body.status != null) {
      const status = String(body.status).trim().toLowerCase();
      if (JOB_STATUSES.includes(status as JobStatus) && item.enabled && wasEnabled && item.status !== 'failed') {
        item.status = status as JobStatus;
      }
    }
    applyJobStatusMachine(item, wasEnabled);
    writeState(storageKey, state);
    return makeJson(item);
  }

  if (path === '/api/import-jobs' && method === 'POST') {
    const source = String(body.source ?? '').trim() || '示例数据（未选择文件）';
    const target = normalizeStringList(body.target, 40, 8);
    if (!target || target.length === 0) return makeError('请选择目标数据表', 400);
    const mappings = normalizeStringList(body.mappings, 40, 50);
    if (!mappings || mappings.length === 0) return makeError('请至少映射一个字段', 400);
    const mode = String(body.mode ?? 'append').trim().toLowerCase();
    if (!IMPORT_MODES.includes(mode as ImportMode)) return makeError('无效的导入模式', 400);
    const conflict = String(body.conflict ?? 'skip').trim().toLowerCase();
    if (!IMPORT_CONFLICTS.includes(conflict as ImportConflict)) return makeError('无效的冲突策略', 400);
    const batchSize = Number(body.batchSize ?? 1000);
    if (!Number.isFinite(batchSize) || batchSize < 100 || batchSize > 5000) {
      return makeError('批量大小需在 100-5000 之间', 400);
    }
    const item: ImportJobItem = {
      id: `IMP-${state.nextImportJobNumber++}`,
      source,
      target,
      mappings,
      mode: mode as ImportMode,
      conflict: conflict as ImportConflict,
      batchSize,
      status: 'running',
      progress: 0,
      result: null,
    };
    state.importJobs.push(item);
    writeState(storageKey, state);
    window.setTimeout(() => {
      const current = readState(storageKey);
      const found = current.importJobs.find((job) => job.id === item.id);
      if (found) {
        advanceImportJob(found);
        writeState(storageKey, current);
      }
    }, 220);
    return makeJson(item);
  }

  const importMatch = path.match(/^\/api\/import-jobs\/([^/]+)$/);
  if (importMatch && method === 'GET') {
    const item = state.importJobs.find((job) => job.id === decodeURIComponent(importMatch[1]));
    if (!item) return makeError('导入任务不存在', 404);
    advanceImportJob(item);
    writeState(storageKey, state);
    return makeJson(item);
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
