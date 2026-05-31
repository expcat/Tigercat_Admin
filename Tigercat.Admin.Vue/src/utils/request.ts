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
  const { headers: optionHeaders, ...restOptions } = options;
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
    throw new Error(message);
  }

  return payload as ApiResponse<T>;
};
