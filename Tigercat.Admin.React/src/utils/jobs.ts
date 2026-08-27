import type { GanttTask, TagVariant } from '@expcat/tigercat-core';
import { apiRequest } from './request';
import { getAuthHeaders } from './auth';

export type JobStatus = 'running' | 'paused' | 'failed';

export interface Job {
  id: string;
  name: string;
  cron: string;
  concurrency: number;
  timeout: string;
  batchSize: string;
  enabled: boolean;
  status: JobStatus;
  lastRun: string;
  nextRun: string;
  progress: number;
  phase: number;
  start: string;
  end: string;
  color: string;
}

export interface CreateJobPayload {
  name: string;
  cron: string;
  concurrency: number;
  timeout: string;
  batchSize: string;
  enabled: boolean;
}

export type UpdateJobPayload = Partial<CreateJobPayload> & {
  status?: JobStatus;
};

export const JOB_STATUS_META: Record<JobStatus, { label: string; variant: TagVariant }> = {
  running: { label: '运行中', variant: 'success' },
  paused: { label: '已暂停', variant: 'default' },
  failed: { label: '失败', variant: 'danger' },
};

export function fetchJobs() {
  return apiRequest<Job[]>('/api/jobs', {
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
