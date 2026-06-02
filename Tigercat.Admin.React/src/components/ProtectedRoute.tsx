import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { SESSION_KEY, safeParse, type Session } from '../utils';

export function ProtectedRoute() {
  const location = useLocation();
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  const isAuthed = Boolean(session?.token);

  if (!isAuthed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          returnTo: `${location.pathname}${location.search}${location.hash}`,
        }}
      />
    );
  }

  return <Outlet />;
}
