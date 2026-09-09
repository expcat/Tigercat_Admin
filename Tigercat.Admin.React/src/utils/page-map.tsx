import { lazy, type LazyExoticComponent, type ComponentType } from 'react';

/**
 * Lazy pageMap for mixed schema routing.
 * Keyed by MenuSchemaNode.key (schemaToRouteRecords `name`).
 * Parametric extras (`/projects/:id`, `/approvals/:id`) stay static in App routes.
 */
export const SHELL_PAGE_MAP = {
  home: lazy(() => import('../pages/HomePage')),
  analytics: lazy(() => import('../pages/AnalyticsPage')),
  monitor: lazy(() => import('../pages/MonitorPage')),
  projects: lazy(() => import('../pages/ProjectsPage')),
  tickets: lazy(() => import('../pages/TicketsPage')),
  approvals: lazy(() => import('../pages/ApprovalsPage')),
  workflowDesigner: lazy(() => import('../pages/WorkflowDesignerPage')),
  calendar: lazy(() => import('../pages/CalendarPage')),
  content: lazy(() => import('../pages/ContentPage')),
  gallery: lazy(() => import('../pages/GalleryPage')),
  jobs: lazy(() => import('../pages/JobsPage')),
  import: lazy(() => import('../pages/ImportPage')),
  performance: lazy(() => import('../pages/PerformancePage')),
  help: lazy(() => import('../pages/HelpPage')),
  reports: lazy(() => import('../pages/ReportsPage')),
  users: lazy(() => import('../pages/UsersPage')),
  roles: lazy(() => import('../pages/RolesPage')),
  menus: lazy(() => import('../pages/MenusPage')),
  permissionDemo: lazy(() => import('../pages/PermissionDemoPage')),
  settings: lazy(() => import('../pages/SettingsPage')),
  files: lazy(() => import('../pages/FilesPage')),
  notifications: lazy(() => import('../pages/NotificationsPage')),
  tasks: lazy(() => import('../pages/TasksPage')),
  audit: lazy(() => import('../pages/AuditLogsPage')),
  about: lazy(() => import('../pages/AboutPage')),
  profile: lazy(() => import('../pages/ProfilePage')),
} satisfies Record<string, LazyExoticComponent<ComponentType>>;

export type ShellPageMapKey = keyof typeof SHELL_PAGE_MAP;

export type ShellPageComponent = LazyExoticComponent<ComponentType>;

export const SHELL_IFRAME_PAGE: ShellPageComponent = lazy(
  () => import('../pages/IframePage'),
);
