export type ExportFormat = 'csv' | 'json' | 'xlsx';

export interface ExportOptions {
  /** 导出实体类型：users | roles */
  entity: 'users' | 'roles';
  /** 导出格式 */
  format: ExportFormat;
  /** 要导出的字段（为空则导出全部） */
  fields?: string[];
  /** 认证请求头 */
  headers?: HeadersInit;
}

/**
 * 调用后端导出 API 并触发浏览器文件下载。
 * 后端返回的是原始文件流（非 JSON），需用 Blob 方式处理。
 */
export async function exportData(options: ExportOptions): Promise<void> {
  const { entity, format, fields, headers = {} } = options;
  const params = new URLSearchParams({ format });
  if (fields && fields.length > 0) {
    params.set('fields', fields.join(','));
  }

  const response = await fetch(`/api/export/${entity}?${params}`, {
    headers: {
      ...headers,
    },
  });

  if (!response.ok) {
    // 尝试从响应中提取错误信息
    let message = `导出失败 (${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.message) message = errorData.message;
    } catch {
      // 忽略 JSON 解析失败
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  downloadBlob(blob, getFilenameFromResponse(response, entity, format));
}

/**
 * 从 Content-Disposition 头提取文件名，不存在时使用默认名。
 */
function getFilenameFromResponse(
  response: Response,
  entity: string,
  format: ExportFormat,
): string {
  const disposition = response.headers.get('Content-Disposition');
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1].replace(/"/g, ''));
  }
  return `${entity}.${format}`;
}

/**
 * 通过创建临时 <a> 标签触发浏览器下载。
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
