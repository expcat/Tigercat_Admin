import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Form } from '@expcat/tigercat-react/Form';
import { FormItem } from '@expcat/tigercat-react/FormItem';
import { Input } from '@expcat/tigercat-react/Input';
import { Message } from '@expcat/tigercat-react/Message';
import { useAuthForm, apiRequest } from '../utils';
import type { FormRules } from '@expcat/tigercat-core';
import { LogoIcon } from '../components/Icons';

const authRules: FormRules = {
  username: { required: true, transform: (value) => String(value ?? '').trim(), message: '请输入用户名' },
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码长度不能少于 6 位' },
  ],
};

function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const { form, setField } = useAuthForm({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (requestRef.current) return;
    const request = new AbortController();
    requestRef.current = request;
    setLoading(true);
    try {
      const payload = await apiRequest<{ username: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...form, username: form.username?.trim() }),
        signal: request.signal,
      });
      if (request.signal.aborted) return;
      if (!payload?.data?.username) throw new Error('注册响应不完整，请重试');
      navigate('/register-success', { replace: true, state: location.state });
    } catch (error: unknown) {
      if (!request.signal.aborted) Message.error({ content: error instanceof Error ? error.message : '注册失败，请重试', duration: 3000 });
    } finally {
      if (!request.signal.aborted) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  const goToLogin = () => {
    navigate('/login', { state: location.state });
  };

  return (
    <div
      className="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-hidden shadow-lg border border-(--tiger-border,#e2e8f0)/30 bg-(--tiger-surface) animate-fade-in-up motion-reduce:animate-none"
      style={{
        '--tiger-primary': 'light-dark(#7c3aed, #c4b5fd)', // violet-600
        '--tiger-primary-foreground': 'light-dark(#ffffff, #0f172a)',
        '--tiger-primary-hover': 'light-dark(#6d28d9, #ddd6fe)', // violet-700
        '--tiger-primary-disabled': 'light-dark(#ddd6fe, #5b21b6)', // violet-200
        '--tiger-focus-ring': 'light-dark(#7c3aed, #c4b5fd)',
      } as React.CSSProperties}
    >
      {/* Left side: branding/decoration */}
      <div className="hidden md:flex md:w-[42%] bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-600 p-8 flex-col justify-between text-white relative overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <LogoIcon size={44} className="shadow-lg rounded-xl" />
            <span className="font-bold text-xl tracking-wider">Tigercat Admin</span>
          </div>
          
          <div className="space-y-6 my-auto pt-6">
            <h2 className="text-2xl font-bold leading-tight">创建您的管理账号</h2>
            <div className="space-y-4 text-pretty text-pink-100 text-sm">
              <div className="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">✓</span>
                <span>即刻体验全功能的后台管理系统</span>
              </div>
              <div className="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">✓</span>
                <span>体验基于 SQLite/Postgres 的完整业务闭环</span>
              </div>
              <div className="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">✓</span>
                <span>轻松配置您自己站点的配色、Logo 和安全策略</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-pink-200/80">
          © 2026 Tigercat Team. All rights reserved.
        </div>
      </div>

      {/* Right side: register form */}
      <div className="w-full md:w-[58%] p-8 md:p-10 flex flex-col justify-center">
        <div className="md:hidden flex items-center justify-center gap-3 mb-6">
          <LogoIcon size={48} className="shadow-md rounded-xl" />
          <h2 className="p2-text-primary text-xl font-bold">Tigercat Admin</h2>
        </div>
        
        <div className="mb-6 text-center md:text-left">
          <h1 className="p2-text-primary text-2xl font-bold tracking-tight">创建账号</h1>
          <p className="p2-text-secondary text-sm mt-1">注册 Tigercat Admin 账号</p>
        </div>

        <Card variant="transparent" className="p-0">
          <Form value={form as unknown as Record<string, unknown>} rules={authRules} labelWidth={88} loading={loading} onSubmit={({ valid }) => { if (valid) void handleRegister(); }}>
            <FormItem name="username" label="用户名">
              <Input
                value={form.username || ''}
                placeholder="请输入用户名"
                onChange={(value) => setField('username', value)}
                autoComplete="username"
                disabled={loading}
              />
            </FormItem>
            <FormItem name="password" label="密码">
              <Input
                value={form.password || ''}
                type="password"
                placeholder="请输入密码"
                onChange={(value) => setField('password', value)}
                autoComplete="new-password"
                disabled={loading}
              />
            </FormItem>
            <div className="mt-8 flex flex-col gap-3">
              <Button
                variant="primary"
                block
                loading={loading}
                type="submit"
              >
                注册
              </Button>
              <div className="p2-text-secondary text-center text-sm">
                已有账号？
                <button
                  type="button"
                  className="font-medium text-[var(--tiger-primary,#3b82f6)] hover:underline"
                  onClick={goToLogin}
                >
                  立即登录
                </button>
              </div>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}

export default RegisterPage;
