import { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Modal,
  Form,
  FormItem,
  Input,
} from '@expcat/tigercat-react';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { MainLayout } from './components/MainLayout';
import {
  SESSION_KEY,
  PAGE_KEYS,
  safeParse,
  getPageFromHash,
  apiRequest,
  normalizeInput,
  Session,
  Notice,
} from './utils';

function App() {
  const [page, setPage] = useState<string>('login');

  const [changeForm, setChangeForm] = useState({
    oldPassword: '',
    newPassword: '',
  });
  const [session, setSession] = useState<Session | null>(
    () => safeParse<Session>(localStorage.getItem(SESSION_KEY)) || null,
  );
  const [homeMessage, setHomeMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>({ type: '', message: '' });
  const [homeError, setHomeError] = useState('');
  const [changeOpen, setChangeOpen] = useState(false);
  // activeMenu logic is handled in MainLayout for visual mostly,
  // but if we had multiple pages we'd lift state here.

  const isAuthed = Boolean(session?.token);

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
    window.location.hash = '/home';
  };

  const loadHome = async (tokenOverride?: string) => {
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
  };

  useEffect(() => {
    const syncPage = () => setPage(getPageFromHash());
    syncPage();
    window.addEventListener('hashchange', syncPage);
    return () => window.removeEventListener('hashchange', syncPage);
  }, []);

  useEffect(() => {
    if (session?.token) {
      loadHome(session.token);
      if (page !== 'home') {
        window.location.hash = '/home';
      }
    }
  }, [session?.token]);

  useEffect(() => {
    if (!isAuthed && page === 'home') {
      window.location.hash = '/login';
    }
  }, [isAuthed, page]);

  const handleLogout = () => {
    persistSession(null);
    setHomeMessage('');
    setHomeError('');
    window.location.hash = '/login';
  };

  const handleChangePassword = async () => {
    setNotice({ type: '', message: '' });
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handlePageSwitch = (target: string) => {
    if (PAGE_KEYS.includes(target)) {
      window.location.hash = `/${target}`;
    }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <Container className="w-full max-w-4xl" padding={false}>
          {page === 'login' && (
            <LoginPage onSuccess={onLoginSuccess} onSwitch={handlePageSwitch} />
          )}
          {page === 'register' && <RegisterPage onSwitch={handlePageSwitch} />}
        </Container>
      </div>
    );
  }

  return (
    <MainLayout
      user={session ? { username: session.username } : null}
      onLogout={handleLogout}
      onChangePassword={() => setChangeOpen(true)}>
      <HomePage
        notice={notice}
        homeMessage={homeMessage}
        homeError={homeError}
        username={session?.username}
      />

      <Modal
        open={changeOpen}
        title="修改密码"
        okText="确认修改"
        cancelText="取消"
        onOk={handleChangePassword}
        onCancel={() => setChangeOpen(false)}>
        <Form model={changeForm} labelWidth={88}>
          <FormItem name="oldPassword" label="旧密码">
            <Input
              value={changeForm.oldPassword}
              placeholder="请输入旧密码"
              onChange={(value) =>
                setChangeForm((prev) => ({
                  ...prev,
                  oldPassword: normalizeInput(value),
                }))
              }
            />
          </FormItem>
          <FormItem name="newPassword" label="新密码">
            <Input
              value={changeForm.newPassword}
              placeholder="请输入新密码"
              onChange={(value) =>
                setChangeForm((prev) => ({
                  ...prev,
                  newPassword: normalizeInput(value),
                }))
              }
            />
          </FormItem>
        </Form>
      </Modal>
    </MainLayout>
  );
}

export default App;
