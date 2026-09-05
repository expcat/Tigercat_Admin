import { apiRequest } from './request';
import { getAuthHeaders } from './auth';
import type { ChatMessageItem } from './types';

export function fetchChatMessages() {
  return apiRequest<ChatMessageItem[]>('/api/chat/messages', {
    headers: getAuthHeaders(),
  });
}

export function sendChatMessage(content: string) {
  return apiRequest<ChatMessageItem[]>('/api/chat/messages', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
}

export function subscribeChatMessages(onMessages: (items: ChatMessageItem[]) => void): () => void {
  const abort = new AbortController();
  void runChatSubscription(onMessages, abort.signal);
  return () => abort.abort();
}

async function runChatSubscription(
  onMessages: (items: ChatMessageItem[]) => void,
  signal: AbortSignal,
): Promise<void> {
  const { createRealtimeConnection, stopRealtimeConnection, CHAT_HUB_PATH, CHAT_MESSAGES_EVENT } =
    await import('./realtime');
  let connection = null as Awaited<ReturnType<typeof createRealtimeConnection>>;

  try {
    connection = await createRealtimeConnection(CHAT_HUB_PATH);
    if (!connection || signal.aborted) {
      await stopRealtimeConnection(connection);
      return;
    }

    connection.on(CHAT_MESSAGES_EVENT, onMessages);
    const onAbort = () => {
      void stopRealtimeConnection(connection);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    await connection.start();
    if (signal.aborted) {
      await stopRealtimeConnection(connection);
    }
  } catch {
    await stopRealtimeConnection(connection);
  }
}
