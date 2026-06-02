export interface ApiResponse<T = any> {
  code: number;
  message: string;
  success: boolean;
  data: T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiRequest = async <T = any>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> => {
  const { headers: optionHeaders, ...restOptions } = options;
  const hasAuthHeader =
    optionHeaders instanceof Headers
      ? optionHeaders.has('Authorization') || optionHeaders.has('X-Token')
      : Array.isArray(optionHeaders)
        ? optionHeaders.some(([key]) =>
            ['authorization', 'x-token'].includes(key.toLowerCase()),
          )
        : Boolean(
            optionHeaders &&
              ('Authorization' in optionHeaders || 'X-Token' in optionHeaders),
          );
  const response = await fetch(path, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(optionHeaders || {}),
    },
  });

  const rawText = await response.text();
  let payload: any = null;
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.message ||
      payload?.detail ||
      payload?.title ||
      rawText ||
      response.statusText ||
      `请求失败 (${response.status})`;
    if (response.status === 401 && hasAuthHeader && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tigercat:session-expired'));
    }
    throw new ApiError(message, response.status, payload?.code);
  }

  return payload as ApiResponse<T>;
};
