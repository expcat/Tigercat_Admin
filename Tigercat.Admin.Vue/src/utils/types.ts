export interface Session {
  token: string;
  username: string;
  expiresAt: string;
}

export interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

export interface PermissionInfo {
  id: number;
  code: string;
  description: string | null;
}

export interface UserPermissions {
  username: string;
  permissions: PermissionInfo[];
}

// ---- P2: Shared CRUD types ----

export interface RoleInfo {
  id: number;
  name: string;
}

export interface UserItem {
  id: number;
  username: string;
  displayName: string | null;
  status: number;
  avatarMediaId: number | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  roles: RoleInfo[];
}

export interface RoleUserInfo {
  id: number;
  username: string;
  displayName: string | null;
}

export interface RoleItem {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  permissions: PermissionInfo[];
  users: RoleUserInfo[];
}

export interface PagedResult<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MessageResult {
  message?: string;
}

// ---- P3: Stats types ----

export interface StatsOverview {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  totalRoles: number;
  totalPermissions: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface StatsTrend {
  points: TrendPoint[];
}

// ---- P4: Settings types ----

export interface SettingItem {
  id: number;
  key: string;
  value: string;
  defaultValue: string;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface MediaReference {
  id: number;
  referenceType: string;
  referenceKey: string;
  displayName: string | null;
}

export interface MediaItem {
  id: number;
  publicId: string;
  originalFileName: string;
  contentType: string;
  extension: string | null;
  sizeBytes: number;
  url: string;
  uploadedBy: string | null;
  createdAt: string;
  referenceCount: number;
}

export interface MediaDetail extends Omit<MediaItem, 'referenceCount'> {
  references: MediaReference[];
}

export interface AuditLogItem {
  id: string;
  stream: string;
  category: 'auth' | 'user' | 'system';
  eventType: string;
  occurredAtUtc: string;
  traceId: string | null;
  title: string;
  description: string;
  actor: string | null;
  data: Record<string, string | null>;
}

export type AdminNotificationGroupKey = 'ops' | 'security' | 'release';

export type AdminNotificationToastType =
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export interface AdminNotificationItem {
  id: string;
  groupKey: AdminNotificationGroupKey;
  title: string;
  description: string;
  time: string;
  read: boolean;
  toastType: AdminNotificationToastType;
  meta: Record<string, string>;
}

export type AdminTaskPriority = 'low' | 'medium' | 'high';

export type AdminTaskStatus = 'backlog' | 'todo' | 'doing' | 'review' | 'done';

export interface AdminTaskBoardCard {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  priority: AdminTaskPriority;
  status: AdminTaskStatus;
  dueAt: string;
  estimateHours: number;
  blocked?: boolean;
}

export interface AdminTaskBoardColumn {
  id: AdminTaskStatus | string;
  title: string;
  description?: string;
  wipLimit?: number;
  cards: AdminTaskBoardCard[];
}

// ---- Theme types ----

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemePreferences {
  mode: ThemeMode;
  primaryColor: string;
  compactMode: boolean;
}
