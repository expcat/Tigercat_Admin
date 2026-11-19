import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Message } from '@expcat/tigercat-react/Message';
import { apiRequest } from './request';
import type { UserPermissions } from './types';

// ---- Permission context ----

export interface PermissionContextValue {
  /** Current set of permission codes owned by the user. */
  codes: Set<string>;
  /** Whether permissions have been loaded at least once. */
  loaded: boolean;
  /** Whether a load request is currently in flight. */
  loading: boolean;
  /** Latest permission load failure, if any. */
  error: string;
  /** Fetch permissions from the API. */
  load: (token: string) => Promise<void>;
  /** Clear cached permissions (e.g. on logout). */
  clear: () => void;
  /** Check whether the user owns **all** of the given codes. */
  has: (...codes: string[]) => boolean;
  /** Check whether the user owns **at least one** of the given codes. */
  hasAny: (...codes: string[]) => boolean;
}

const EMPTY_SET = new Set<string>();

const PermissionContext = createContext<PermissionContextValue | null>(null);

// ---- Provider ----

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [codes, setCodes] = useState<Set<string>>(EMPTY_SET);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Monotonically increasing id to discard stale responses.
  const requestIdRef = useRef(0);
  const activeRef = useRef(0);

  const load = useCallback(async (token: string) => {
    const requestId = ++requestIdRef.current;
    activeRef.current += 1;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<UserPermissions>('/api/auth/permissions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (requestId !== requestIdRef.current) return;
      const permCodes = res.data?.permissions?.map((p) => p.code) ?? [];
      setCodes(new Set(permCodes));
      setLoaded(true);
    } catch (cause: unknown) {
      if (requestId === requestIdRef.current) {
        const content = cause instanceof Error && cause.message ? cause.message : '权限加载失败，请重试';
        setCodes(EMPTY_SET);
        setLoaded(false);
        setError(content);
        Message.error({ content: `权限加载失败：${content}`, duration: 3000 });
      }
    } finally {
      activeRef.current -= 1;
      if (activeRef.current < 0) activeRef.current = 0;
      setLoading(activeRef.current > 0);
    }
  }, []);

  const clear = useCallback(() => {
    requestIdRef.current += 1;
    activeRef.current = 0;
    setLoading(false);
    setCodes(EMPTY_SET);
    setLoaded(false);
    setError('');
  }, []);

  const has = useCallback(
    (...perms: string[]) => perms.every((c) => codes.has(c)),
    [codes],
  );

  const hasAny = useCallback(
    (...perms: string[]) => perms.some((c) => codes.has(c)),
    [codes],
  );

  const value = useMemo<PermissionContextValue>(
    () => ({ codes, loaded, loading, error, load, clear, has, hasAny }),
    [codes, loaded, loading, error, load, clear, has, hasAny],
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// ---- Hook ----

/**
 * Consume the permission context anywhere in the component tree.
 *
 * Must be used inside `<PermissionProvider>`.
 */
export function usePermission(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error('usePermission must be used within a <PermissionProvider>');
  }
  return ctx;
}
