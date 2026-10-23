import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  SESSION_KEY,
  getSafeReturnTo,
  safeParse,
  type Session,
  usePermission,
} from '../utils';

export function GuestRoute() {
  const location = useLocation();
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  const permission = usePermission();
  const isAuthed = Boolean(session?.token) && permission.loaded;

  if (isAuthed) {
    const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
    const target = getSafeReturnTo(returnTo);
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
