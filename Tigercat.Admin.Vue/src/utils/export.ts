import type { DataExportFormat, TableColumn } from '@expcat/tigercat-core'
import type { AuditExportField, ExportFieldOption, ReportExportField, ReportType } from './types'

export type ExportFormat = 'csv' | 'json' | 'xlsx';

export const EXPORT_FORMATS: ExportFormat[] = ['csv', 'json', 'xlsx'];

/** Official DataExport 2.1.1 only types `xlsx` / `markdown`; pages skip its client serializer. */
export const DATA_EXPORT_TRIGGER_FORMATS: DataExportFormat[] = ['xlsx'];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: 'CSV',
  json: 'JSON',
  xlsx: 'Excel',
};

export const REPORT_EXPORT_FIELDS: ExportFieldOption<ReportExportField>[] = [
  { key: 'visits', label: '访问量' },
  { key: 'orders', label: '订单数' },
  { key: 'conversionRate', label: '转化率' },
  { key: 'revenue', label: '收入' },
  { key: 'channel', label: '渠道' },
  { key: 'channelVisits', label: '渠道访问量' },
  { key: 'channelOrders', label: '渠道订单数' },
  { key: 'channelRate', label: '渠道转化率' },
  { key: 'channelAmount', label: '渠道金额' },
];

export const OVERVIEW_EXPORT_FIELDS: ExportFieldOption[] = [
  { key: 'section', label: '分区' },
  { key: 'key', label: '字段' },
  { key: 'label', label: '名称' },
  { key: 'value', label: '值' },
];

export const AUDIT_EXPORT_FIELDS: ExportFieldOption<AuditExportField>[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: '标题' },
  { key: 'eventType', label: '事件类型' },
  { key: 'category', label: '分类' },
  { key: 'occurredAtUtc', label: '发生时间' },
  { key: 'actor', label: '操作者' },
  { key: 'description', label: '说明' },
];

export const DATA_EXPORT_PLACEHOLDER_ROWS: Record<string, unknown>[] = [{ _skip: true }];

const SKIP_CLIENT_DATA_EXPORT = 'TIGERCAT_ADMIN_USE_API_EXPORT';

export function skipClientDataExport(): never {
  throw new Error(SKIP_CLIENT_DATA_EXPORT);
}

export function isSkipClientDataExport(error: unknown): boolean {
  return error instanceof Error && error.message === SKIP_CLIENT_DATA_EXPORT;
}

export function toExportColumns(fields: ExportFieldOption[]): TableColumn[] {
  return fields.map((field) => ({
    key: field.key,
    title: field.label,
    dataKey: field.key,
  }));
}

export function handleDataExportError(
  error: unknown,
  format: ExportFormat,
  onExport: (format: ExportFormat) => void | Promise<void>,
  onError?: (message: string) => void,
): void {
  if (isSkipClientDataExport(error)) {
    void onExport(format);
    return;
  }
  onError?.(error instanceof Error ? error.message : '导出失败');
}

export interface ExportOptions {
  /** 导出实体类型：users | roles */
  entity: 'users' | 'roles';
  /** 导出格式 */
  format: ExportFormat;
  /** 要导出的字段（为空则导出全部） */
  fields?: string[];
  /** 附加查询参数，如 keyword/status/sortBy/sortOrder */
  query?: Record<string, string | number | null | undefined>;
  /** 认证请求头 */
  headers?: HeadersInit;
}

/**
 * 调用后端导出 API 并触发浏览器文件下载。
 * 后端返回的是原始文件流（非 JSON），需用 Blob 方式处理。
 */
export async function exportData(options: ExportOptions): Promise<void> {
  const { entity, format, fields, query, headers } = options;
  const params = new URLSearchParams({ format });
  if (fields && fields.length > 0) {
    params.set('fields', fields.join(','));
  }
  appendQueryParams(params, query);

  const response = await fetch(`/api/export/${entity}?${params}`, {
    headers: headers ? new Headers(headers) : undefined,
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

export async function exportAuditLogs(options: {
  format?: ExportFormat;
  fields?: string[];
  query?: Record<string, string | number | null | undefined>;
  headers?: HeadersInit;
} = {}): Promise<void> {
  const format = options.format ?? 'csv';
  const params = new URLSearchParams({ format });
  if (options.fields && options.fields.length > 0) {
    params.set('fields', options.fields.join(','));
  }
  appendQueryParams(params, options.query);
  await downloadExportResponse(`/api/audit-logs/export?${params}`, options.headers, 'audit-logs', format);
}

export async function exportReports(options: {
  type: ReportType;
  format: ExportFormat;
  fields?: string[];
  headers?: HeadersInit;
}): Promise<void> {
  const params = new URLSearchParams({
    type: options.type,
    format: options.format,
  });
  if (options.fields && options.fields.length > 0) {
    params.set('fields', options.fields.join(','));
  }
  await downloadExportResponse(`/api/export/reports?${params}`, options.headers, 'reports', options.format);
}

export async function exportOverview(options: {
  format: ExportFormat;
  days?: number;
  headers?: HeadersInit;
}): Promise<void> {
  const params = new URLSearchParams({ format: options.format });
  if (options.days != null) {
    params.set('days', String(options.days));
  }
  await downloadExportResponse(`/api/export/overview?${params}`, options.headers, 'overview', options.format);
}

async function downloadExportResponse(
  url: string,
  headers: HeadersInit | undefined,
  entity: string,
  format: ExportFormat,
): Promise<void> {
  const response = await fetch(url, {
    headers: headers ? new Headers(headers) : undefined,
  });

  if (!response.ok) {
    let message = `导出失败 (${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.message) message = errorData.message;
    } catch {
      // ignore non-JSON response
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

function appendQueryParams(
  params: URLSearchParams,
  query?: Record<string, string | number | null | undefined>,
) {
  if (!query) return;

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });
}
