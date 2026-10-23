import type { TableColumn } from '@expcat/tigercat-core';
import { apiRequest } from './request';
import { getAuthHeaders } from './auth';
import { downloadBlob } from './export';
import type { ImportFile, ImportJob, ImportMappings, ImportPreview } from './types';

export const LAST_IMPORT_JOB_KEY = 'tigercat-admin:last-import-job';
export const EMPTY_IMPORT_MAPPINGS: ImportMappings = { username: null, password: null, displayName: null, roleIds: null };
export const IMPORT_FIELDS: { key: keyof ImportMappings; label: string }[] = [
  { key: 'username', label: '用户名（必填）' }, { key: 'password', label: '密码（必填）' },
  { key: 'displayName', label: '显示名称' }, { key: 'roleIds', label: '角色 ID' },
];
export const IMPORT_ROW_COLUMNS: TableColumn[] = [
  { key: 'rowNumber', dataKey: 'rowNumber', title: 'CSV 行号', width: 110, fixed: 'start' },
  { key: 'username', dataKey: 'username', title: '用户名', width: 170, cardTitle: true },
  { key: 'displayName', dataKey: 'displayName', title: '显示名称', width: 190 },
  { key: 'roleIds', dataKey: 'roleIds', title: '角色 ID', width: 100 },
  { key: 'status', dataKey: 'status', title: '状态', width: 110, render: (row) => ({ ready: '校验通过', pending: '待处理', success: '成功', skipped: '跳过', failed: '失败' }[String(row.status)] ?? String(row.status)) },
  { key: 'message', dataKey: 'message', title: '说明', width: 300 },
  { key: 'userId', dataKey: 'userId', title: '用户 ID', width: 110 },
];
export const IMPORT_STEPS = [{ title: '选择 CSV', description: '用户数据' }, { title: '映射字段', description: '必填列与可选列' }, { title: '预览并导入', description: '校验后实际写入' }];
export function previewUserImport(file: ImportFile, mappings?: ImportMappings, signal?: AbortSignal) {
  return apiRequest<ImportPreview>('/api/import-jobs/preview', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ ...file, mappings }), signal });
}
export function createImportJob(file: ImportFile, mappings: ImportMappings, signal?: AbortSignal) {
  return apiRequest<ImportJob>('/api/import-jobs', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ ...file, mappings }), signal });
}
export function fetchImportJob(id: string, signal?: AbortSignal) {
  return apiRequest<ImportJob>(`/api/import-jobs/${encodeURIComponent(id)}`, { headers: getAuthHeaders(), signal });
}
export async function readImportFile(file: File): Promise<ImportFile> {
  if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('请选择 UTF-8 CSV 文件');
  if (file.size > 1048576) throw new Error('CSV 不能超过 1 MiB');
  try { return { source: file.name, csv: new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()) }; }
  catch { throw new Error('文件不是有效 UTF-8，请转换编码后重新选择'); }
}
export function downloadFailedRows(job: ImportJob) {
  const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = job.rows.filter(row => row.status === 'failed');
  const csv = [['username', 'password', 'displayName', 'roleIds', 'rowNumber', 'error'],
    ...rows.map(row => [row.username, '', row.displayName, row.roleIds, row.rowNumber, row.message])]
    .map(row => row.map(quote).join(',')).join('\r\n');
  downloadBlob(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), `${job.id}-failed.csv`);
}
export function readLastImportJobId(): string { return window.sessionStorage.getItem(LAST_IMPORT_JOB_KEY) ?? ''; }
export function writeLastImportJobId(id: string) { window.sessionStorage.setItem(LAST_IMPORT_JOB_KEY, id); }
