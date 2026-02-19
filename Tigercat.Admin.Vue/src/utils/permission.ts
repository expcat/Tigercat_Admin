import { ref, inject, type Ref, type InjectionKey } from 'vue';
import { apiRequest } from './request';
import type { UserPermissions } from './types';

/** Reactive set of permission codes owned by the current user. */
const permissionCodes = ref<Set<string>>(new Set());

/** Whether permissions have been loaded at least once. */
const loaded = ref(false);

/** Whether a load request is currently in flight. */
const loading = ref(false);

/** Monotonically increasing id for permission load requests. */
let currentRequestId = 0;

/** Number of active permission load requests. */
let activeRequests = 0;

/**
 * Fetch the current user's permissions from the API and store them.
 * Requires an Authorization header (Bearer token).
 *
 * Concurrent / overlapping calls are safe: only the result of the
 * latest request is applied; stale responses are discarded.
 */
export async function loadPermissions(token: string): Promise<void> {
  const requestId = ++currentRequestId;
  activeRequests += 1;
  loading.value = true;
  try {
    const res = await apiRequest<UserPermissions>('/api/auth/permissions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Only apply the result if this is still the latest request.
    if (requestId !== currentRequestId) return;
    const codes = res.data?.permissions?.map((p) => p.code) ?? [];
    permissionCodes.value = new Set(codes);
    loaded.value = true;
  } catch {
    if (requestId === currentRequestId) {
      permissionCodes.value = new Set();
      loaded.value = false;
    }
  } finally {
    activeRequests -= 1;
    if (activeRequests < 0) activeRequests = 0;
    loading.value = activeRequests > 0;
  }
}

/** Clear cached permissions (e.g. on logout). */
export function clearPermissions(): void {
  // Invalidate any in-flight requests so their results are ignored.
  currentRequestId += 1;
  activeRequests = 0;
  loading.value = false;
  permissionCodes.value = new Set();
  loaded.value = false;
}

/**
 * Check whether the current user owns **all** of the given permission codes.
 */
export function hasPermission(...codes: string[]): boolean {
  return codes.every((c) => permissionCodes.value.has(c));
}

/**
 * Check whether the current user owns **at least one** of the given permission codes.
 */
export function hasAnyPermission(...codes: string[]): boolean {
  return codes.some((c) => permissionCodes.value.has(c));
}

// ---- Provide / Inject helpers ----

export interface PermissionContext {
  /** Reactive set of permission codes. */
  codes: Ref<Set<string>>;
  loaded: Ref<boolean>;
  loading: Ref<boolean>;
  load: (token: string) => Promise<void>;
  clear: () => void;
  has: (...codes: string[]) => boolean;
  hasAny: (...codes: string[]) => boolean;
}

export const PERMISSION_KEY: InjectionKey<PermissionContext> = Symbol('permission');

/**
 * Create the permission context object to be provided at root level.
 */
export function createPermissionContext(): PermissionContext {
  return {
    codes: permissionCodes,
    loaded,
    loading,
    load: loadPermissions,
    clear: clearPermissions,
    has: hasPermission,
    hasAny: hasAnyPermission,
  };
}

/**
 * Composable to consume permission context anywhere in the component tree.
 */
export function usePermission(): PermissionContext {
  const ctx = inject(PERMISSION_KEY);
  if (!ctx) {
    // Fallback: return the module-level singletons so it still works
    // even if provide was missed (e.g. in unit tests).
    return createPermissionContext();
  }
  return ctx;
}
