export interface AuthForm {
  username?: string;
  password?: string;
}

export type AuthErrors = Partial<Record<keyof AuthForm, string>>;

export const validate = (form: AuthForm): AuthErrors => {
  const errors: AuthErrors = {};
  if (!form.username?.trim()) errors.username = '请输入用户名';
  if (!form.password) {
    errors.password = '请输入密码';
  } else if (form.password.length < 4) {
    errors.password = '密码长度不能少于4位';
  }
  return errors;
};
