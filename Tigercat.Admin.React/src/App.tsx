import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
} from './utils';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

const MENU_ROUTES = {
  home: '/dashboard',
  users: '/users',
} as const;

type MenuKey = keyof typeof MENU_ROUTES;
type ChangePasswordForm = { oldPassword: string; newPassword: string };
type ChangePasswordField = keyof ChangePasswordForm;

const DEFAULT_MENU: MenuKey = 'home';

const PATH_TO_MENU: Record<string, MenuKey> = {
  '/dashboard': 'home',
  '/users': 'users',
};

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="text-slate-500">加载中...</div>
    </div>
  );
}

// Guest layout wrapper for login/register pages
function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-6 flex items-center justify-center">
      <Container className="w-full max-w-4xl" padding={false}>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </Container>
    </div>
  );
}

interface ProtectedLayoutProps {
  children: React.ReactNode;
  user: { username: string } | null;
  activeMenu: MenuKey;
  onLogout: () => void;
  onChangePassword: () => void;
  onNavigate: (key: MenuKey) => void;
  changeOpen: boolean;
  changeForm: ChangePasswordForm;
  onChangeField: (field: ChangePasswordField, value: string) => void;
  onChangePasswordSubmit: () => void;
  onCloseChangeModal: () => void;
}

function ProtectedLayout({
  children,
  user,
  activeMenu,
  onLogout,
  onChangePassword,
  onNavigate,
  changeOpen,
  changeForm,
  onChangeField,
  onChangePasswordSubmit,
  onCloseChangeModal,
}: ProtectedLayoutProps) {
  return (
    <MainLayout
      user={user}
      onLogout={onLogout}
      onChangePassword={onChangePassword}
      activeMenu={activeMenu}
      onNavigate={onNavigate}>
      {children}
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
    await loadHome(nextSession.token);
    navigate('/dashboard');
  };

  const loadHome = useCallback(async (tokenOverride?: string) => {
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
  }, [authHeaders]);

  // Load home data when entering dashboard
  useEffect(() => {
    if (location.pathname === '/dashboard' && session?.token) {
      loadHome(session.token);
    }
  }, [location.pathname, session?.token, loadHome]);

  const handleLogout = () => {
    persistSession(null);
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
      {/* Guest routes (login/register) */}
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

      {/* Protected routes (dashboard) */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={
            <ProtectedLayout
              user={session ? { username: session.username } : null}
              activeMenu={activeMenu}
              onLogout={handleLogout}
              onChangePassword={() => setChangeOpen(true)}
              onNavigate={handleNavigate}
              changeOpen={changeOpen}
              changeForm={changeForm}
              onChangeField={handleChangeField}
              onChangePasswordSubmit={handleChangePassword}
              onCloseChangeModal={handleCloseChangeModal}>
              <Suspense fallback={<PageLoader />}>
                <HomePage
                  notice={notice}
                  homeMessage={homeMessage}
                  homeError={homeError}
                  username={session?.username}
                />
              </Suspense>
            </ProtectedLayout>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedLayout
              user={session ? { username: session.username } : null}
              activeMenu={activeMenu}
              onLogout={handleLogout}
              onChangePassword={() => setChangeOpen(true)}
              onNavigate={handleNavigate}
              changeOpen={changeOpen}
              changeForm={changeForm}
              onChangeField={handleChangeField}
              onChangePasswordSubmit={handleChangePassword}
              onCloseChangeModal={handleCloseChangeModal}>
              <Suspense fallback={<PageLoader />}>
                <UsersPage />
              </Suspense>
            </ProtectedLayout>
          }
        />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
