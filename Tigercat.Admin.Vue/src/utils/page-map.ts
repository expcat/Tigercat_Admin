/**
 * Lazy pageMap for mixed schema routing.
 * Keyed by MenuSchemaNode.key (schemaToRouteRecords `name`).
 * Parametric extras (`/projects/:id`, `/approvals/:id`) stay static in the router.
 */
export const SHELL_PAGE_MAP = {
  home: () => import('../pages/HomePage.vue'),
  analytics: () => import('../pages/AnalyticsPage.vue'),
  monitor: () => import('../pages/MonitorPage.vue'),
  projects: () => import('../pages/ProjectsPage.vue'),
  tickets: () => import('../pages/TicketsPage.vue'),
  approvals: () => import('../pages/ApprovalsPage.vue'),
  calendar: () => import('../pages/CalendarPage.vue'),
  content: () => import('../pages/ContentPage.vue'),
  gallery: () => import('../pages/GalleryPage.vue'),
  jobs: () => import('../pages/JobsPage.vue'),
  import: () => import('../pages/ImportPage.vue'),
  performance: () => import('../pages/PerformancePage.vue'),
  help: () => import('../pages/HelpPage.vue'),
  reports: () => import('../pages/ReportsPage.vue'),
  users: () => import('../pages/UsersPage.vue'),
  roles: () => import('../pages/RolesPage.vue'),
  menus: () => import('../pages/MenusPage.vue'),
  permissionDemo: () => import('../pages/PermissionDemoPage.vue'),
  settings: () => import('../pages/SettingsPage.vue'),
  files: () => import('../pages/FilesPage.vue'),
  notifications: () => import('../pages/NotificationsPage.vue'),
  tasks: () => import('../pages/TasksPage.vue'),
  audit: () => import('../pages/AuditLogsPage.vue'),
  about: () => import('../pages/AboutPage.vue'),
  profile: () => import('../pages/ProfilePage.vue'),
} as const;

export type ShellPageMapKey = keyof typeof SHELL_PAGE_MAP;

export const SHELL_IFRAME_PAGE = () => import('../pages/IframePage.vue');
