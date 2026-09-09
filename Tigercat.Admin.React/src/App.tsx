import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Outlet,
} from 'react-router-dom';
import { Container } from '@expcat/tigercat-react/Container';
import { Form } from '@expcat/tigercat-react/Form';
import { FormItem } from '@expcat/tigercat-react/FormItem';
import { Input } from '@expcat/tigercat-react/Input';
import { Message } from '@expcat/tigercat-react/Message';
import { Modal } from '@expcat/tigercat-react/Modal';
import { LoadingBar } from '@expcat/tigercat-react/LoadingBar';
import { LoadingBarContainer } from '@expcat/tigercat-react/LoadingBarContainer';
import { MainLayout } from './components/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GuestRoute } from './components/GuestRoute';
import { PermissionRoute } from './components/PermissionRoute';
import {
  collectShellMenuNodes,
  getShellNavigatePath,
  resetShellMenuSchema,
  resolveShellPageKey,
  useShellMenuSchema,
  type ShellPageKey,
} from './utils/shell-navigation';
import {
  buildReactSchemaRoutes,
  routeGuardPermission,
} from './utils/schema-routes';
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
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const RegisterSuccessPage = lazy(() => import('./pages/RegisterSuccessPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ApprovalDetailPage = lazy(() => import('./pages/ApprovalDetailPage'));
const ExceptionPage = lazy(() => import('./pages/ExceptionPage'));

void LoadingBarContainer;

type MenuKey = ShellPageKey;

const DEFAULT_MENU: MenuKey = 'home';

type ChangePasswordForm = { oldPassword: string; newPassword: string };
type ChangePasswordField = keyof ChangePasswordForm;

type LocationState = {
  returnTo?: string;
};

const GUEST_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/register-success',
]);
const EXCEPTION_PATHS = new Set(['/403', '/404', '/500']);

function isProtectedAppPath(pathname: string) {
  return !GUEST_PATHS.has(pathname) && !EXCEPTION_PATHS.has(pathname) && pathname !== '/';
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-50">
      <div className="p2-text-secondary">加载中...</div>
    </div>
  );
}

function RouteLandingFinish({ onReady }: { onReady: () => void }) {
  const location = useLocation();
  useEffect(() => {
    onReady();
  }, [location.pathname, location.search, onReady]);
  return null;
}

class RouteErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return <PageLoader />;
    }
    return this.props.children;
  }
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return '/dashboard';
  }

  if (value.startsWith('//') || value === '/login' || value === '/register') {
    return '/dashboard';
  }

  if (value === '/forgot-password' || value === '/register-success') {
    return '/dashboard';
  }

  if (value === '/403' || value === '/404' || value === '/500') {
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
  activeMenu: string;
  themePrefs: ThemePreferences;
  onLogout: () => void;
  onChangePassword: () => void;
  onToggleTheme: () => void;
  onUpdateTheme: (prefs: ThemePreferences) => void;
  onProfile: () => void;
  onNavigate: (key: string) => void;
  changeOpen: boolean;
  changeForm: ChangePasswordForm;
  onChangeField: (field: ChangePasswordField, value: string) => void;
  onChangePasswordSubmit: () => void;
  onCloseChangeModal: () => void;
  homeContext: HomeContext;
  onRouteLanded: () => void;
}

function ProtectedLayout({
  user,
  activeMenu,
  themePrefs,
  onLogout,
  onChangePassword,
  onToggleTheme,
  onUpdateTheme,
  onProfile,
  onNavigate,
  changeOpen,
  changeForm,
  onChangeField,
  onChangePasswordSubmit,
  onCloseChangeModal,
  homeContext,
  onRouteLanded,
}: ProtectedLayoutProps) {
  const location = useLocation();

  return (
    <MainLayout
      user={user}
      themePrefs={themePrefs}
      onLogout={onLogout}
      onChangePassword={onChangePassword}
      onToggleTheme={onToggleTheme}
      onUpdateTheme={onUpdateTheme}
      onProfile={onProfile}
      activeMenu={activeMenu}
      onNavigate={onNavigate}>
      <RouteErrorBoundary key={location.pathname} onError={onRouteLanded}>
        <Suspense fallback={<PageLoader />}>
          <RouteLandingFinish onReady={onRouteLanded} />
          <Outlet context={homeContext} />
        </Suspense>
      </RouteErrorBoundary>
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

function renderSchemaBusinessRoutes(
  routes: ReturnType<typeof buildReactSchemaRoutes>,
) {
  return routes.map((route) => {
    const Page = route.component as ComponentType<{
      src?: string;
      title?: string;
    }>;
    const element = route.usesIframe ? (
      <Page src={route.iframeSrc} title={route.meta.title} />
    ) : (
      <Page />
    );
    const pageRoute = (
      <Route key={route.key} path={route.path} element={element} />
    );
    const permission = routeGuardPermission(route.key, route.permission);
    if (permission) {
      return (
        <Route
          key={`${route.key}-guard`}
          element={<PermissionRoute code={permission} />}>
          {pageRoute}
        </Route>
      );
    }
    return pageRoute;
  });
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const permission = usePermission();
  const menuSchema = useShellMenuSchema();
  const schemaNodes = useMemo(
    () => collectShellMenuNodes(menuSchema),
    [menuSchema],
  );
  const boundRoutes = useMemo(
    () => buildReactSchemaRoutes(menuSchema),
    [menuSchema],
  );
  const routeBarStartedRef = useRef(false);

  const finishRouteBar = useCallback(() => {
    if (routeBarStartedRef.current) {
      LoadingBar.finish();
      routeBarStartedRef.current = false;
    }
  }, []);

  useLayoutEffect(() => {
    if (isProtectedAppPath(location.pathname)) {
      LoadingBar.start();
      routeBarStartedRef.current = true;
    } else {
      finishRouteBar();
    }
    return () => {
      finishRouteBar();
    };
  }, [location.pathname, location.search, finishRouteBar]);

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

  const updateTheme = useCallback((next: ThemePreferences) => {
    saveThemePreferences(next);
    applyTheme(next);
    setThemePrefs(next);
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
    resetShellMenuSchema();
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

  const activeMenu = useMemo(() => {
    const exact = boundRoutes.find((route) => route.path === location.pathname);
    if (exact) {
      return exact.key;
    }
    return resolveShellPageKey(location.pathname, DEFAULT_MENU);
  }, [boundRoutes, location.pathname]);
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
    (key: string) => {
      const path = getShellNavigatePath(key, schemaNodes);
      if (!path) {
        return;
      }
      navigate(path);
    },
    [navigate, schemaNodes],
  );
  const handleChangeField = useCallback(
    (field: ChangePasswordField, value: string) => {
      setChangeForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  return (
    <>
      <div id="tiger-loading-bar-container-root" />
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
        <Route
          path="/forgot-password"
          element={
            <GuestLayout>
              <ForgotPasswordPage />
            </GuestLayout>
          }
        />
        <Route
          path="/register-success"
          element={
            <GuestLayout>
              <RegisterSuccessPage />
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
              themePrefs={themePrefs}
              onLogout={handleLogout}
              onChangePassword={() => setChangeOpen(true)}
              onToggleTheme={toggleThemeMode}
              onUpdateTheme={updateTheme}
              onProfile={() => navigate('/profile')}
              onNavigate={handleNavigate}
              changeOpen={changeOpen}
              changeForm={changeForm}
              onChangeField={handleChangeField}
              onChangePasswordSubmit={handleChangePassword}
              onCloseChangeModal={handleCloseChangeModal}
              homeContext={homeContext}
              onRouteLanded={finishRouteBar}
            />
          }>
          {renderSchemaBusinessRoutes(boundRoutes)}
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/approvals/:id" element={<ApprovalDetailPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/403"
        element={
          <Suspense fallback={<PageLoader />}>
            <ExceptionPage status={403} />
          </Suspense>
        }
      />
      <Route
        path="/404"
        element={
          <Suspense fallback={<PageLoader />}>
            <ExceptionPage status={404} />
          </Suspense>
        }
      />
      <Route
        path="/500"
        element={
          <Suspense fallback={<PageLoader />}>
            <ExceptionPage status={500} />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
    </>
  );
}

export default App;
