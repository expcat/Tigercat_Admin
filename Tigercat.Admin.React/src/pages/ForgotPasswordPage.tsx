import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Form } from '@expcat/tigercat-react/Form';
import { FormItem } from '@expcat/tigercat-react/FormItem';
import { Input } from '@expcat/tigercat-react/Input';
import { Message } from '@expcat/tigercat-react/Message';
import { Result } from '@expcat/tigercat-react/Result';
import { Steps, StepsItem } from '@expcat/tigercat-react/Steps';
import { Countdown } from '@expcat/tigercat-react/Countdown';
import { InputOTP } from '@expcat/tigercat-react/InputOTP';
import { MaskInput } from '@expcat/tigercat-react/MaskInput';
import {
  apiRequest,
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
  const usePhoneMask = isPhoneIdentity(target);

  const goToLogin = () => navigate('/login');

  const sendCode = async () => {
    const nextTarget = target.trim();
    if (!nextTarget) {
      setTargetError('请输入邮箱或手机号');
      return;
    }
    setTargetError('');
    setCodeLoading(true);
    try {
      const payload = await apiRequest<{ sentTo?: string }>('/api/auth/forgot-password/code', {
        method: 'POST',
        body: JSON.stringify({
          channel: detectForgotChannel(nextTarget),
          target: nextTarget,
        }),
      });
      setSentTo(payload?.data?.sentTo || nextTarget);
      setCanResend(false);
      setCodeDeadline(Date.now() + OTP_RESEND_MS);
      Message.success({ content: '验证码已发送至 ' + (payload?.data?.sentTo || nextTarget), duration: 2500 });
    } catch (error: any) {
      Message.error({ content: error.message, duration: 3000 });
    } finally {
      setCodeLoading(false);
    }
  };

  const submitIdentity = () => {
    if (!target.trim()) {
      setTargetError('请输入邮箱或手机号');
      return;
    }
    setTargetError('');
    if (!code.trim()) {
      setCodeError('请输入验证码');
      return;
    }
    setCodeError('');
    if (!sentTo) {
      Message.warning({ content: '请先获取验证码', duration: 2000 });
      return;
    }
    setCurrent(1);
  };

  const validatePasswords = () => {
    let valid = true;
    if (!password) {
      setPasswordError('请输入新密码');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('密码长度不能少于 6 位');
      valid = false;
    } else {
      setPasswordError('');
    }
    if (confirmPassword !== password) {
      setConfirmError('两次输入的密码不一致');
      valid = false;
    } else {
      setConfirmError('');
    }
    return valid;
  };

  const submitPassword = async () => {
    if (!validatePasswords()) return;
    setLoading(true);
    try {
      await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          channel: detectForgotChannel(target.trim()),
          target: target.trim(),
          code: code.trim(),
          password,
        }),
      });
      setCurrent(2);
    } catch (error: any) {
      Message.error({ content: error.message, duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-x-clip overflow-y-visible shadow-2xl border border-(--tiger-border,#e2e8f0) dark:border-slate-850 bg-(--tiger-bg-card,#ffffff) dark:bg-slate-900/90 backdrop-blur-md animate-fade-in-up"
      style={{
        '--tiger-primary': '#0d9488',
        '--tiger-primary-hover': '#0f766e',
        '--tiger-primary-disabled': '#99f6e4',
        '--tiger-focus-ring': '#0d9488',
      } as React.CSSProperties}
    >
      <div className="hidden md:flex md:w-[42%] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
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

        <div className="relative z-10 text-xs text-cyan-200/80">
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
          <Steps current={current} size="small">
            <StepsItem title="验证身份" />
            <StepsItem title="设置新密码" />
            <StepsItem title="完成" />
          </Steps>
        </div>

        <Card variant="transparent" className="p-0">
          {current === 0 && (
            <Form model={{ target, code }} labelWidth={72} className="min-w-0">
              <FormItem name="target" label="账号">
                {usePhoneMask ? (
                  <div data-testid="forgot-phone-mask">
                    <MaskInput
                      value={target}
                      mask={PHONE_MASK}
                      placeholder="请输入邮箱或手机号"
                      status={targetError ? 'error' : undefined}
                      errorMessage={targetError}
                      onChange={(value) => {
                        setTarget(value);
                        if (targetError) setTargetError('');
                      }}
                    />
                  </div>
                ) : (
                  <Input
                    value={target}
                    placeholder="请输入邮箱或手机号"
                    status={targetError ? 'error' : undefined}
                    errorMessage={targetError}
                    onChange={(value) => {
                      const next = typeof value === 'string' ? value : value.target.value;
                      setTarget(next);
                      if (targetError) setTargetError('');
                    }}
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
                        htmlType="button"
                        onClick={sendCode}
                      >
                        获取验证码
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {sentTo ? (
                <p className="p2-text-secondary mb-3 text-xs">验证码已发送至 {sentTo}</p>
              ) : null}
              <div className="mt-6 flex flex-col gap-3">
                <Button variant="primary" block htmlType="button" onClick={submitIdentity}>
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
            <Form model={{ password, confirmPassword }} labelWidth={88}>
              <FormItem name="password" label="新密码">
                <Input
                  value={password}
                  type="password"
                  placeholder="请输入新密码"
                  onChange={(value) => {
                    const next = typeof value === 'string' ? value : value.target.value;
                    setPassword(next);
                    if (passwordError) setPasswordError('');
                  }}
                  status={passwordError ? 'error' : undefined}
                  errorMessage={passwordError}
                />
              </FormItem>
              <FormItem name="confirmPassword" label="确认密码">
                <Input
                  value={confirmPassword}
                  type="password"
                  placeholder="请再次输入新密码"
                  onChange={(value) => {
                    const next = typeof value === 'string' ? value : value.target.value;
                    setConfirmPassword(next);
                    if (confirmError) setConfirmError('');
                  }}
                  status={confirmError ? 'error' : undefined}
                  errorMessage={confirmError}
                />
              </FormItem>
              <div className="mt-6 flex flex-col gap-3">
                <Button variant="primary" block loading={loading} htmlType="button" onClick={submitPassword}>
                  重置密码
                </Button>
                <Button variant="outline" block htmlType="button" onClick={() => setCurrent(0)}>
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
