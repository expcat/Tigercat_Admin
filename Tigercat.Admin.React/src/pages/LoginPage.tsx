import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  Message,
} from '@expcat/tigercat-react';
import {
  type AuthForm,
  debounce,
  useAuthForm,
  apiRequest,
  type Session,
} from '../utils';

interface LoginPageProps {
  onSuccess: (session: Session) => void;
  onSwitch: (key: string) => void;
}

function LoginPage({ onSuccess, onSwitch }: LoginPageProps) {
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

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo & Welcome */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-4">
          <span className="text-2xl font-bold text-white">T</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-800">欢迎回来</h1>
        <p className="text-gray-500 mt-1">登录到 Tigercat Admin</p>
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
              onClick={handleLogin}>
              登录
            </Button>
            <div className="text-center text-sm text-gray-500">
              还没有账号？
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                onClick={() => onSwitch('register')}>
                立即注册
              </button>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  );
}

export default LoginPage;
