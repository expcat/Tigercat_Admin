import { Navigate, Outlet } from 'react-router-dom';
import { SESSION_KEY, safeParse, type Session } from '../utils';

export function GuestRoute() {
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  const isAuthed = Boolean(session?.token);

  if (isAuthed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
