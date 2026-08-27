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
