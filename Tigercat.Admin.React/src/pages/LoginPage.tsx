import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Divider,
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
    <Card title="Tigercat Admin 登录" className="max-w-xl mx-auto">
      <Divider />
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
        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="primary"
            block
            loading={loading}
            type="button"
            onClick={handleLogin}>
            登录
          </Button>
          <Button
            variant="outline"
            block
            type="button"
            onClick={() => onSwitch('register')}>
            没有账号？去注册
          </Button>
        </div>
      </Form>
    </Card>
  );
}

export default LoginPage;
