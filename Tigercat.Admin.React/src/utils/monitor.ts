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

export function startMonitorLive(
  intervalSec: number,
  onSnapshot: (data: MonitorSnapshot) => void,
  onError: (error: unknown) => void,
): () => void {
  const abort = new AbortController();
  void runMonitorLive(intervalSec, onSnapshot, onError, abort.signal);
  return () => abort.abort();
}

async function runMonitorLive(
  intervalSec: number,
  onSnapshot: (data: MonitorSnapshot) => void,
  onError: (error: unknown) => void,
  signal: AbortSignal,
): Promise<void> {
  const hubStarted = await tryMonitorHub(intervalSec, onSnapshot, onError, signal);
  if (hubStarted || signal.aborted) {
    return;
  }

  await pollMonitorSnapshot(intervalSec, onSnapshot, onError, signal);
}

async function tryMonitorHub(
  intervalSec: number,
  onSnapshot: (data: MonitorSnapshot) => void,
  onError: (error: unknown) => void,
  signal: AbortSignal,
): Promise<boolean> {
  const { createRealtimeConnection, stopRealtimeConnection, MONITOR_HUB_PATH, MONITOR_SNAPSHOT_EVENT } =
    await import('./realtime');
  let connection = null as Awaited<ReturnType<typeof createRealtimeConnection>>;

  try {
    connection = await createRealtimeConnection(MONITOR_HUB_PATH);
    if (!connection || signal.aborted) {
      await stopRealtimeConnection(connection);
      return false;
    }

    connection.on(MONITOR_SNAPSHOT_EVENT, onSnapshot);
    const onAbort = () => {
      void connection?.invoke('Stop').catch(() => undefined);
      void stopRealtimeConnection(connection);
    };
    signal.addEventListener('abort', onAbort, { once: true });

    await connection.start();
    if (signal.aborted) {
      return true;
    }

    await connection.invoke('Start', intervalSec);
    connection.onreconnected(() => {
      void connection?.invoke('Start', intervalSec).catch(() => undefined);
    });
    connection.onclose(() => {
      if (signal.aborted) {
        return;
      }
      void pollMonitorSnapshot(intervalSec, onSnapshot, onError, signal);
    });
    return true;
  } catch {
    await stopRealtimeConnection(connection);
    return false;
  }
}

async function pollMonitorSnapshot(
  intervalSec: number,
  onSnapshot: (data: MonitorSnapshot) => void,
  onError: (error: unknown) => void,
  signal: AbortSignal,
): Promise<void> {
  const tick = async () => {
    if (signal.aborted) {
      return;
    }
    try {
      const payload = await fetchMonitorSnapshot();
      if (!signal.aborted) {
        onSnapshot(payload.data);
      }
    } catch (error) {
      if (!signal.aborted) {
        onError(error);
      }
    }
  };

  await tick();
  if (signal.aborted) {
    return;
  }

  const timer = window.setInterval(() => {
    void tick();
  }, intervalSec * 1000);
  signal.addEventListener('abort', () => window.clearInterval(timer), { once: true });
}
