import type { HubConnection } from '@microsoft/signalr';
import { isTigercatDemoEnabled } from '@tigercat-admin/mock-api';
import { getSessionToken } from './auth';

export const MONITOR_HUB_PATH = '/hubs/monitor';
export const CHAT_HUB_PATH = '/hubs/chat';
export const MONITOR_SNAPSHOT_EVENT = 'snapshot';
export const CHAT_MESSAGES_EVENT = 'messages';

export function isRealtimeDisabled(): boolean {
  return isTigercatDemoEnabled(import.meta.env.VITE_TIGERCAT_DEMO);
}

export async function createRealtimeConnection(path: string): Promise<HubConnection | null> {
  if (isRealtimeDisabled()) {
    return null;
  }

  const token = getSessionToken();
  if (!token) {
    return null;
  }

  const signalR = await import('@microsoft/signalr');
  return new signalR.HubConnectionBuilder()
    .withUrl(path, {
      accessTokenFactory: () => getSessionToken() ?? '',
    })
    .withAutomaticReconnect()
    .build();
}

export async function stopRealtimeConnection(connection: HubConnection | null): Promise<void> {
  if (!connection || connection.state === 'Disconnected') {
    return;
  }

  try {
    await connection.stop();
  } catch {
    // Ignore disconnect races during unmount / pause.
  }
}
