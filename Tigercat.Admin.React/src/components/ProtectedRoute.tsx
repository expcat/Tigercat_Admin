import { Navigate, Outlet } from 'react-router-dom';
import { SESSION_KEY, safeParse, type Session } from '../utils';

export function ProtectedRoute() {
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  const isAuthed = Boolean(session?.token);

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
