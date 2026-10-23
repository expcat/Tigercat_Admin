import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Button } from '@expcat/tigercat-react/Button';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Pagination } from '@expcat/tigercat-react/Pagination';
import { Card } from '@expcat/tigercat-react/Card';
import { Checkbox } from '@expcat/tigercat-react/Checkbox';
import {
  DropdownItem,
  DropdownMenu,
} from '@expcat/tigercat-react/Dropdown';
import { Message } from '@expcat/tigercat-react/Message';
import { Modal } from '@expcat/tigercat-react/Modal';
import { Select } from '@expcat/tigercat-react/Select';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { FileManager } from '@expcat/tigercat-react/FileManager';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuMenu,
  ContextMenuSub,
} from '@expcat/tigercat-react/ContextMenu';
import { SplitButton } from '@expcat/tigercat-react/SplitButton';
import type { FileItem } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { FileTextIcon, UploadIcon } from '../components/Icons';
import { batchDeleteMedia, getMediaDetail, listMedia, uploadMediaFile } from '../utils/media';
import { usePermission } from '../utils/permission';
import { ApiError } from '../utils/request';
import { clearWorkbenchSelection, loadWorkbenchState, saveWorkbenchState } from '../utils/workbench';
import type { DuplicateMediaResult, MediaItem, MediaReference } from '../utils/types';
import { useNavigate } from 'react-router-dom';
const FILE_UPLOAD_ACCEPT = 'image/*,.pdf,.txt,.csv,.json,.xlsx,.xls';
const FILE_UPLOAD_MAX_SIZE = 10 * 1024 * 1024;

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
    modified: new Date(item.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    mimeType: item.contentType,
    url: item.url,
    referenceCount: item.referenceCount,
  };
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
  const navigate = useNavigate();
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const [duplicate, setDuplicate] = useState<MediaItem | null>(null);
  const loadController = useRef<AbortController | null>(null);
  const deleteController = useRef<AbortController | null>(null);
  const uploadController = useRef<AbortController | null>(null);
  const [contextFile, setContextFile] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await listMedia({ page, pageSize: 20, keyword: searchText, contentType: contentType || undefined, sortBy: 'createdAt', sortOrder: 'desc' }, controller.signal);
      if (controller.signal.aborted) return;
      setItems(data.items);
      setTotal(data.total);
      setSelectedKeys((keys) => keys.filter((key) => data.items.some((item) => item.id === Number(key))));
      if (page > Math.max(1, Math.ceil(data.total / 20))) setPage(Math.max(1, Math.ceil(data.total / 20)));
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : '加载媒体资源失败');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, [contentType, searchText, page]);

  useEffect(() => { void load(); return () => loadController.current?.abort(); }, [load]);
  useEffect(() => () => { deleteController.current?.abort(); uploadController.current?.abort(); }, []);

  const files = useMemo(() => items.map(toFileItem), [items]);
  const selectedIds = selectedKeys.map(Number).filter((id) => Number.isFinite(id));

  const handleUpload = async (file: File) => {
    if (!canUpload || uploading) return;
    const controller = new AbortController();
    uploadController.current = controller;
    setUploading(true);
    setFailedFile(null);
    setDuplicate(null);
    setUploadError('');
    try {
      await uploadMediaFile(file, 'file', controller.signal);
      if (controller.signal.aborted) return;
      Message.success({ content: '文件已上传', duration: 2200 });
      setPage(1);
      if (page === 1) await load();
    } catch (error) {
      if (controller.signal.aborted) return;
      setUploadError(describeUploadError(error));
      const existing = error instanceof ApiError && error.status === 409 ? (error.data as DuplicateMediaResult)?.existing : undefined;
      setDuplicate(existing ?? null);
      if (!existing) setFailedFile(file);
    } finally { setUploading(false); }
  };

  const openDetail = (id: number) => navigate(`/files/${id}`);
  const openDeleteModal = async (ids?: number[]) => {
    const targetIds = ids?.length ? ids : selectedIds;
    if (!canDelete || !targetIds.length || deleting) return;
    deleteController.current?.abort();
    const controller = new AbortController();
    deleteController.current = controller;
    setDeleteIds(targetIds);
    setForceDelete(false);
    setDeleteReferences([]);
    setDeleteError('');
    setDeleteLoading(true);
    setDeleteOpen(true);
    try {
      const details = await Promise.all(targetIds.map((id) => getMediaDetail(id, controller.signal)));
      if (!controller.signal.aborted) setDeleteReferences(details.flatMap((res) => res.data.references));
    } catch (error) {
      if (!controller.signal.aborted) setDeleteError(error instanceof Error ? error.message : '引用读取失败');
    } finally { if (!controller.signal.aborted) setDeleteLoading(false); }
  };
  const closeDelete = () => {
    if (deleting) return;
    deleteController.current?.abort();
    setDeleteOpen(false);
  };

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      Message.success({ content: 'URL 已复制', duration: 2000 });
    } catch {
      Message.error({ content: '复制失败', duration: 3000 });
    }
  };

  const confirmDelete = async () => {
    if (!canDelete || !deleteIds.length || deleting || deleteLoading || deleteError) return;
    try {
      setDeleting(true);
      const res = await batchDeleteMedia(deleteIds, forceDelete);
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
    setPage(1);
    setSelectedKeys([]);
    clearWorkbenchSelection('files');
    setContentType(next);
    saveWorkbenchState('files', {
      queryState: { contentType: next, keyword: searchText },
    });
  };

  const handleSearchTextChange = (value: string) => {
    setPage(1);
    setSelectedKeys([]);
    clearWorkbenchSelection('files');
    setSearchText(value);
    saveWorkbenchState('files', {
      queryState: { contentType, keyword: value },
    });
  };

  const handleSelectedKeysChange = (keys: (string | number)[]) => {
    setSelectedKeys(keys);
    saveWorkbenchState('files', { selectedRowKeys: keys });
  };

  const resolveFileFromEvent = (event: ReactMouseEvent): MediaItem | null => {
    const option = (event.target as HTMLElement | null)?.closest('[role="option"]');
    if (!(option instanceof HTMLElement)) return null;
    const name = option.querySelector('.truncate')?.textContent?.trim();
    if (name) {
      const matches = items.filter((item) => item.originalFileName === name);
      if (matches.length === 1) return matches[0];
    }
    const index = Number(option.dataset.optionIndex);
    const file = Number.isFinite(index) ? files[index] : undefined;
    if (!file) {
      return name
        ? items.find((item) => item.originalFileName === name) ?? null
        : null;
    }
    return items.find((item) => item.id === Number(file.key)) ?? null;
  };

  const onFilesContextMenu = (event: ReactMouseEvent) => {
    const file = resolveFileFromEvent(event);
    setContextFile(file);
    if (!file) {
      event.stopPropagation();
    }
  };

  const previewContextFile = () => {
    if (!contextFile) return;
    void openDetail(contextFile.id);
  };

  const openContextFile = () => {
    if (!contextFile) return;
    openUrl(contextFile.url);
  };

  const copyContextFileUrl = () => {
    if (!contextFile) return;
    void copyUrl(contextFile.url);
  };

  const deleteContextFile = async () => {
    if (!contextFile || !canDelete) return;
    const ids = [contextFile.id];
    setSelectedKeys(ids);
    saveWorkbenchState('files', { selectedRowKeys: ids });
    await openDeleteModal(ids);
  };

  const triggerFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > FILE_UPLOAD_MAX_SIZE) {
      Message.error({ content: '文件超过 10 MB 上限', duration: 3000 });
      return;
    }
    await handleUpload(file);
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
              aria-label="筛选类型"
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
              disabled={loading || !!loadError || selectedIds.length !== 1}
              onClick={() => openDetail(selectedIds[0])}>
              查看详情
            </Button>
            {canDelete && (
              <Button
                variant="outline"
                danger
                disabled={loading || !!loadError || selectedIds.length === 0}
                onClick={() => {
                  void openDeleteModal();
                }}>
                删除选中
              </Button>
            )}
            {canUpload && (
              <>
                <SplitButton
                  disabled={uploading}
                  triggerAriaLabel="更多操作"
                  onClick={triggerFilePick}>
                  <span className="flex items-center gap-1">
                    <UploadIcon size={16} />
                    上传文件
                  </span>
                  <DropdownMenu>
                    <DropdownItem onClick={triggerFilePick}>选择文件</DropdownItem>
                  </DropdownMenu>
                </SplitButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={FILE_UPLOAD_ACCEPT}
                  onChange={handleFileInputChange}
                />
              </>
            )}
          </div>
        </div>

        {uploading && <div className="mb-3 flex items-center gap-2"><Text>正在上传…</Text><Button size="sm" variant="outline" onClick={() => uploadController.current?.abort()}>取消上传</Button></div>}
        {uploadError && <Alert type="error" title={uploadError} action={failedFile ? <Button disabled={uploading} onClick={() => void handleUpload(failedFile)}>重试上传</Button> : duplicate ? <Button onClick={() => openDetail(duplicate.id)}>查看已有文件</Button> : undefined} />}
        {loadError && <Alert type="error" title="媒体列表加载失败" description={loadError} action={<Button onClick={() => void load()}>重试</Button>} />}
        <ContextMenu>
          <div inert={!!loadError} onContextMenuCapture={onFilesContextMenu}>
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
          </div>
          <ContextMenuMenu>
            <ContextMenuItem disabled={!contextFile} onClick={previewContextFile}>
              预览
            </ContextMenuItem>
            <ContextMenuSub title="打开">
              <ContextMenuItem disabled={!contextFile} onClick={openContextFile}>
                在新窗口打开
              </ContextMenuItem>
              <ContextMenuItem disabled={!contextFile} onClick={copyContextFileUrl}>
                复制 URL
              </ContextMenuItem>
            </ContextMenuSub>
            {canDelete && (
              <ContextMenuItem
                disabled={!contextFile}
                divided
                onClick={() => {
                  void deleteContextFile();
                }}>
                删除
              </ContextMenuItem>
            )}
          </ContextMenuMenu>
        </ContextMenu>

        <Pagination current={page} pageSize={20} total={total} onChange={(next) => { setPage(next); setSelectedKeys([]); clearWorkbenchSelection('files'); }} />
        <div className="p2-text-secondary mt-3 text-sm">
          <Text size="sm" color="secondary">
            Logo、头像或文章附件引用会阻止普通删除；强制删除会清理这些已知引用。
          </Text>
        </div>
      </Card>

      <Modal open={deleteOpen} title="确认删除文件" showDefaultFooter={false} maskClosable={!deleting} closable={!deleting} onCancel={closeDelete}
        footer={<div className="flex justify-end gap-2"><Button variant="outline" disabled={deleting} onClick={closeDelete}>取消</Button><Button danger disabled={deleting || deleteLoading || !!deleteError} onClick={() => void confirmDelete()}>{deleting ? '删除中…' : forceDelete ? '强制删除' : '确认删除'}</Button></div>}>
        <div className="space-y-3">
          <Text>将删除 {deleteIds.length} 个媒体资源。被引用的文件会被后端阻止删除。</Text>
          {deleteLoading && <Text>正在读取引用…</Text>}
          {deleteError && <Alert type="error" title={deleteError} action={<Button onClick={() => void openDeleteModal(deleteIds)}>重试</Button>} />}
          {deleteReferences.length > 0 && <Alert type="warning" title="引用来源"><ul className="space-y-1">{deleteReferences.map((reference) => <li key={reference.id}>{referenceLabel(reference)}</li>)}</ul></Alert>}
          {deleteReferences.length > 0 && <Checkbox checked={forceDelete} disabled={deleting} onChange={setForceDelete}>强制删除并清理已知 Logo / 头像 / 文章附件引用</Checkbox>}
        </div>
      </Modal>
    </div>
  );
}

export default FilesPage;
