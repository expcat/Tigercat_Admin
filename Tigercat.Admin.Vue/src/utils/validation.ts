export interface AuthForm {
  username?: string;
  password?: string;
}

export type AuthErrors = Partial<Record<keyof AuthForm, string>>;
