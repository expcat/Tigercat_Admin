import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  Message,
} from '@expcat/tigercat-react';
import { debounce, useAuthForm, apiRequest } from '../utils';
import { LogoIcon } from '../components/Icons';

function RegisterPage() {
  const navigate = useNavigate();
  const { form, errors, setField, validateForm } = useAuthForm({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const registerNoticeDuration = 3;
  const registerRedirectTimerRef = useRef<number | null>(null);

  const clearRegisterRedirectTimer = () => {
    if (registerRedirectTimerRef.current) {
      window.clearTimeout(registerRedirectTimerRef.current);
      registerRedirectTimerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearRegisterRedirectTimer();
    },
    [],
  );

  const doRegister = useMemo(
    () =>
      debounce(async () => {
        try {
          const payload = await apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(form),
          });
          const message = `用户 ${payload?.data?.username || form.username} 注册成功，${registerNoticeDuration} 秒后跳转登录`;

          Message.success({
            content: message,
            duration: registerNoticeDuration * 1000,
          });

          clearRegisterRedirectTimer();
          registerRedirectTimerRef.current = window.setTimeout(() => {
            navigate('/login');
          }, registerNoticeDuration * 1000);
        } catch (error: any) {
          clearRegisterRedirectTimer();
          Message.error({
            content: error.message,
            duration: registerNoticeDuration * 1000,
          });
        } finally {
          setLoading(false);
        }
      }, 300),
    [form, navigate],
  );

  const handleRegister = () => {
    if (!validateForm()) return;
    setLoading(true);
    doRegister();
  };

  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="w-full max-w-md mx-auto px-1 sm:px-0">
      {/* Logo & Welcome */}
      <div className="text-center mb-8">
        <div className="inline-flex mb-4">
          <LogoIcon size={64} />
        </div>
        <h1 className="p2-text-primary text-2xl font-semibold">创建账号</h1>
        <p className="p2-text-secondary mt-1">注册 Tigercat Admin 账号</p>
      </div>

      <Card className="shadow-xl border-0">
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
              onClick={handleRegister}>
              注册
            </Button>
            <div className="p2-text-secondary text-center text-sm">
              已有账号？
              <button
                type="button"
                className="font-medium text-(--tiger-primary,#3b82f6) hover:underline"
                onClick={goToLogin}>
                立即登录
              </button>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  );
}

export default RegisterPage;
