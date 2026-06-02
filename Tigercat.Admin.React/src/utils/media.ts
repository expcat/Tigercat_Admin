import { getAuthHeaders } from './auth';
import { apiRequest } from './request';
import type { MediaItem, MessageResult, PagedResult } from './types';

export async function uploadMediaFile(
  file: File,
  usage?: 'logo' | 'avatar' | 'file',
): Promise<MediaItem> {
  const form = new FormData();
  form.append('file', file);
  if (usage) {
    form.append('usage', usage);
  }

  const response = await fetch('/api/media', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || response.statusText || '上传失败');
  }

  return payload.data as MediaItem;
}

export function uploadMediaBlob(
  blob: Blob,
  fileName: string,
  usage: 'logo' | 'avatar' | 'file',
): Promise<MediaItem> {
  const file = new File([blob], fileName, {
    type: blob.type || 'image/png',
  });
  return uploadMediaFile(file, usage);
}

export function listMedia(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  contentType?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.keyword?.trim()) search.set('keyword', params.keyword.trim());
  if (params.contentType) search.set('contentType', params.contentType);
  if (params.sortBy) search.set('sortBy', params.sortBy);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);

  return apiRequest<PagedResult<MediaItem>>(`/api/media?${search}`, {
    headers: getAuthHeaders(),
  });
}

export function deleteMedia(id: number) {
  return apiRequest<MessageResult>(`/api/media/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}
