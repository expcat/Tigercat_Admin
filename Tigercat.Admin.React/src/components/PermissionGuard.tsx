import type { ReactNode } from 'react';
import { usePermission } from '../utils/permission';

interface PermissionGuardProps {
  /** Permission code(s) required. */
  code: string | string[];
  /**
   * Match mode:
   * - `'all'` (default) — user must own **all** listed codes.
   * - `'any'` — user must own **at least one** of the listed codes.
   */
  mode?: 'all' | 'any';
  /** Content rendered when permission is granted. */
  children: ReactNode;
  /** Optional fallback rendered when permission is denied (default: nothing). */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on the current user's permissions.
 *
 * Usage:
 * ```tsx
 * <PermissionGuard code="user:create">
 *   <Button>新增用户</Button>
 * </PermissionGuard>
 *
 * <PermissionGuard code={['user:edit', 'role:edit']} mode="any">
 *   <Button>编辑</Button>
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  code,
  mode = 'all',
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { has, hasAny } = usePermission();
  const codes = Array.isArray(code) ? code : [code];
  const permitted = mode === 'any' ? hasAny(...codes) : has(...codes);
  return <>{permitted ? children : fallback}</>;
}
