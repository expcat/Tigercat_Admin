import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Form } from '@expcat/tigercat-react/Form';
import { FormItem } from '@expcat/tigercat-react/FormItem';
import { Input } from '@expcat/tigercat-react/Input';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Message } from '@expcat/tigercat-react/Message';
import { Result } from '@expcat/tigercat-react/Result';
import { Steps, StepsItem } from '@expcat/tigercat-react/Steps';
import { Countdown } from '@expcat/tigercat-react/Countdown';
import { InputOTP } from '@expcat/tigercat-react/InputOTP';
import { MaskInput } from '@expcat/tigercat-react/MaskInput';
import {
  apiRequest,
  ApiError,
  DEMO_OTP_CODE,
  detectForgotChannel,
  isPhoneIdentity,
  OTP_LENGTH,
  OTP_RESEND_MS,
  PHONE_MASK,
} from '../utils';
import { LogoIcon } from '../components/Icons';

type ForgotStep = 0 | 1 | 2;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const [current, setCurrent] = useState<ForgotStep>(0);
  const [target, setTarget] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [targetError, setTargetError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeDeadline, setCodeDeadline] = useState<number | null>(null);
  const [canResend, setCanResend] = useState(true);
  const [sentTo, setSentTo] = useState('');
  const [sentTarget, setSentTarget] = useState('');
  const [submitError, setSubmitError] = useState('');
  const usePhoneMask = isPhoneIdentity(target);

  const focusField = (name: string) => requestAnimationFrame(() => {
    pageRef.current?.querySelector<HTMLInputElement>(name === 'code'
      ? '[data-testid="auth-otp-input"] input:not([type="hidden"])'
      : name === 'target' ? 'input[autocomplete="username"]'
      : `input[name="${name}"]`)?.focus();
  });
  const normalizeTarget = (value: string) => value.includes('@') ? value.trim() : value.replace(/\s/g, '');
  const goToLogin = () => navigate('/login', { state: location.state });

  const handleTargetChange = (value: string) => {
    if (normalizeTarget(value) !== normalizeTarget(target)) {
      requestRef.current?.abort();
      requestRef.current = null;
      setCodeLoading(false);
      setSentTarget('');
      setSentTo('');
      setCode('');
      setCodeError('');
      setCanResend(true);
      setCodeDeadline(null);
      setSubmitError('');
    }
    if (isPhoneIdentity(value) !== usePhoneMask) focusField('target');
    setTarget(value);
    setTargetError('');
  };

  const validateIdentity = () => {
    const value = normalizeTarget(target);
    const valid = value.includes('@') ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : /^1\d{10}$/.test(value);
    setTargetError(valid ? '' : '请输入有效的邮箱或 11 位手机号');
    if (!valid) focusField('target');
    return valid;
  };

  const sendCode = async () => {
    if (requestRef.current || !canResend || !validateIdentity()) return;
    const nextTarget = normalizeTarget(target);
    const request = new AbortController();
    requestRef.current = request;
    setSubmitError('');
    setCodeLoading(true);
    try {
      const payload = await apiRequest<{ sentTo: string }>('/api/auth/forgot-password/code', {
        method: 'POST',
        body: JSON.stringify({ channel: detectForgotChannel(nextTarget), target: nextTarget }),
        signal: request.signal,
      });
      if (request.signal.aborted) return;
      setSentTo(payload?.data?.sentTo || nextTarget);
      setSentTarget(nextTarget);
      setCode('');
      setCodeError('');
      setCanResend(false);
      setCodeDeadline(Date.now() + OTP_RESEND_MS);
      Message.success({ content: '已获取验证信息：' + (payload?.data?.sentTo || nextTarget), duration: 2500 });
      focusField('code');
    } catch (error: unknown) {
      if (!request.signal.aborted) setSubmitError(error instanceof Error ? error.message : '获取验证码失败，请重试');
    } finally {
      if (requestRef.current === request && !request.signal.aborted) {
        requestRef.current = null;
        setCodeLoading(false);
      }
    }
  };

  const submitIdentity = () => {
    if (codeLoading || !validateIdentity()) return;
    if (!sentTarget || sentTarget !== normalizeTarget(target)) {
      setTargetError('请先为当前账号获取验证码');
      focusField('target');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setCodeError('请输入 6 位验证码');
      focusField('code');
      return;
    }
    setCodeError('');
    setSubmitError('');
    setCurrent(1);
    focusField('password');
  };

  const backToIdentity = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setSubmitError('');
    setCurrent(0);
    focusField('code');
  };

  const submitPassword = async () => {
    if (requestRef.current) return;
    const nextPasswordError = password.length < 6 ? '密码长度不能少于 6 位' : '';
    const nextConfirmError = confirmPassword !== password ? '两次输入的密码不一致' : '';
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    if (nextPasswordError || nextConfirmError) {
      focusField(nextPasswordError ? 'password' : 'confirmPassword');
      return;
    }
    const request = new AbortController();
    requestRef.current = request;
    setSubmitError('');
    setLoading(true);
    try {
      await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ channel: detectForgotChannel(sentTarget), target: sentTarget, code, password }),
        signal: request.signal,
      });
      if (!request.signal.aborted) setCurrent(2);
    } catch (error: unknown) {
      if (request.signal.aborted) return;
      const content = error instanceof Error ? error.message : '重置失败，请重试';
      if (error instanceof ApiError && error.status === 400 && content.includes('验证码')) {
        setCurrent(0);
        setCodeError(content);
        focusField('code');
      } else if (error instanceof ApiError && error.status === 400 && content.includes('密码')) {
        setPasswordError(content);
        focusField('password');
      } else setSubmitError(content);
    } finally {
      if (requestRef.current === request && !request.signal.aborted) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  return (
    <div
      ref={pageRef}
      className="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-x-clip overflow-y-visible shadow-lg border border-(--tiger-border,#e2e8f0)/30 bg-(--tiger-surface) animate-fade-in-up motion-reduce:animate-none"
      style={{
        '--tiger-primary': '#4f46e5',
        '--tiger-primary-hover': '#4338ca',
        '--tiger-primary-disabled': '#c7d2fe',
        '--tiger-focus-ring': '#4f46e5',
      } as React.CSSProperties}
    >
      <div className="hidden md:flex md:w-[42%] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <LogoIcon size={44} className="shadow-lg rounded-xl" />
            <span className="font-bold text-xl tracking-wider">Tigercat Admin</span>
          </div>
          <div className="space-y-6 my-auto pt-6">
            <h2 className="text-2xl font-bold leading-tight">找回账号访问权限</h2>
            <div className="space-y-4 text-pretty text-indigo-100 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">1</span>
                <span>验证邮箱或手机号身份</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">2</span>
                <span>设置不少于 6 位的新密码</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white font-semibold">3</span>
                <span>完成后返回登录页继续使用</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-indigo-200/80">
          © 2026 Tigercat Team. All rights reserved.
        </div>
      </div>

      <div className="w-full md:w-[58%] p-8 md:p-10 flex flex-col justify-center min-w-0">
        <div className="md:hidden flex items-center justify-center gap-3 mb-6">
          <LogoIcon size={48} className="shadow-md rounded-xl" />
          <h2 className="p2-text-primary text-xl font-bold">Tigercat Admin</h2>
        </div>

        <div className="mb-6 text-center md:text-left">
          <h1 className="p2-text-primary text-2xl font-bold tracking-tight">忘记密码</h1>
          <p className="p2-text-secondary text-sm mt-1">通过邮箱或手机号重置登录密码</p>
        </div>

        <div className="mb-6 overflow-x-auto">
          <Steps current={current} size="sm">
            <StepsItem title="填写验证信息" description="邮箱 / 手机号" />
            <StepsItem title="设置新密码" description="不少于 6 位" />
            <StepsItem title="完成" description="返回登录" />
          </Steps>
        </div>

        <Card variant="transparent" className="p-0">
          {submitError && <Alert type="error" title={submitError} className="mb-4" showIcon />}
          {current === 0 && (
            <Form value={{ target, code }} labelWidth={72} className="min-w-0" onSubmit={submitIdentity}>
              <FormItem name="target" label="账号">
                {usePhoneMask ? (
                  <div data-testid="forgot-phone-mask">
                    <MaskInput
                      name="target"
                      autoComplete="username"
                      value={target}
                      mask={PHONE_MASK}
                      placeholder="请输入邮箱或手机号"
                      status={targetError ? 'error' : undefined}
                      errorMessage={targetError}
                      onChange={handleTargetChange}
                    />
                  </div>
                ) : (
                  <Input
                    name="target"
                    autoComplete="username"
                    value={target}
                    placeholder="请输入邮箱或手机号"
                    status={targetError ? 'error' : undefined}
                    errorMessage={targetError}
                    onChange={(value) => handleTargetChange(String(value))}
                  />
                )}
              </FormItem>
              <div className="mb-4 min-w-0 space-y-2">
                <p className="p2-text-primary text-sm">验证码</p>
                <div className="flex min-w-0 flex-col gap-3">
                  <div data-testid="auth-otp-input" className="flex min-w-0 w-full justify-start overflow-x-auto">
                    <InputOTP
                      value={code}
                      length={OTP_LENGTH}
                      size="sm"
                      type="numeric"
                      ariaLabel="验证码"
                      status={codeError ? 'error' : undefined}
                      errorMessage={codeError}
                      onChange={(value) => {
                        setCode(value);
                        if (codeError) setCodeError('');
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3 min-h-8">
                    {codeDeadline && !canResend ? (
                      <Countdown
                        value={codeDeadline}
                        format="s"
                        suffix="秒"
                        onFinish={() => setCanResend(true)}
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={codeLoading}
                        type="button"
                        onClick={sendCode}
                      >
                        获取验证码
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {sentTo ? (
                <p className="p2-text-secondary mb-3 text-xs">验证账号：{sentTo}</p>
              ) : null}
              <p className="p2-text-secondary text-xs">演示验证码：{DEMO_OTP_CODE}，随重置请求一起校验。</p>
              <div className="mt-6 flex flex-col gap-3">
                <Button variant="primary" block type="submit" disabled={codeLoading}>
                  下一步
                </Button>
                <div className="text-center">
                  <button type="button" className="text-sm p2-text-secondary hover:underline" onClick={goToLogin}>
                    返回登录
                  </button>
                </div>
              </div>
            </Form>
          )}

          {current === 1 && (
            <Form value={{ password, confirmPassword }} labelWidth={88} loading={loading} onSubmit={submitPassword}>
              <FormItem name="password" label="新密码">
                <Input
                  name="password"
                  autoComplete="new-password"
                  disabled={loading}
                  value={password}
                  type="password"
                  placeholder="请输入新密码"
                  onChange={(value) => {
                    setPassword(String(value));
                    if (passwordError) setPasswordError('');
                  }}
                  status={passwordError ? 'error' : undefined}
                  errorMessage={passwordError}
                />
              </FormItem>
              <FormItem name="confirmPassword" label="确认密码">
                <Input
                  name="confirmPassword"
                  autoComplete="new-password"
                  disabled={loading}
                  value={confirmPassword}
                  type="password"
                  placeholder="请再次输入新密码"
                  onChange={(value) => {
                    setConfirmPassword(String(value));
                    if (confirmError) setConfirmError('');
                  }}
                  status={confirmError ? 'error' : undefined}
                  errorMessage={confirmError}
                />
              </FormItem>
              <div className="mt-6 flex flex-col gap-3">
                <Button variant="primary" block loading={loading} type="submit">
                  重置密码
                </Button>
                <Button variant="outline" block type="button" onClick={backToIdentity}>
                  上一步
                </Button>
              </div>
            </Form>
          )}

          {current === 2 && (
            <Result
              status="success"
              title="密码已重置"
              subTitle="请使用新密码登录系统"
              extra={
                <Button variant="primary" onClick={goToLogin}>
                  返回登录
                </Button>
              }
            />
          )}
        </Card>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
