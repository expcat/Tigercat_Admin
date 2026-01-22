export interface ApiResponse<T = any> {
  code: number;
  message: string;
  success: boolean;
  data: T;
}

export const apiRequest = async <T = any>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> => {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    const message = payload?.message || `请求失败 (${response.status})`;
    throw new Error(message);
  }

  return payload as ApiResponse<T>;
};
