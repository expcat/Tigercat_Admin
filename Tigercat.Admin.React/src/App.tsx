import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Outlet,
} from 'react-router-dom';
import {
  Container,
  Modal,
  Form,
  FormItem,
  Input,
  Message,
} from '@expcat/tigercat-react';
import { MainLayout } from './components/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GuestRoute } from './components/GuestRoute';
import {
  SESSION_KEY,
  safeParse,
  apiRequest,
  normalizeInput,
  Session,
  Notice,
  usePermission,
  getThemePreferences,
  saveThemePreferences,
  applyTheme,
  watchSystemTheme,
  type ThemeMode,
  type ThemePreferences,
} from './utils';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const TicketsPage = lazy(() => import('./pages/TicketsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const FilesPage = lazy(() => import('./pages/FilesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

const MENU_ROUTES = {
  home: '/dashboard',
  analytics: '/analytics',
  tickets: '/tickets',
  calendar: '/calendar',
  profile: '/profile',
  users: '/users',
  roles: '/roles',
  settings: '/settings',
  files: '/files',
  notifications: '/notifications',
  tasks: '/tasks',
  audit: '/audit-logs',
  about: '/about',
} as const;

type MenuKey = keyof typeof MENU_ROUTES;

const DEFAULT_MENU: MenuKey = 'home';

const PATH_TO_MENU = Object.fromEntries(
  Object.entries(MENU_ROUTES).map(([key, value]) => [value, key as MenuKey]),
) as Record<string, MenuKey | undefined>;

type ChangePasswordForm = { oldPassword: string; newPassword: string };
type ChangePasswordField = keyof ChangePasswordForm;

type LocationState = {
  returnTo?: string;
};

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-50">
      <div className="p2-text-secondary">加载中...</div>
    </div>
  );
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return '/dashboard';
  }

  if (value.startsWith('//') || value === '/login' || value === '/register') {
    return '/dashboard';
  }

  return value;
}

function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-(--tiger-bg-page,#f8fafc) p-4 flex items-center justify-center sm:p-6">
      <Container className="w-full max-w-4xl" padding={false}>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </Container>
    </div>
  );
}

interface HomeContext {
  notice: Notice;
  homeMessage: string;
  homeError: string;
  username?: string;
}

interface ProtectedLayoutProps {
  user: { username: string } | null;
  activeMenu: MenuKey;
  themeMode: ThemeMode;
  onLogout: () => void;
  onChangePassword: () => void;
  onToggleTheme: () => void;
  onProfile: () => void;
  compactMode: boolean;
  onNavigate: (key: MenuKey) => void;
  changeOpen: boolean;
  changeForm: ChangePasswordForm;
  onChangeField: (field: ChangePasswordField, value: string) => void;
  onChangePasswordSubmit: () => void;
  onCloseChangeModal: () => void;
  homeContext: HomeContext;
}

function ProtectedLayout({
  user,
  activeMenu,
  themeMode,
  compactMode,
  onLogout,
  onChangePassword,
  onToggleTheme,
  onProfile,
  onNavigate,
  changeOpen,
  changeForm,
  onChangeField,
  onChangePasswordSubmit,
  onCloseChangeModal,
  homeContext,
}: ProtectedLayoutProps) {
  return (
    <MainLayout
      user={user}
      themeMode={themeMode}
      compactMode={compactMode}
      onLogout={onLogout}
      onChangePassword={onChangePassword}
      onToggleTheme={onToggleTheme}
      onProfile={onProfile}
      activeMenu={activeMenu}
      onNavigate={onNavigate as (key: string) => void}>
      <Suspense fallback={<PageLoader />}>
        <Outlet context={homeContext} />
      </Suspense>
      <Modal
        open={changeOpen}
        title="修改密码"
        showDefaultFooter
        okText="确认修改"
        cancelText="取消"
        onOk={onChangePasswordSubmit}
        onCancel={onCloseChangeModal}>
        <Form model={changeForm} labelWidth={88}>
          <FormItem name="oldPassword" label="旧密码">
            <Input
              value={changeForm.oldPassword}
              placeholder="请输入旧密码"
              onChange={(value) =>
                onChangeField('oldPassword', normalizeInput(value))
              }
            />
          </FormItem>
          <FormItem name="newPassword" label="新密码">
            <Input
              value={changeForm.newPassword}
              placeholder="请输入新密码"
              onChange={(value) =>
                onChangeField('newPassword', normalizeInput(value))
              }
            />
          </FormItem>
        </Form>
      </Modal>
    </MainLayout>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const permission = usePermission();

  const [changeForm, setChangeForm] = useState<ChangePasswordForm>({
    oldPassword: '',
    newPassword: '',
  });
  const [session, setSession] = useState<Session | null>(
    () => safeParse<Session>(localStorage.getItem(SESSION_KEY)) || null,
  );
  const [homeMessage, setHomeMessage] = useState('');
  const [notice, setNotice] = useState<Notice>({ type: '', message: '' });
  const [homeError, setHomeError] = useState('');
  const [changeOpen, setChangeOpen] = useState(false);

  /* ── Theme ────────────────────────────────────── */
  const [themePrefs, setThemePrefs] =
    useState<ThemePreferences>(getThemePreferences);

  const toggleThemeMode = useCallback(() => {
    setThemePrefs((prev) => {
      const order: ThemeMode[] = ['light', 'dark', 'system'];
      const idx = order.indexOf(prev.mode);
      const next: ThemePreferences = {
        ...prev,
        mode: order[(idx + 1) % order.length],
      };
      saveThemePreferences(next);
      applyTheme(next);
      return next;
    });
  }, []);

  // Apply theme before paint to avoid FOUC
  useLayoutEffect(() => {
    applyTheme(themePrefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return watchSystemTheme(() => themePrefs);
  }, [themePrefs]);

  const authHeaders = useMemo(() => {
    if (!session?.token) return {};
    return { Authorization: `Bearer ${session.token}` } as HeadersInit;
  }, [session?.token]);

  const persistSession = useCallback((nextSession: Session | null) => {
    if (!nextSession) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    }
    setSession(nextSession);
  }, []);

  const onLoginSuccess = async (nextSession: Session) => {
    persistSession(nextSession);
    await Promise.all([
      loadHome(nextSession.token),
      permission.load(nextSession.token),
    ]);
    navigate(getSafeReturnTo((location.state as LocationState | null)?.returnTo), {
      replace: true,
    });
  };

  const loadHome = useCallback(
    async (tokenOverride?: string) => {
      setHomeError('');
      try {
        const headers = tokenOverride
          ? { Authorization: `Bearer ${tokenOverride}` }
          : authHeaders;
        const payload = await apiRequest<string>('/api/home', {
          headers: headers as HeadersInit,
        });
        setHomeMessage(payload?.data || '');
      } catch (error: any) {
        setHomeError(error.message);
      }
    },
    [authHeaders],
  );

  // Load home data when entering dashboard
  useEffect(() => {
    if (location.pathname === '/dashboard' && session?.token) {
      loadHome(session.token);
    }
  }, [location.pathname, session?.token, loadHome]);

  // Load permissions on page refresh when session exists but permissions haven't been loaded yet
  useEffect(() => {
    if (session?.token && !permission.loaded) {
      permission.load(session.token);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAuthenticatedState = useCallback(() => {
    persistSession(null);
    permission.clear();
    setHomeMessage('');
    setHomeError('');
  }, [permission, persistSession]);

  const handleLogout = () => {
    clearAuthenticatedState();
    navigate('/login');
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_KEY || event.newValue !== null) return;
      clearAuthenticatedState();
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    };

    const handleSessionExpired = () => {
      const returnTo = `${location.pathname}${location.search}${location.hash}`;
      clearAuthenticatedState();
      Message.warning({
        content: '会话已过期，请重新登录',
        duration: 3000,
      });
      navigate('/login', {
        replace: true,
        state: { returnTo },
      });
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('tigercat:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('tigercat:session-expired', handleSessionExpired);
    };
  }, [
    clearAuthenticatedState,
    location.hash,
    location.pathname,
    location.search,
    navigate,
  ]);

  const handleChangePassword = async () => {
    setNotice({ type: '', message: '' });
    try {
      const payload = await apiRequest('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(changeForm),
      });
      setNotice({
        type: 'success',
        message: payload?.data?.message || '密码修改成功',
      });
      setChangeForm({ oldPassword: '', newPassword: '' });
      setChangeOpen(false);
    } catch (error: any) {
      setNotice({ type: 'error', message: error.message });
    }
  };

  const handleCloseChangeModal = () => {
    setChangeOpen(false);
    setNotice({ type: '', message: '' });
    setChangeForm({ oldPassword: '', newPassword: '' });
  };

  const activeMenu = useMemo(
    () => PATH_TO_MENU[location.pathname] ?? DEFAULT_MENU,
    [location.pathname],
  );
  const homeContext = useMemo(
    () => ({
      notice,
      homeMessage,
      homeError,
      username: session?.username,
    }),
    [notice, homeMessage, homeError, session?.username],
  );
  const handleNavigate = useCallback(
    (key: MenuKey) => {
      const nextPath = MENU_ROUTES[key];
      navigate(nextPath);
    },
    [navigate],
  );
  const handleChangeField = useCallback(
    (field: ChangePasswordField, value: string) => {
      setChangeForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route
          path="/login"
          element={
            <GuestLayout>
              <LoginPage onSuccess={onLoginSuccess} />
            </GuestLayout>
          }
        />
        <Route
          path="/register"
          element={
            <GuestLayout>
              <RegisterPage />
            </GuestLayout>
          }
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <ProtectedLayout
              user={session ? { username: session.username } : null}
              activeMenu={activeMenu}
              themeMode={themePrefs.mode}
              compactMode={themePrefs.compactMode}
              onLogout={handleLogout}
              onChangePassword={() => setChangeOpen(true)}
              onToggleTheme={toggleThemeMode}
              onProfile={() => navigate('/profile')}
              onNavigate={handleNavigate}
              changeOpen={changeOpen}
              changeForm={changeForm}
              onChangeField={handleChangeField}
              onChangePasswordSubmit={handleChangePassword}
              onCloseChangeModal={handleCloseChangeModal}
              homeContext={homeContext}
            />
          }>
          <Route path="/dashboard" element={<HomePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
