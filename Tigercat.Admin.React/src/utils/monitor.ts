import type { TagVariant } from '@expcat/tigercat-core';
import { apiRequest } from './request';
import { getAuthHeaders } from './auth';

export type MonitorNodeStatus = 'healthy' | 'warning' | 'critical';

export interface MonitorNode {
  id: string;
  name: string;
  zone: string;
  cpu: number;
  memory: number;
  status: MonitorNodeStatus;
}

export interface MonitorEventStatus {
  label: string;
  variant: TagVariant;
}

export interface MonitorEvent {
  id: string;
  title: string;
  description: string;
  time: string;
  status: MonitorEventStatus;
}

export interface MonitorSnapshot {
  cpu: number;
  memory: number;
  disk: number;
  qps: number;
  latency: number;
  nodes: MonitorNode[];
  events: MonitorEvent[];
  serverTime: string;
  tickCount?: number;
  lastTickAt?: string;
}

export function fetchMonitorSnapshot() {
  return apiRequest<MonitorSnapshot>('/api/monitor/snapshot', {
    headers: getAuthHeaders(),
  });
}
