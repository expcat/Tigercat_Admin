export interface Session {
  token: string;
  username: string;
  expiresAt: string;
}

export interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}
