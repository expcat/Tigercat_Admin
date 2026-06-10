import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  Message,
} from '@expcat/tigercat-react';
import { debounce, useAuthForm, apiRequest, type Session } from '../utils';
import { LogoIcon } from '../components/Icons';

interface LoginPageProps {
  onSuccess: (session: Session) => void;
}

function LoginPage({ onSuccess }: LoginPageProps) {
  const navigate = useNavigate();
  const { form, errors, setField, validateForm } = useAuthForm({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const doLogin = useMemo(
    () =>
      debounce(async () => {
        try {
          const payload = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(form),
          });
          const nextSession: Session = {
            token: payload?.data?.token,
            username: payload?.data?.username,
            expiresAt: payload?.data?.expiresAt,
          };
          onSuccess(nextSession);
        } catch (error: any) {
          Message.error({
            content: error.message,
            duration: 3000,
          });
        } finally {
          setLoading(false);
        }
      }, 300),
    [form, onSuccess],
  );

  const handleLogin = () => {
    if (!validateForm()) return;
    setLoading(true);
    doLogin();
  };

  const goToRegister = () => {
    navigate('/register');
  };

  return (
    <div
      className="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-(--tiger-border,#e2e8f0) dark:border-slate-850 bg-(--tiger-bg-card,#ffffff) dark:bg-slate-900/90 backdrop-blur-md animate-fade-in-up"
      style={{
        '--tiger-primary': '#4f46e5', // indigo-600
        '--tiger-primary-hover': '#4338ca', // indigo-700
        '--tiger-primary-disabled': '#c7d2fe', // indigo-200
        '--tiger-focus-ring': '#4f46e5',
      } as React.CSSProperties}
    >
      {/* Left side: branding/decoration */}
      <div className="hidden md:flex md:w-[42%] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 flex-col justify-between text-white relative overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <LogoIcon size={44} className="shadow-lg rounded-xl" />
            <span className="font-bold text-xl tracking-wider">Tigercat Admin</span>
          </div>
          
          <div className="space-y-6 my-auto pt-6">
            <h2 className="text-2xl font-bold leading-tight">极速、精美的全栈管理系统解决方案</h2>
            <div className="space-y-4 text-indigo-100 text-sm">
              <div className="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">1</span>
                <span>基于 .NET 10 Minimal API 与 Aspire 编排</span>
              </div>
              <div className="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">2</span>
                <span>接入 Tigercat UI 规范设计，支持无缝暗色模式</span>
              </div>
              <div className="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">3</span>
                <span>提供双端 (Vue/React) 一致的高质量用户体验</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-indigo-200/80">
          © 2026 Tigercat Team. All rights reserved.
        </div>
      </div>

      {/* Right side: login form */}
      <div className="w-full md:w-[58%] p-8 md:p-10 flex flex-col justify-center">
        <div className="md:hidden flex items-center justify-center gap-3 mb-6">
          <LogoIcon size={48} className="shadow-md rounded-xl" />
          <h2 className="p2-text-primary text-xl font-bold">Tigercat Admin</h2>
        </div>
        
        <div className="mb-6 text-center md:text-left">
          <h1 className="p2-text-primary text-2xl font-bold tracking-tight">欢迎回来</h1>
          <p className="p2-text-secondary text-sm mt-1">请输入您的凭据登录系统</p>
        </div>

        <Card variant="transparent" className="p-0">
          <Form model={form} labelWidth={88}>
            <FormItem name="username" label="用户名">
              <Input
                value={form.username || ''}
                placeholder="请输入用户名"
                onChange={(value) => setField('username', value)}
                status={errors?.username ? 'error' : undefined}
                errorMessage={errors?.username}
              />
            </FormItem>
            <FormItem name="password" label="密码">
              <Input
                value={form.password || ''}
                type="password"
                placeholder="请输入密码"
                onChange={(value) => setField('password', value)}
                status={errors?.password ? 'error' : undefined}
                errorMessage={errors?.password}
              />
            </FormItem>
            <div className="mt-8 flex flex-col gap-3">
              <Button
                variant="primary"
                block
                loading={loading}
                htmlType="button"
                onClick={handleLogin}
              >
                登录
              </Button>
              <div className="p2-text-secondary text-center text-sm">
                还没有账号？
                <button
                  type="button"
                  className="font-medium text-[var(--tiger-primary,#3b82f6)] hover:underline"
                  onClick={goToRegister}
                >
                  立即注册
                </button>
              </div>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
