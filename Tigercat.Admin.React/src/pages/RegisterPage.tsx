import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  Message,
} from '@expcat/tigercat-react';
import { type AuthForm, debounce, useAuthForm, apiRequest } from '../utils';

interface RegisterPageProps {
  onSwitch: (key: string) => void;
}

function RegisterPage({ onSwitch }: RegisterPageProps) {
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
          const message = `用户 ${payload?.data?.username || form.username} 注册成功`;

          Message.success({
            content: message,
            duration: registerNoticeDuration * 1000,
          });

          clearRegisterRedirectTimer();
          registerRedirectTimerRef.current = window.setTimeout(() => {
            onSwitch('login');
          }, registerNoticeDuration * 1000);
        } catch (error: any) {
          Message.error({
            content: error.message,
            duration: registerNoticeDuration * 1000,
          });
        } finally {
          setLoading(false);
        }
      }, 300),
    [form, onSwitch],
  );

  const handleRegister = () => {
    if (!validateForm()) return;
    setLoading(true);
    doRegister();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo & Welcome */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-4">
          <span className="text-2xl font-bold text-white">T</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-800">创建账号</h1>
        <p className="text-gray-500 mt-1">注册 Tigercat Admin 账号</p>
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
              type="button"
              onClick={handleRegister}>
              注册
            </Button>
            <div className="text-center text-sm text-gray-500">
              已有账号？
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                onClick={() => onSwitch('login')}>
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
