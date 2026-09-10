import type { MenuSchema } from '@expcat/tigercat-core';

export interface Session {
  token: string;
  username: string;
  expiresAt: string;
}

export interface LoginData {
  requiresTwoFactor?: boolean;
  token?: string;
  username?: string;
  expiresAt?: string;
  challengeId?: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
}

export type ForgotChannel = 'email' | 'phone';

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

export interface MenuSchemaPayload {
  items: MenuSchema;
  bottomItems: MenuSchema;
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
}

export interface MediaDetail extends Omit<MediaItem, 'referenceCount'> {
  references: MediaReference[];
}

export interface DuplicateMediaResult {
  existing: MediaItem;
}

export type ReportType = 'daily' | 'weekly' | 'monthly';

export type ReportExportField =
  | 'visits'
  | 'orders'
  | 'conversionRate'
  | 'revenue'
  | 'channel'
  | 'channelVisits'
  | 'channelOrders'
  | 'channelRate'
  | 'channelAmount';

export type AuditExportField =
  | 'id'
  | 'title'
  | 'eventType'
  | 'category'
  | 'occurredAtUtc'
  | 'actor'
  | 'description';

export interface ExportFieldOption<T extends string = string> {
  key: T;
  label: string;
}

export interface AuditLogItem {
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
  linkUrl?: string | null;
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
  blockedReason?: string | null;
  completionNote?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  completedAt?: string | null;
}

export interface AdminTaskBoardColumn {
  id: AdminTaskStatus | string;
  title: string;
  description?: string;
  wipLimit?: number;
  cards: AdminTaskBoardCard[];
}

export interface AuditRetentionPolicy {
  retentionDays: number;
  updatedAtUtc: string;
}

export interface AuditRetentionCleanupResult {
  dryRun: boolean;
  retentionDays: number;
  cutoffUtc: string;
  matchedCount: number;
  deletedCount: number;
}

export type TicketStatus = 'open' | 'accepted' | 'progress' | 'resolved' | 'closed';

export type TicketPriority = 'high' | 'medium' | 'low';

export type ChatDirection = 'self' | 'other';

export type CommentTargetType = 'ticket' | 'project';

export interface TicketMessage {
  id: string;
  content: string;
  direction: ChatDirection;
  time: string;
}

export interface Ticket {
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
  messages: TicketMessage[];
}

export interface ChatMessageItem {
  id: string;
  content: string;
  direction: ChatDirection;
  time: string;
}

export interface CommentUser {
  name: string;
}

export interface CommentItem {
  id: string;
  content: string;
  user: CommentUser;
  time: string;
}

export interface CreateTicketPayload {
  title: string;
  category?: string;
  priority?: TicketPriority;
  description?: string;
}

export interface UpdateTicketPayload {
  title?: string;
  category?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  description?: string;
  satisfaction?: number;
}

export type ApprovalLane = 'todo' | 'done' | 'cc' | 'started';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'canceled';

export type ApprovalAction =
  | 'approve'
  | 'reject'
  | 'transfer'
  | 'addsign'
  | 'return'
  | 'cancel'
  | 'withdraw'
  | 'comment'
  | 'request_changes';

export interface ApprovalActor {
  id?: string;
  name?: string;
  status?: string;
}

export interface ApprovalStep {
  key: string;
  title?: string;
  status?: string;
  actor?: ApprovalActor;
  actors?: ApprovalActor[];
  action?: string;
  comment?: string;
  time?: string;
  order?: number;
  children?: ApprovalStep[];
  kind?: string;
  signMode?: string;
  rollbackPoint?: boolean;
  temporary?: boolean;
  returnTarget?: boolean;
  origin?: {
    type?: string;
    position?: string;
    fromNodeKey?: string;
    fromTaskId?: string;
  };
  buttonPolicy?: ApprovalButtonPolicy;
  fieldPermissions?: Record<string, string>;
}

export interface ApprovalButtonConfig {
  action: string;
  enabled?: boolean;
  label?: string;
  commentRequired?: boolean;
  placement?: string;
}

export interface ApprovalButtonPolicy {
  buttons?: ApprovalButtonConfig[];
  addsign?: { positions?: string[] };
  returnResume?: string;
}

export interface ApprovalReturnTarget {
  key: string;
  title?: string;
  kind?: string;
  actorName?: string;
  status?: string;
}

export interface ApprovalContactUser {
  id: string;
  name: string;
  username: string;
  deptId: string;
  deptName: string;
  roleKeys: string[];
  groupKeys: string[];
  managerId?: string | null;
}

export interface ApprovalFormField {
  label: string;
  value: string;
}

export interface ApprovalListItem {
  id: string;
  title: string;
  category: string;
  ticketId?: string | null;
  starter: string;
  assignee: string;
  cc: string[];
  status: ApprovalStatus;
  currentStepKey?: string;
  currentStepTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalTask {
  id: string;
  nodeKey: string;
  assignee: ApprovalActor;
  status: string;
  action?: string;
  comment?: string;
  actedAt?: string;
  origin?: string;
}

export interface ApprovalHistoryEntry {
  at: string;
  actorId: string;
  action: string;
  comment?: string;
  nodeKey?: string;
  taskId?: string;
}

export interface ApprovalDetail extends ApprovalListItem {
  reason: string;
  amount?: string | null;
  formFields: ApprovalFormField[];
  steps: ApprovalStep[];
  actedBy: string[];
  tasks?: ApprovalTask[];
  history?: ApprovalHistoryEntry[];
  resumeToNodeKey?: string;
  returnTargets?: ApprovalReturnTarget[];
  formValues?: Record<string, unknown>;
}

export interface CreateApprovalPayload {
  title: string;
  category?: string;
  reason?: string;
  amount?: string;
  ticketId?: string;
  assignee?: string;
  cc?: string[];
}

export interface ApprovalActionPayload {
  action: ApprovalAction;
  comment?: string;
  transferTo?: string;
  taskId?: string;
  nodeKey?: string;
  position?: 'before' | 'after';
  signMode?: string;
  targetNodeKey?: string;
  resume?: 'resequence' | 'direct';
  addsignTo?: string[];
  assignee?: ApprovalActor;
  assignees?: ApprovalActor[];
  formValues?: Record<string, unknown>;
}

export interface CreateCommentPayload {
  targetType: CommentTargetType;
  targetId: string;
  body: string;
}

// ---- Theme types ----

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemePreferences {
  mode: ThemeMode;
  primaryColor: string;
  compactMode: boolean;
}
