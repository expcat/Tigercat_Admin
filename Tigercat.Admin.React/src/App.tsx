import { useEffect, useMemo, useState } from 'react'
import { Container, Modal, Form, FormItem, Input } from '@expcat/tigercat-react'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import {
  SESSION_KEY,
  PAGE_KEYS,
  safeParse,
  getPageFromHash,
  apiRequest,
  debounce,
  normalizeInput,
  useAuthForm
} from './utils'

export interface Session {
  token: string;
  username: string;
  expiresAt: string;
}

export interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

function App() {
  const [page, setPage] = useState<string>('login')
  
  const login = useAuthForm({ username: '', password: '' })
  const register = useAuthForm({ username: '', password: '' })
  
  const [changeForm, setChangeForm] = useState({ oldPassword: '', newPassword: '' })
  const [session, setSession] = useState<Session | null>(() => safeParse<Session>(localStorage.getItem(SESSION_KEY)) || null)
  const [homeMessage, setHomeMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<Notice>({ type: '', message: '' })
  const [homeError, setHomeError] = useState('')
  const [changeOpen, setChangeOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState('home')

  const isAuthed = Boolean(session?.token)

  const authHeaders = useMemo(() => {
    if (!session?.token) return {}
    return { Authorization: `Bearer ${session.token}` } as HeadersInit
  }, [session?.token])

  const persistSession = (nextSession: Session | null) => {
    if (!nextSession) {
      localStorage.removeItem(SESSION_KEY)
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    }
    setSession(nextSession)
  }

  const loadHome = async (tokenOverride?: string) => {
    setHomeError('')
    try {
      const headers = tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : authHeaders;
      const payload = await apiRequest<string>('/api/home', {
        headers: headers as HeadersInit,
      })
      setHomeMessage(payload?.data || '')
    } catch (error: any) {
      setHomeError(error.message)
    }
  }

  useEffect(() => {
    const syncPage = () => setPage(getPageFromHash())
    syncPage()
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  useEffect(() => {
    if (session?.token) {
      loadHome(session.token)
      if (page !== 'home') {
        window.location.hash = '/home'
      }
    }
  }, [session?.token])

  useEffect(() => {
    if (!isAuthed && page === 'home') {
      window.location.hash = '/login'
    }
  }, [isAuthed, page])

  const handleLogin = useMemo(() => debounce(async () => {
    if (!login.validateForm()) return

    setNotice({ type: '', message: '' })
    setLoading(true)
    try {
      const payload = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(login.form),
      })
      const nextSession: Session = {
        token: payload?.data?.token,
        username: payload?.data?.username,
        expiresAt: payload?.data?.expiresAt,
      }
      persistSession(nextSession)
      await loadHome(nextSession.token)
      window.location.hash = '/home'
    } catch (error: any) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      setLoading(false)
    }
  }, 300), [login.form])

  const handleRegister = useMemo(() => debounce(async () => {
    if (!register.validateForm()) return

    setNotice({ type: '', message: '' })
    setLoading(true)
    try {
      const payload = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(register.form),
      })
      setNotice({ type: 'success', message: `用户 ${payload?.data?.username || register.form.username} 注册成功` })
      window.location.hash = '/login'
    } catch (error: any) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      setLoading(false)
    }
  }, 300), [register.form])

  const handleLogout = () => {
    persistSession(null)
    setHomeMessage('')
    setHomeError('')
    login.resetForm()
    register.resetForm()
    window.location.hash = '/login'
  }

  const handleChangePassword = async () => {
    setNotice({ type: '', message: '' })
    setLoading(true)
    try {
      const payload = await apiRequest('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(changeForm),
      })
      setNotice({ type: 'success', message: payload?.data?.message || '密码修改成功' })
      setChangeForm({ oldPassword: '', newPassword: '' })
      setChangeOpen(false)
    } catch (error: any) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handlePageSwitch = (target: string) => {
    if (PAGE_KEYS.includes(target)) {
      setNotice({ type: '', message: '' })
      login.setErrors({})
      register.setErrors({})
      window.location.hash = `/${target}`
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Container width="100%" padding={false}>
        {!isAuthed && page === 'login' && (
          <LoginPage
            form={login.form}
            errors={login.errors}
            loading={loading}
            notice={notice}
            onSubmit={handleLogin}
            onSwitch={handlePageSwitch}
            onFieldChange={login.setField}
          />
        )}

        {!isAuthed && page === 'register' && (
          <RegisterPage
            form={register.form}
            errors={register.errors}
            loading={loading}
            notice={notice}
            onSubmit={handleRegister}
            onSwitch={handlePageSwitch}
            onFieldChange={register.setField}
          />
        )}

        {isAuthed && (
          <HomePage
            session={session}
            notice={notice}
            homeMessage={homeMessage}
            homeError={homeError}
            activeMenu={activeMenu}
            onMenuSelect={setActiveMenu}
            onOpenChangePassword={() => setChangeOpen(true)}
            onLogout={handleLogout}
          />
        )}

        <Modal
          open={changeOpen}
          title="修改密码"
          okText="确认修改"
          cancelText="取消"
          onOk={handleChangePassword}
          onCancel={() => setChangeOpen(false)}
        >
          <Form model={changeForm} labelWidth={88}>
            <FormItem name="oldPassword" label="旧密码">
              <Input
                value={changeForm.oldPassword}
                placeholder="请输入旧密码"
                onChange={(value) => setChangeForm((prev) => ({ ...prev, oldPassword: normalizeInput(value) }))}
              />
            </FormItem>
            <FormItem name="newPassword" label="新密码">
              <Input
                value={changeForm.newPassword}
                placeholder="请输入新密码"
                onChange={(value) => setChangeForm((prev) => ({ ...prev, newPassword: normalizeInput(value) }))}
              />
            </FormItem>
          </Form>
        </Modal>
      </Container>
    </div>
  )
}

export default App
