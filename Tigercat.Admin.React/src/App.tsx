import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
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
const UsersPage = lazy(() => import('./pages/UsersPage'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

const MENU_ROUTES = {
  home: '/dashboard',
  users: '/users',
  roles: '/roles',
  settings: '/settings',
  about: '/about',
} as const;

type MenuKey = keyof typeof MENU_ROUTES;

const DEFAULT_MENU: MenuKey = 'home';

const PATH_TO_MENU = Object.fromEntries(
  Object.entries(MENU_ROUTES).map(([key, value]) => [value, key as MenuKey]),
) as Record<string, MenuKey | undefined>;

type ChangePasswordForm = { oldPassword: string; newPassword: string };
type ChangePasswordField = keyof ChangePasswordForm;

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-50">
      <div className="text-slate-500">加载中...</div>
    </div>
  );
}

function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100 p-6 flex items-center justify-center">
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
  onLogout,
  onChangePassword,
  onToggleTheme,
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
      onLogout={onLogout}
      onChangePassword={onChangePassword}
      onToggleTheme={onToggleTheme}
      activeMenu={activeMenu}
      onNavigate={onNavigate}>
      <Suspense fallback={<PageLoader />}>
        <Outlet context={homeContext} />
      </Suspense>
      <Modal
        open={changeOpen}
        title="修改密码"
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

  const updateTheme = useCallback((prefs: ThemePreferences) => {
    setThemePrefs(prefs);
    saveThemePreferences(prefs);
    applyTheme(prefs);
  }, []);

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

  // Apply theme on mount & watch system changes
  useEffect(() => {
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

  const persistSession = (nextSession: Session | null) => {
    if (!nextSession) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    }
    setSession(nextSession);
  };

  const onLoginSuccess = async (nextSession: Session) => {
    persistSession(nextSession);
    await Promise.all([
      loadHome(nextSession.token),
      permission.load(nextSession.token),
    ]);
    navigate('/dashboard');
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

  const handleLogout = () => {
    persistSession(null);
    permission.clear();
    setHomeMessage('');
    setHomeError('');
    navigate('/login');
  };

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
              onLogout={handleLogout}
              onChangePassword={() => setChangeOpen(true)}
              onToggleTheme={toggleThemeMode}
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
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
