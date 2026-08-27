import { apiRequest } from './request';
import { getAuthHeaders } from './auth';

export const LAST_IMPORT_JOB_KEY = 'tigercat-admin:last-import-job';

export type ImportJobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ImportMode = 'append' | 'overwrite' | 'upsert';
export type ImportConflict = 'skip' | 'overwrite' | 'error';

export interface ImportJobResult {
  imported: number;
  skipped: number;
  message: string;
}

export interface ImportJob {
  id: string;
  source: string;
  target: string[];
  mappings: string[];
  mode: ImportMode;
  conflict: ImportConflict;
  batchSize: number;
  status: ImportJobStatus;
  progress: number;
  result: ImportJobResult | null;
}

export interface CreateImportJobPayload {
  source: string;
  target: string[];
  mappings: string[];
  mode: ImportMode;
  conflict: ImportConflict;
  batchSize?: number;
}

export function createImportJob(payload: CreateImportJobPayload) {
  return apiRequest<ImportJob>('/api/import-jobs', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function fetchImportJob(id: string) {
  return apiRequest<ImportJob>(`/api/import-jobs/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });
}

export function readLastImportJobId(): string {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(LAST_IMPORT_JOB_KEY) ?? '';
}

export function writeLastImportJobId(id: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(LAST_IMPORT_JOB_KEY, id);
}

export function clearLastImportJobId() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(LAST_IMPORT_JOB_KEY);
}
