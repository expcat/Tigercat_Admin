import { apiRequest } from './request';
import { getAuthHeaders } from './auth';
import type { CommentItem, CommentTargetType, CreateCommentPayload } from './types';

export function fetchComments(targetType: CommentTargetType, targetId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ targetType, targetId });
  return apiRequest<CommentItem[]>(`/api/comments?${params}`, {
    headers: getAuthHeaders(),
    signal,
  });
}

export function createComment(payload: CreateCommentPayload) {
  return apiRequest<CommentItem>('/api/comments', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}
