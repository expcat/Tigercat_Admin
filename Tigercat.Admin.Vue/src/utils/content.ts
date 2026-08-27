import { apiRequest } from './request';
import { getAuthHeaders } from './auth';

export type ArticleEditorType = 'rich' | 'markdown' | 'code';

export interface Article {
  id: string;
  title: string;
  editorType: ArticleEditorType;
  body: string;
  tags: string[];
  category: string;
  column: string[];
  published: boolean;
}

export interface SaveArticlePayload {
  title: string;
  editorType: ArticleEditorType;
  body: string;
  tags: string[];
  category: string;
  column: string[];
  published: boolean;
}

export function fetchArticles() {
  return apiRequest<Article[]>('/api/content/articles', {
    headers: getAuthHeaders(),
  });
}

export function fetchArticle(id: string) {
  return apiRequest<Article>(`/api/content/articles/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });
}

export function saveArticle(id: string, payload: SaveArticlePayload) {
  return apiRequest<Article>(`/api/content/articles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function unwrapArticles(data: Article[] | { items?: Article[] } | null | undefined): Article[] {
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}

export function asCategoryKey(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  if (value == null) return '';
  return String(value);
}

export function asColumnPath(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

export function currentEditorBody(
  editorType: ArticleEditorType,
  rich: string,
  markdown: string,
  code: string,
): string {
  if (editorType === 'markdown') return markdown;
  if (editorType === 'code') return code;
  return rich;
}
