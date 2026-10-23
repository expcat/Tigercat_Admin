import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Form } from '@expcat/tigercat-react/Form';
import { FormItem } from '@expcat/tigercat-react/FormItem';
import { Input } from '@expcat/tigercat-react/Input';
import { Message } from '@expcat/tigercat-react/Message';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Countdown } from '@expcat/tigercat-react/Countdown';
import { InputOTP } from '@expcat/tigercat-react/InputOTP';
import {
  useAuthForm,
  apiRequest,
  DEMO_OTP_CODE,
  OTP_LENGTH,
  OTP_RESEND_MS,
  type LoginData,
  type Session,
} from '../utils';
import type { FormRules } from '@expcat/tigercat-core';
import { LogoIcon } from '../components/Icons';

const authRules: FormRules = {
  username: { required: true, transform: (value) => String(value ?? '').trim(), message: '请输入用户名' },
  password: { required: true, message: '请输入密码' },
};

interface LoginPageProps {
  onSuccess: (session: Session) => void | Promise<void>;
}

function LoginPage({ onSuccess }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const requestRef = useRef<AbortController | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const { form, setField } = useAuthForm({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [otpUsername, setOtpUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState('');
  const [otpDeadline, setOtpDeadline] = useState<number | null>(null);
  const [otpCanResend, setOtpCanResend] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpNotice, setOtpNotice] = useState('');

  const startOtp = (username: string, challengeId?: string) => {
    setOtpUsername(username);
    setOtpCode('');
    setOtpChallengeId(challengeId || '');
    setOtpCanResend(false);
    setOtpDeadline(Date.now() + OTP_RESEND_MS);
    setOtpError('');
    setOtpNotice('');
    setStep('otp');
  };

  const handleLogin = async (resend = false) => {
    if (requestRef.current && !requestRef.current.signal.aborted) return;
    const request = new AbortController();
    requestRef.current = request;
    setLoading(true);
    setOtpError('');
    setOtpNotice('');
    try {
      const payload = await apiRequest<LoginData>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ ...form, username: form.username?.trim() }),
        signal: request.signal,
      });
      if (request.signal.aborted) return;
      const data = payload?.data;
      if (data?.requiresTwoFactor) {
        startOtp(data.username || form.username?.trim() || '', data.challengeId);
        if (resend) setOtpNotice('验证码已重新获取，演示验证码：' + DEMO_OTP_CODE);
      } else {
        if (!data?.token || !data.username || !data.expiresAt) throw new Error('登录响应不完整，请重试');
        await onSuccess({ token: data.token, username: data.username, expiresAt: data.expiresAt });
      }
    } catch (error: unknown) {
      if (request.signal.aborted) return;
      const content = error instanceof Error ? error.message : '登录失败，请重试';
      if (resend) setOtpError(content);
      Message.error({ content, duration: 3000 });
    } finally {
      if (requestRef.current === request && !request.signal.aborted) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleVerify = async () => {
    if (requestRef.current || otpCode.length !== OTP_LENGTH) return;
    const request = new AbortController();
    requestRef.current = request;
    setLoading(true);
    setOtpError('');
    setOtpNotice('');
    try {
      const payload = await apiRequest<Session>('/api/auth/two-factor/verify', {
        method: 'POST',
        body: JSON.stringify({ username: otpUsername, code: otpCode, challengeId: otpChallengeId || undefined }),
        signal: request.signal,
      });
      if (request.signal.aborted) return;
      const data = payload?.data;
      if (!data?.token || !data.username || !data.expiresAt) throw new Error('登录响应不完整，请重试');
      await onSuccess(data);
    } catch (error: unknown) {
      if (request.signal.aborted) return;
      const content = error instanceof Error ? error.message : '验证码校验失败，请重试';
      setOtpError(content);
      Message.error({ content, duration: 3000 });
      requestAnimationFrame(() => otpRef.current?.focus());
    } finally {
      if (requestRef.current === request && !request.signal.aborted) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleResend = () => {
    if (otpCanResend && !loading) void handleLogin(true);
  };

  const backToLogin = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setStep('login');
    requestAnimationFrame(() => usernameRef.current?.focus());
    setOtpCode('');
    setOtpUsername('');
    setOtpChallengeId('');
    setOtpDeadline(null);
    setOtpCanResend(false);
    setOtpError('');
    setOtpNotice('');
    setLoading(false);
  };

  const goToRegister = () => {
    navigate('/register', { state: location.state });
  };

  const goToForgotPassword = () => {
    navigate('/forgot-password', { state: location.state });
  };

  return (
    <div
      className="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-hidden shadow-lg border border-(--tiger-border,#e2e8f0)/30 bg-(--tiger-surface) animate-fade-in-up motion-reduce:animate-none"
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
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <LogoIcon size={44} className="shadow-lg rounded-xl" />
            <span className="font-bold text-xl tracking-wider">Tigercat Admin</span>
          </div>
          
          <div className="space-y-6 my-auto pt-6">
            <h2 className="text-2xl font-bold leading-tight">
              极速、精美的全栈<br />管理系统解决方案
            </h2>
            <div className="space-y-4 text-pretty text-indigo-100 text-sm">
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

      {/* Right side: login / OTP form */}
      <div className="w-full md:w-[58%] p-8 md:p-10 flex flex-col justify-center min-w-0">
        <div className="md:hidden flex items-center justify-center gap-3 mb-6">
          <LogoIcon size={48} className="shadow-md rounded-xl" />
          <h2 className="p2-text-primary text-xl font-bold">Tigercat Admin</h2>
        </div>

        {step === 'login' ? (
          <>
            <div className="mb-6 text-center md:text-left">
              <h1 className="p2-text-primary text-2xl font-bold tracking-tight">欢迎回来</h1>
              <p className="p2-text-secondary text-sm mt-1">请输入您的凭据登录系统</p>
            </div>

            <Card variant="transparent" className="p-0">
              <Form value={form as unknown as Record<string, unknown>} rules={authRules} labelWidth={88} loading={loading} onSubmit={({ valid }) => { if (valid) void handleLogin(); }}>
                <FormItem name="username" label="用户名">
                  <Input
                    ref={usernameRef}
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
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </FormItem>
                <div className="mt-2 mb-2 text-right">
                  <button
                    type="button"
                    className="text-sm font-medium text-[var(--tiger-primary,#3b82f6)] hover:underline"
                    onClick={goToForgotPassword}
                  >
                    忘记密码？
                  </button>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    variant="primary"
                    block
                    loading={loading}
                    type="submit"
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
          </>
        ) : (
          <>
            <div className="mb-6 text-center md:text-left">
              <h1 className="p2-text-primary text-2xl font-bold tracking-tight">两步验证</h1>
              <p className="p2-text-secondary text-sm mt-1">
                请输入账号 {otpUsername} 的 6 位验证码
              </p>
            </div>

            <Card variant="transparent" className="p-0">
              <div className="space-y-4 min-w-0">
                <Alert
                  type="info"
                  title="演示验证码：123456"
                  description="验证通过后才会写入会话，返回登录可重新输入凭据。"
                  showIcon
                />
                {otpError ? <Alert type="error" title={otpError} showIcon /> : null}
                {otpNotice ? <Alert type="success" title={otpNotice} showIcon /> : null}
                <div data-testid="auth-otp-input" className="flex justify-center">
                  <InputOTP
                    ref={otpRef}
                    value={otpCode}
                    length={OTP_LENGTH}
                    type="numeric"
                    autoFocus
                    ariaLabel="验证码"
                    disabled={loading}
                    status={otpError ? 'error' : undefined}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleVerify(); } }}
                    onChange={(value) => { setOtpCode(value); setOtpError(''); }}
                  />
                </div>
                <div className="flex items-center justify-center min-h-8">
                  {otpDeadline && !otpCanResend ? (
                    <Countdown
                      value={otpDeadline}
                      format="s"
                      suffix="秒后可重新获取"
                      title="演示验证码"
                      onFinish={() => setOtpCanResend(true)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-sm font-medium text-[var(--tiger-primary,#3b82f6)] hover:underline"
                      disabled={loading}
                      onClick={handleResend}
                    >
                      重新获取验证码
                    </button>
                  )}
                </div>
                <Button
                  variant="primary"
                  block
                  loading={loading}
                  disabled={otpCode.length !== OTP_LENGTH}
                  type="button"
                  onClick={handleVerify}
                >
                  验证
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm p2-text-secondary hover:underline"
                    onClick={backToLogin}
                  >
                    返回登录
                  </button>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
