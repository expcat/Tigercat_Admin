import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Message,
  Modal,
  Select,
  Tag,
  Text,
} from '@expcat/tigercat-react';
import { FileManager } from '@expcat/tigercat-react/FileManager';
import { Upload } from '@expcat/tigercat-react/Upload';
import type { FileItem, UploadRequestOptions } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { ClipboardIcon, FileTextIcon, LinkIcon, UploadIcon } from '../components/Icons';
import { batchDeleteMedia, getMediaDetail, listMedia, uploadMediaFile } from '../utils/media';
import { usePermission } from '../utils/permission';
import { ApiError } from '../utils/request';
import { clearWorkbenchSelection, loadWorkbenchState, saveWorkbenchState } from '../utils/workbench';
import type { DuplicateMediaResult, MediaDetail, MediaItem, MediaReference } from '../utils/types';

const TYPE_OPTIONS = [
  { label: '全部类型', value: '' },
  { label: '图片', value: 'image/' },
  { label: 'PDF', value: 'application/pdf' },
  { label: '文本', value: 'text/' },
  { label: '表格', value: 'application/vnd' },
];

function toFileItem(item: MediaItem): FileItem {
  return {
    key: item.id,
    name: item.originalFileName,
    type: 'file',
    extension: item.extension ?? undefined,
    size: item.sizeBytes,
    modified: item.createdAt,
    mimeType: item.contentType,
    url: item.url,
    referenceCount: item.referenceCount,
  };
}

function isImage(item: MediaItem | MediaDetail | null) {
  return Boolean(item?.contentType.startsWith('image/'));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function referenceLabel(reference: MediaReference) {
  return reference.displayName || `${reference.referenceType}:${reference.referenceKey}`;
}

function describeUploadError(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    const duplicate = error.data as DuplicateMediaResult | undefined;
    return duplicate?.existing
      ? `文件已存在，可复用 ${duplicate.existing.originalFileName}`
      : error.message;
  }

  return error instanceof Error ? error.message : '上传失败';
}

function FilesPage() {
  const { has: hasPerm } = usePermission();
  const canUpload = hasPerm('media:upload');
  const canDelete = hasPerm('media:delete');
  const savedWorkbench = useMemo(
    () =>
      loadWorkbenchState('files', {
        queryState: { contentType: '', keyword: '' },
        selectedRowKeys: [],
      }),
    [],
  );
  const savedQuery = savedWorkbench.queryState;

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState(savedQuery.contentType ?? '');
  const [searchText, setSearchText] = useState(savedQuery.keyword ?? '');
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>(
    savedWorkbench.selectedRowKeys,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [deleteReferences, setDeleteReferences] = useState<MediaReference[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<MediaDetail | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listMedia({
        page: 1,
        pageSize: 100,
        keyword: searchText,
        contentType: contentType || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setItems(res.data.items);
    } catch (e: any) {
      Message.error({ content: e.message || '加载媒体资源失败', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [contentType, searchText]);

  useEffect(() => {
    load();
  }, [load]);

  const files = useMemo(() => items.map(toFileItem), [items]);
  const selectedIds = selectedKeys.map(Number).filter((id) => Number.isFinite(id));

  const handleUpload = async ({ file, onProgress, onSuccess, onError }: UploadRequestOptions) => {
    try {
      onProgress?.(20);
      const media = await uploadMediaFile(file, 'file');
      onProgress?.(100);
      onSuccess?.(media);
      Message.success({ content: '文件已上传', duration: 3000 });
      await load();
    } catch (e: any) {
      onError?.(e);
      Message.error({ content: describeUploadError(e), duration: 3000 });
    }
  };

  const openDetail = async (id: number) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      const res = await getMediaDetail(id);
      setDetail(res.data);
    } catch (e: any) {
      Message.error({ content: e.message || '加载媒体详情失败', duration: 3000 });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDeleteModal = async () => {
    setForceDelete(false);
    setDeleteReferences([]);
    setDeleteOpen(true);

    try {
      const details = await Promise.all(selectedIds.map((id) => getMediaDetail(id)));
      setDeleteReferences(details.flatMap((res) => res.data.references));
    } catch {
      setDeleteReferences([]);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      Message.success({ content: 'URL 已复制', duration: 2000 });
    } catch {
      Message.error({ content: '复制失败', duration: 3000 });
    }
  };

  const confirmDelete = async (forceOverride = forceDelete) => {
    if (selectedIds.length === 0) return;
    try {
      setDeleting(true);
      const res = await batchDeleteMedia(selectedIds, forceOverride);
      Message.success({
        content: res.data.message || '已删除选中文件',
        duration: 3000,
      });
      setSelectedKeys([]);
      clearWorkbenchSelection('files');
      setDeleteOpen(false);
      await load();
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 409 && Array.isArray(e.data)) {
        setDeleteReferences(e.data as MediaReference[]);
      }
      Message.error({ content: e.message || '删除失败', duration: 3000 });
    } finally {
      setDeleting(false);
    }
  };

  const handleContentTypeChange = (value: unknown) => {
    const next = String(value ?? '');
    setContentType(next);
    saveWorkbenchState('files', {
      queryState: { contentType: next, keyword: searchText },
    });
  };

  const handleSearchTextChange = (value: string) => {
    setSearchText(value);
    saveWorkbenchState('files', {
      queryState: { contentType, keyword: value },
    });
  };

  const handleSelectedKeysChange = (keys: (string | number)[]) => {
    setSelectedKeys(keys);
    saveWorkbenchState('files', { selectedRowKeys: keys });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="文件管理"
        subtitle="管理站点 Logo、用户头像与后台媒体资源"
        icon={<FileTextIcon size={24} />}
        tags={[{ label: '媒体资源', variant: 'primary' }]}
      />

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={contentType}
              options={TYPE_OPTIONS}
              placeholder="筛选类型"
              clearable={false}
              onChange={handleContentTypeChange}
            />
            {selectedIds.length > 0 && (
              <Tag variant="primary" size="sm">
                已选择 {selectedIds.length} 个
              </Tag>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              variant="outline"
              disabled={selectedIds.length !== 1}
              onClick={() => openDetail(selectedIds[0])}>
              查看详情
            </Button>
            {canDelete && (
              <Button
                variant="outline"
                danger
                disabled={selectedIds.length === 0}
                onClick={openDeleteModal}>
                删除选中
              </Button>
            )}
            {canUpload && (
              <Upload
                accept="image/*,.pdf,.txt,.csv,.json,.xlsx,.xls"
                showFileList={false}
                maxSize={10 * 1024 * 1024}
                customRequest={handleUpload}>
                <span className="flex items-center gap-1">
                  <UploadIcon size={16} />
                  上传文件
                </span>
              </Upload>
            )}
          </div>
        </div>

        <FileManager
          files={files}
          viewMode="list"
          multiple
          searchable
          loading={loading}
          selectedKeys={selectedKeys}
          searchText={searchText}
          emptyText="暂无媒体资源"
          onSelectedKeysChange={handleSelectedKeysChange}
          onSearchTextChange={handleSearchTextChange}
          onOpen={(item) => {
            const id = Number(item.key);
            if (Number.isFinite(id)) {
              openDetail(id);
            }
          }}
        />

        <div className="p2-text-secondary mt-3 text-sm">
          <Text size="sm" color="secondary">
            被 Logo 或头像引用的媒体会在删除时返回冲突提示。
          </Text>
        </div>
      </Card>

      <Modal
        open={deleteOpen}
        title="确认删除文件"
        showDefaultFooter
        okText={deleting ? '删除中…' : '确认删除'}
        cancelText="取消"
        onOk={confirmDelete}
        onCancel={() => setDeleteOpen(false)}>
        <div className="space-y-3">
          <Text>将删除 {selectedIds.length} 个媒体资源。被引用的文件会被后端阻止删除。</Text>
          {deleteReferences.length > 0 && (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="mb-2 font-medium">引用来源</div>
              <ul className="space-y-1">
                {deleteReferences.map((reference) => (
                  <li key={reference.id}>{referenceLabel(reference)}</li>
                ))}
              </ul>
            </div>
          )}
          {deleteReferences.length > 0 && (
            <label className="p2-checkbox-row text-sm">
              <Checkbox checked={forceDelete} onChange={() => setForceDelete((value) => !value)} />
              <span className="p2-checkbox-label">强制删除并清理已知 Logo / 头像引用</span>
            </label>
          )}
          {deleteReferences.length > 0 && (
            <Button
              variant="outline"
              danger
              disabled={deleting}
              onClick={() => confirmDelete(true)}>
              强制删除
            </Button>
          )}
        </div>
      </Modal>

      <Modal
        open={detailOpen}
        title="媒体详情"
        showDefaultFooter={false}
        onCancel={() => setDetailOpen(false)}>
        {detailLoading || !detail ? (
          <Text>加载中…</Text>
        ) : (
          <div className="space-y-4">
            {isImage(detail) && (
              <div className="overflow-hidden rounded border border-slate-200 bg-slate-50">
                <img
                  src={detail.url}
                  alt={detail.originalFileName}
                  className="max-h-64 w-full object-contain"
                />
              </div>
            )}
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div><span className="text-slate-500">文件名：</span>{detail.originalFileName}</div>
              <div><span className="text-slate-500">大小：</span>{formatBytes(detail.sizeBytes)}</div>
              <div><span className="text-slate-500">类型：</span>{detail.contentType}</div>
              <div><span className="text-slate-500">Provider：</span>{detail.storageProvider}</div>
              <div><span className="text-slate-500">尺寸：</span>{detail.width && detail.height ? `${detail.width} x ${detail.height}` : '未识别'}</div>
              <div><span className="text-slate-500">上传人：</span>{detail.uploadedBy || '未知'}</div>
              <div className="sm:col-span-2 break-all"><span className="text-slate-500">SHA256：</span>{detail.sha256Hash || '未记录'}</div>
              <div className="sm:col-span-2 break-all"><span className="text-slate-500">URL：</span>{detail.url}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => copyUrl(detail.url)}>
                <span className="flex items-center gap-1"><ClipboardIcon size={16} />复制 URL</span>
              </Button>
              <Button variant="outline" onClick={() => window.open(detail.url, '_blank', 'noopener,noreferrer')}>
                <span className="flex items-center gap-1"><LinkIcon size={16} />打开资源</span>
              </Button>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">引用来源</div>
              {detail.references.length === 0 ? (
                <Text size="sm" color="secondary">暂无引用</Text>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {detail.references.map((reference) => (
                    <Tag key={reference.id} variant="primary" size="sm">
                      {referenceLabel(reference)}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default FilesPage;
