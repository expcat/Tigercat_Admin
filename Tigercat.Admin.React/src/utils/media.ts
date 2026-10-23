import type { ImageAnnotation } from '@expcat/tigercat-core';
import { getAuthHeaders } from './auth';
import { ApiError, apiRequest } from './request';
import type { DuplicateMediaResult, MediaDetail, MediaItem, MessageResult, PagedResult } from './types';

export async function uploadMediaFile(
  file: File,
  usage?: 'logo' | 'avatar' | 'file',
  signal?: AbortSignal,
): Promise<MediaItem> {
  const form = new FormData();
  form.append('file', file);
  if (usage) {
    form.append('usage', usage);
  }

  const response = await apiRequest<MediaItem>('/api/media', {
    method: 'POST', headers: getAuthHeaders(), body: form, signal,
  });
  return response.data;
}

export function uploadMediaBlob(
  blob: Blob,
  fileName: string,
  usage: 'logo' | 'avatar' | 'file',
  signal?: AbortSignal,
): Promise<MediaItem> {
  const file = new File([blob], fileName, {
    type: blob.type || 'image/png',
  });
  return uploadMediaFile(file, usage, signal);
}

export function listMedia(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  contentType?: string;
  sortBy?: string;
  sortOrder?: string;
}, signal?: AbortSignal) {
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
    signal,
  });
}

export function getMediaDetail(id: number, signal?: AbortSignal) {
  return apiRequest<MediaDetail>(`/api/media/${id}`, {
    headers: getAuthHeaders(),
    signal,
  });
}

export function deleteMedia(id: number, force = false) {
  const suffix = force ? '?force=true' : '';
  return apiRequest<MessageResult>(`/api/media/${id}${suffix}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export function batchDeleteMedia(ids: number[], force = false) {
  return apiRequest<MessageResult>(`/api/media/batch-delete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids, force }),
  });
}

export function saveMediaAnnotations(id: number, annotations: ImageAnnotation[]) {
  return apiRequest<MediaDetail>(`/api/media/${id}/annotations`, {
    method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ annotations }),
  });
}

/** Reuse the server's identical resource for attachment/crop saves. */
export async function uploadOrReuseMedia(file: File, signal?: AbortSignal): Promise<MediaItem> {
  try {
    return await uploadMediaFile(file, 'file', signal);
  } catch (error) {
    const existing = error instanceof ApiError && error.status === 409
      ? (error.data as DuplicateMediaResult | undefined)?.existing : undefined;
    if (existing) return existing;
    throw error;
  }
}

export function formatMediaBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Materialize a gallery example only when the user saves its annotations. */
export async function gallerySampleFile(src: string, name: string): Promise<File> {
  const image = new Image();
  image.src = src;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法生成图片');
  context.drawImage(image, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (value) => value ? resolve(value) : reject(new Error('无法生成图片')), 'image/png'));
  return new File([blob], `${name}.png`, { type: 'image/png' });
}
