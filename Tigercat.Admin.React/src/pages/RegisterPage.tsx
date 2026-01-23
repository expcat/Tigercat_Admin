import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Divider,
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

  const handleRegister = useMemo(
    () =>
      debounce(async () => {
        if (!validateForm()) return;

        setLoading(true);
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
    [form, validateForm, onSwitch],
  );

  return (
    <Card title="Tigercat Admin 注册" className="max-w-xl mx-auto">
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
            onClick={handleRegister}>
            注册
          </Button>
          <Button
            variant="outline"
            block
            type="button"
            onClick={() => onSwitch('login')}>
            已有账号？去登录
          </Button>
        </div>
      </Form>
    </Card>
  );
}

export default RegisterPage;
