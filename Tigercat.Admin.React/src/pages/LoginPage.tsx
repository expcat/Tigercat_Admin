import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  FormItem,
  Input,
} from '@expcat/tigercat-react';
import { AuthForm, AuthErrors } from '../utils';

interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

interface LoginPageProps {
  form: AuthForm;
  errors?: AuthErrors;
  loading: boolean;
  notice: Notice;
  onSubmit: () => void;
  onSwitch: (key: string) => void;
  onFieldChange: (field: keyof AuthForm, value: any) => void;
}

function LoginPage({
  form,
  errors,
  loading,
  notice,
  onSubmit,
  onSwitch,
  onFieldChange,
}: LoginPageProps) {
  return (
    <Card title="Tigercat Admin 登录" className="max-w-xl mx-auto">
      {notice?.message && (
        <Alert
          type={notice.type || 'info'}
          title={notice.type === 'error' ? '操作失败' : '操作成功'}
          description={notice.message}
          closable={false}
        />
      )}
      <Divider />
      <Form model={form} labelWidth={88}>
        <FormItem name="username" label="用户名">
          <Input
            value={form.username || ''}
            placeholder="请输入用户名"
            onChange={(value) => onFieldChange('username', value)}
            status={errors?.username ? 'error' : undefined}
            errorMessage={errors?.username}
          />
        </FormItem>
        <FormItem name="password" label="密码">
          <Input
            value={form.password || ''}
            type="password"
            placeholder="请输入密码"
            onChange={(value) => onFieldChange('password', value)}
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
            onClick={onSubmit}>
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
