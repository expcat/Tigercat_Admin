import type { GanttTask, TagVariant } from '@expcat/tigercat-core';
import { apiRequest } from './request';
import { getAuthHeaders } from './auth';

import type { Job, JobStatus, CreateJobPayload, UpdateJobPayload, JobForm } from './types';
export type { Job, CreateJobPayload, UpdateJobPayload, JobForm } from './types';

export const JOB_STATUS_META: Record<JobStatus, { label: string; variant: TagVariant }> = {
  running: { label: '运行中（示例）', variant: 'success' },
  paused: { label: '已暂停', variant: 'default' },
  failed: { label: '失败（示例）', variant: 'danger' },
};

export function fetchJobs(signal?: AbortSignal) {
  return apiRequest<Job[]>('/api/jobs', {
    signal,
    headers: getAuthHeaders(),
  });
}

export function createJob(payload: CreateJobPayload) {
  return apiRequest<Job>('/api/jobs', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateJob(id: string, payload: UpdateJobPayload) {
  return apiRequest<Job>(`/api/jobs/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function toGanttTasks(jobs: Job[]): GanttTask[] {
  return jobs.map((job) => ({
    id: job.id,
    label: job.name,
    start: job.start,
    end: job.end,
    progress: job.progress,
    color: job.color,
  }));
}

export function validateJobForm(form: JobForm, cronValid: boolean): { field: keyof JobForm; message: string } | null {
  if (!form.name.trim() || form.name.trim().length > 120) {
    return { field: 'name', message: '任务名称必填，且不能超过 120 字' };
  }
  if (!cronValid || !form.cron.trim() || form.cron.length > 64) {
    return { field: 'cron', message: '请填写有效的 5 段 Cron 表达式，且不能超过 64 字' };
  }
  if (form.concurrency === null || !Number.isInteger(form.concurrency) || form.concurrency < 1 || form.concurrency > 20) {
    return { field: 'concurrency', message: '并发数需为 1–20 的整数' };
  }
  if (form.timeout.length > 16) return { field: 'timeout', message: '超时时间不能超过 16 字' };
  if (form.batchSize.length > 16) return { field: 'batchSize', message: '每批处理条数不能超过 16 字' };
  return null;
}
