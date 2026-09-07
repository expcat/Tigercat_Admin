export type MockMenuSchemaNode = {
  key: string;
  label?: string;
  icon?: string;
  path?: string;
  permission?: string | string[];
  hideInMenu?: boolean;
  children?: MockMenuSchemaNode[];
};

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
    children: [pageNodes.tickets, pageNodes.calendar],
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

export const MOCK_MENU_SCHEMA_PAYLOAD = {
  items: MOCK_MENU_SCHEMA_ITEMS,
  bottomItems: MOCK_MENU_SCHEMA_BOTTOM_ITEMS,
};
