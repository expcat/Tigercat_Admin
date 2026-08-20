import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { SESSION_KEY, safeParse, type Session, usePermission } from '../utils';

interface PermissionRouteProps {
  /** Permission code(s) required. */
  code: string | string[];
  /**
   * Match mode:
   * - 'all' (default) — user must own **all** listed codes.
   * - 'any' — user must own **at least one** of the listed codes.
   */
  mode?: 'all' | 'any';
}

export function PermissionRoute({ code, mode = 'all' }: PermissionRouteProps) {
  const { loaded, loading, load, has, hasAny } = usePermission();
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  // 仅在本守卫内主动补偿加载一次，避免接口持续失败时无限重试。
  const loadAttemptedRef = useRef(false);

  // 会话存在但权限尚未加载时主动触发加载（防直刷竞态；App 挂载时也会加载一次）
  useEffect(() => {
    if (session?.token && !loaded && !loading && !loadAttemptedRef.current) {
      loadAttemptedRef.current = true;
      load(session.token);
    }
  }, [session?.token, loaded, loading, load]);

  // Nested under ProtectedRoute, so unauthenticated traffic should already be
  // redirected to /login. Keep the same fail-closed fallback here.
  if (!session?.token) {
    return <Navigate to="/login" replace />;
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full min-h-50">
        <div className="p2-text-secondary">加载中...</div>
      </div>
    );
  }

  const codes = Array.isArray(code) ? code : [code];
  const permitted = mode === 'any' ? hasAny(...codes) : has(...codes);

  if (!permitted) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
