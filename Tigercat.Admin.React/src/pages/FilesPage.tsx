import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
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
import { FileTextIcon, UploadIcon } from '../components/Icons';
import { deleteMedia, listMedia, uploadMediaFile } from '../utils/media';
import { usePermission } from '../utils/permission';
import type { MediaItem } from '../utils/types';

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

function FilesPage() {
  const { has: hasPerm } = usePermission();
  const canUpload = hasPerm('media:upload');
  const canDelete = hasPerm('media:delete');

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      Message.error({ content: e.message || '上传失败', duration: 3000 });
    }
  };

  const confirmDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setDeleting(true);
      for (const id of selectedIds) {
        await deleteMedia(id);
      }
      Message.success({ content: '已删除选中文件', duration: 3000 });
      setSelectedKeys([]);
      setDeleteOpen(false);
      await load();
    } catch (e: any) {
      Message.error({ content: e.message || '删除失败', duration: 3000 });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="文件管理"
        subtitle="管理站点 Logo、用户头像与后台媒体资源"
        icon={<FileTextIcon size={24} />}
        tags={[{ label: '媒体资源', color: 'blue' }]}
      />

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={contentType}
              options={TYPE_OPTIONS}
              placeholder="筛选类型"
              clearable={false}
              onChange={(value) => setContentType(String(value ?? ''))}
            />
            {selectedIds.length > 0 && (
              <Tag color="blue" size="sm">
                已选择 {selectedIds.length} 个
              </Tag>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {canDelete && (
              <Button
                variant="outline"
                color="danger"
                disabled={selectedIds.length === 0}
                onClick={() => setDeleteOpen(true)}>
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
          onSelectedKeysChange={setSelectedKeys}
          onSearchTextChange={setSearchText}
          onOpen={(item) => {
            if (typeof item.url === 'string') {
              window.open(item.url, '_blank', 'noopener,noreferrer');
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
        <Text>将删除 {selectedIds.length} 个媒体资源。被引用的文件会被后端阻止删除。</Text>
      </Modal>
    </div>
  );
}

export default FilesPage;
