import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@expcat/tigercat-react/Button';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Pagination } from '@expcat/tigercat-react/Pagination';
import { Card } from '@expcat/tigercat-react/Card';
import { AutoComplete } from '@expcat/tigercat-react/AutoComplete';
import { Message } from '@expcat/tigercat-react/Message';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { Switch } from '@expcat/tigercat-react/Switch';
import { Space } from '@expcat/tigercat-react/Space';
import {
  RichTextEditor,
  MarkdownEditor,
  CodeEditor,
} from '../utils/lazyTigercat';
import { TreeSelect } from '@expcat/tigercat-react/TreeSelect';
import { Cascader } from '@expcat/tigercat-react/Cascader';
import { TagsInput } from '@expcat/tigercat-react/TagsInput';
import { Mentions } from '@expcat/tigercat-react/Mentions';
import { Watermark } from '@expcat/tigercat-react/Watermark';
import { Result } from '@expcat/tigercat-react/Result';
import type {
  TreeNode,
  TreeSelectValue,
  CascaderOption,
  CascaderModelValue,
  MentionOption,
  UploadFile,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';
import { EditIcon, UploadIcon, DownloadIcon } from '../components/Icons';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../utils/permission';
import { listMedia, uploadOrReuseMedia } from '../utils/media';
import type { MediaItem } from '../utils/types';
import {
  asCategoryKey,
  asColumnPath,
  currentEditorBody,
  fetchArticle,
  saveArticle,
  type Article,
  type ArticleEditorType,
} from '../utils/content';

type EditorType = ArticleEditorType;

const EDITOR_OPTIONS = [
  { label: '富文本', value: 'rich' },
  { label: 'Markdown', value: 'markdown' },
  { label: '代码', value: 'code' },
];

const CATEGORY_TREE: TreeNode[] = [
  {
    key: 'tech',
    label: '技术',
    children: [
      { key: 'frontend', label: '前端' },
      { key: 'backend', label: '后端' },
    ],
  },
  {
    key: 'product',
    label: '产品',
    children: [
      { key: 'design', label: '设计' },
      { key: 'research', label: '调研' },
    ],
  },
  { key: 'ops', label: '运营' },
];

const COLUMN_OPTIONS: CascaderOption[] = [
  {
    value: 'home',
    label: '首页',
    children: [
      { value: 'banner', label: '轮播位' },
      { value: 'feature', label: '特性区' },
    ],
  },
  {
    value: 'docs',
    label: '文档',
    children: [
      { value: 'guide', label: '指南' },
      { value: 'api', label: 'API 参考' },
    ],
  },
];

const TITLE_OPTIONS = [
  { label: '组件库 v1.6 发布说明', value: '组件库 v1.6 发布说明' },
  { label: '管理后台使用指南', value: '管理后台使用指南' },
  { label: '版本更新日志', value: '版本更新日志' },
  { label: '权限模型说明', value: '权限模型说明' },
];

const MENTION_OPTIONS: MentionOption[] = [
  { value: 'alice', label: 'Alice（前端）' },
  { value: 'bob', label: 'Bob（设计）' },
  { value: 'carol', label: 'Carol（运营）' },
];

const DEFAULT_RICH =
  '<h2>组件库 v1.6 发布说明</h2><p>本次更新带来内容编辑工作台，支持富文本 / Markdown / 代码三种模式互切。</p>';
const DEFAULT_MARKDOWN =
  '# 组件库 v1.6 发布说明\n\n- 新增内容编辑工作台\n- 支持富文本 / Markdown / 代码切换\n- 元数据侧栏：分类、栏目、标签、协作者';
const DEFAULT_CODE =
  'export const version = "1.6.0";\n\nexport function release() {\n  return `Tigercat ${version} ready`;\n}';

function columnText(value: CascaderModelValue): string {
  if (!value?.length) return '未选择';
  const labels: string[] = [];
  let level = COLUMN_OPTIONS;
  for (const v of value) {
    const found = level.find((o) => o.value === v);
    if (!found) break;
    labels.push(found.label);
    level = found.children ?? [];
  }
  return labels.join(' / ');
}

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function ContentPage() {
  const navigate = useNavigate();
  const { has } = usePermission();
  const canUpload = has('media:upload');
  const canView = has('media:view');
  const loadController = useRef<AbortController | null>(null);
  const uploadControllers = useRef(new Map<string, AbortController>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState('');
  const [attachments, setAttachments] = useState<MediaItem[]>([]);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const uploading = uploadFiles.filter((file) => file.status === 'uploading').length;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [mediaRetry, setMediaRetry] = useState(0);
  const [articleId, setArticleId] = useState('a1');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorType, setEditorType] = useState<EditorType>('rich');
  const [richValue, setRichValue] = useState(DEFAULT_RICH);
  const [markdownValue, setMarkdownValue] = useState(DEFAULT_MARKDOWN);
  const [codeValue, setCodeValue] = useState(DEFAULT_CODE);

  const [title, setTitle] = useState('组件库 v1.6 发布说明');
  const [category, setCategory] = useState<TreeSelectValue>('frontend');
  const [column, setColumn] = useState<CascaderModelValue>(['docs', 'guide']);
  const [tags, setTags] = useState<string[]>(['发布', '组件库']);
  const [collaborators, setCollaborators] = useState('@Alice 请补充前端改动；@Bob 复核设计稿。');
  const [publishNow, setPublishNow] = useState(true);
  const [published, setPublished] = useState(false);

  const currentColumnText = useMemo(() => columnText(column), [column]);

  const applyArticle = (article: Article) => {
    setAttachments(article.attachments);
    setUploadFiles([]);
    setArticleId(article.id);
    setTitle(article.title);
    setEditorType(article.editorType);
    setTags(article.tags);
    setCategory(article.category);
    setColumn(article.column);
    setPublished(article.published);
    if (article.editorType === 'markdown') {
      setMarkdownValue(article.body);
    } else if (article.editorType === 'code') {
      setCodeValue(article.body);
    } else {
      setRichValue(article.body);
    }
  };

  const buildPayload = (nextPublished: boolean) => ({
    title: title.trim(),
    editorType,
    body: currentEditorBody(editorType, richValue, markdownValue, codeValue),
    tags,
    category: asCategoryKey(category),
    column: asColumnPath(column),
    published: nextPublished,
    attachmentIds: attachments.map((item) => item.id),
  });

  const loadArticle = async () => {
    loadController.current?.abort();
    uploadControllers.current.forEach((controller) => controller.abort());
    setUploadFiles([]);
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const payload = await fetchArticle('a1', controller.signal);
      if (!controller.signal.aborted) applyArticle(payload.data);
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(readErrorMessage(error, '文章加载失败'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    void loadArticle();
    return () => {
      loadController.current?.abort();
      uploadControllers.current.forEach((controller) => controller.abort());
    };
  }, []);

  useEffect(() => {
    if (!pickerOpen || !canView) return;
    const controller = new AbortController();
    setMediaLoading(true);
    setMediaError('');
    void listMedia({ page: mediaPage, pageSize: 6, sortOrder: 'desc' }, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) { setMediaItems(data.items); setMediaTotal(data.total); } })
      .catch((error) => { if (!controller.signal.aborted) setMediaError(readErrorMessage(error, '媒体加载失败')); })
      .finally(() => { if (!controller.signal.aborted) setMediaLoading(false); });
    return () => controller.abort();
  }, [pickerOpen, canView, mediaPage, mediaRetry]);

  const addAttachment = (item: MediaItem) => {
    setAttachments((current) => current.some((entry) => entry.id === item.id) ? current : [...current, item]);
  };

  const handleUpload = async (upload: UploadFile) => {
    if (!upload.file || uploadControllers.current.has(upload.uid)) return;
    const controller = new AbortController();
    uploadControllers.current.set(upload.uid, controller);
    setUploadFiles((current) => current.map((item) => item.uid === upload.uid ? { ...item, status: 'uploading', error: undefined } : item));
    try {
      const item = await uploadOrReuseMedia(upload.file, controller.signal);
      if (controller.signal.aborted) return;
      addAttachment(item);
      setUploadFiles((current) => current.filter((entry) => entry.uid !== upload.uid));
    } catch (error) {
      if (!controller.signal.aborted) setUploadFiles((current) => current.map((item) => item.uid === upload.uid
        ? { ...item, status: 'error', error: readErrorMessage(error, '附件上传失败') } : item));
    } finally {
      uploadControllers.current.delete(upload.uid);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    const remaining = 12 - attachments.length - uploadFiles.length;
    if (files.length > remaining) {
      Message.warning({ content: `最多 12 个附件，当前还可添加 ${remaining} 个；本次未上传`, duration: 3000 });
      return;
    }
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      Message.warning({ content: '文件超过 10 MB 上限，本次未上传', duration: 3000 });
      return;
    }
    const added: UploadFile[] = files.map((file) => ({ uid: crypto.randomUUID(), name: file.name, file, status: 'uploading' }));
    setUploadFiles((current) => [...current, ...added]);
    added.forEach((file) => void handleUpload(file));
  };

  const removeUpload = (uid: string) => {
    uploadControllers.current.get(uid)?.abort();
    setUploadFiles((current) => current.filter((item) => item.uid !== uid));
  };

  const saveDraft = async () => {
    if (loading || saving || loadError || uploadFiles.length) return;
    setSaving(true);
    try {
      const payload = await saveArticle(articleId, buildPayload(false));
      applyArticle(payload.data);
      Message.success({ content: '草稿已保存', duration: 2200 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '草稿保存失败'), duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!publishNow) { await saveDraft(); return; }
    if (!title.trim()) {
      Message.warning({ content: '请先填写内容标题', duration: 2000 });
      return;
    }
    if (loading || saving || loadError || uploadFiles.length) return;
    setSaving(true);
    try {
      const payload = await saveArticle(articleId, buildPayload(true));
      applyArticle(payload.data);
      Message.success({ content: `《${title.trim()}》已发布`, duration: 2400 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '发布失败'), duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<EditIcon size={24} />}
        title="内容编辑"
        subtitle="多编辑器协作的文章工作台：富文本 / Markdown / 代码自由切换，配套分类、栏目与协作者元数据"
        tags={[
          { label: '内容管理', variant: 'primary' },
          { label: '演示数据', variant: 'info' },
        ]}
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            disabled={saving || loading || !!loadError}
            value={editorType}
            options={EDITOR_OPTIONS}
            onChange={(v) => setEditorType(v as EditorType)}
          />
          <Space size="sm" align="center" wrap>
            <div className="flex items-center gap-2">
              <Text size="sm" color="secondary">
                立即发布
              </Text>
              <Switch disabled={saving || loading || !!loadError} aria-label="立即发布" checked={publishNow} onChange={setPublishNow} />
            </div>
            <Button variant="outline" disabled={loading || saving || !!loadError || uploadFiles.length > 0} onClick={() => void saveDraft()}>
              <span className="mr-1 inline-flex align-middle">
                <DownloadIcon size={16} />
              </span>
              保存草稿
            </Button>
            <Button disabled={loading || saving || !!loadError || uploadFiles.length > 0} onClick={() => void publish()}>
              <span className="mr-1 inline-flex align-middle">
                <UploadIcon size={16} />
              </span>
              {publishNow ? '发布' : '保存'}
            </Button>
            <Button variant="ghost" disabled={saving || loading} onClick={() => void loadArticle()}>重新加载</Button>
          </Space>
        </div>
      </Card>

      {loadError ? (
        <Alert type="error" title="文章加载失败" description={loadError} action={<Button onClick={() => void loadArticle()}>重试</Button>} />
      ) : loading ? (
        <Card>
          <MutedPanel description="正在加载文章…" />
        </Card>
      ) : published ? (
        <Card>
          <Result
            status="success"
            title="发布成功"
            subTitle={`《${title}》已发布，栏目：${currentColumnText}`}
            extra={
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setPublished(false)}>
                  继续编辑
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div inert={saving} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card
            className="lg:col-span-2"
            header={
              <div className="flex items-center gap-2">
                <Text weight="bold">正文</Text>
                <Tag variant="warning" size="sm">
                  草稿
                </Tag>
              </div>
            }>
            <div className="space-y-3">
              <AutoComplete
                value={title}
                searchValue={title}
                options={TITLE_OPTIONS}
                allowFreeInput
                defaultActiveFirstOption={false}
                clearable
                placeholder="请输入内容标题"
                emptyText="没有匹配的历史标题"
                onChange={(value) => setTitle(String(value ?? ''))}
                onSearchChange={setTitle}
              />
              <Watermark content={['草稿 DRAFT', '内部预览']} font={{ fontSize: 15 }}>
                <div className="rounded-lg border border-(--tiger-border,#e5e7eb) p-1">
                  {editorType === 'rich' && (
                    <RichTextEditor value={richValue} height={320} onChange={setRichValue} placeholder="输入富文本内容…" />
                  )}
                  {editorType === 'markdown' && (
                    <MarkdownEditor value={markdownValue} height={320} defaultMode="split" onChange={setMarkdownValue} />
                  )}
                  {editorType === 'code' && (
                    <CodeEditor value={codeValue} language="typescript" minLines={14} maxLines={18} onChange={setCodeValue} />
                  )}
                </div>
              </Watermark>
              <MutedPanel
                compact
                description="标题、正文、分类、栏目、标签与附件随文章保存，刷新后恢复。附件上传后请保存草稿或发布；协作者备注仅供本页编辑参考。"
              />
            </div>
          </Card>

          <div className="space-y-6">
            <Card header={<Text weight="bold">分类与栏目</Text>}>
              <div className="space-y-4">
                <div>
                  <Text weight="medium" className="mb-1 block">
                    分类
                  </Text>
                  <TreeSelect
                    value={category}
                    treeData={CATEGORY_TREE}
                    placeholder="选择内容分类"
                    searchable
                    defaultExpandAll
                    onChange={setCategory}
                  />
                </div>
                <div>
                  <Text weight="medium" className="mb-1 block">
                    栏目层级
                  </Text>
                  <Cascader value={column} options={COLUMN_OPTIONS} placeholder="选择栏目层级" changeOnSelect onChange={setColumn} />
                </div>
              </div>
            </Card>

            <Card header={<Text weight="bold">标签</Text>}>
              <div className="space-y-3">
                <TagsInput
                  value={tags}
                  placeholder="输入标签后回车，可用逗号分隔"
                  max={12}
                  addOnBlur
                  clearable
                  onChange={setTags}
                />
                {!tags.length && (
                  <Text size="sm" color="secondary">
                    暂无标签
                  </Text>
                )}
              </div>
            </Card>

            <Card header={<Text weight="bold">协作者</Text>}>
              <div className="space-y-3">
                <Mentions value={collaborators} options={MENTION_OPTIONS} rows={3} onChange={setCollaborators} placeholder="输入 @ 指派协作者…" />
                <div>
                  <Text weight="medium" className="mb-1 block">
                    封面 / 附件
                  </Text>
                  <div className="space-y-3">
                    {canUpload && <>
                      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInputChange} disabled={saving || attachments.length + uploadFiles.length >= 12} />
                      <Button disabled={saving || attachments.length + uploadFiles.length >= 12} onClick={() => fileInputRef.current?.click()}><span className="inline-flex items-center gap-1"><UploadIcon size={14} />上传附件</span></Button>
                    </>}
                    <ul className="space-y-2" aria-label="附件上传">
                      {uploadFiles.map((file) => <li key={file.uid} className="space-y-1 rounded border border-(--tiger-border) p-2 text-sm">
                        <span className="block break-all">{file.name}</span>
                        {file.status === 'error' ? <span role="alert" className="block break-all text-(--tiger-error)">{file.error}</span> : <span role="status">正在上传…</span>}
                        <div className="flex gap-2">
                          {file.status === 'error' && <Button size="sm" variant="outline" aria-label={`重试上传 ${file.name}`} onClick={() => void handleUpload(file)}>重试</Button>}
                          <Button size="sm" variant="ghost" aria-label={`取消上传 ${file.name}`} onClick={() => removeUpload(file.uid)}>{file.status === 'error' ? '移除' : '取消'}</Button>
                        </div>
                      </li>)}
                    </ul>
                    {uploadFiles.length > 0 && <Text size="sm" color="secondary">请等待上传完成，或重试 / 移除失败项后保存文章。</Text>}
                    {canView && <Button variant="outline" size="sm" onClick={() => setPickerOpen(!pickerOpen)}>{pickerOpen ? '收起媒体选择' : '选择已有媒体'}</Button>}
                    {pickerOpen && canView && <div className="space-y-2 rounded border border-(--tiger-border) p-2">
                      {mediaError ? <Alert type="error" title={mediaError} action={<Button size="sm" onClick={() => setMediaRetry((value) => value + 1)}>重试</Button>} /> : mediaLoading ? <Text>正在加载媒体…</Text> : <>
                        {!mediaItems.length && <Text color="secondary">暂无媒体，请先上传附件</Text>}
                        {mediaItems.map((item) => <div key={item.id} className="flex min-w-0 items-center justify-between gap-2">
                          <span className="min-w-0 truncate">{item.originalFileName}</span>
                          <Button size="sm" variant="ghost" disabled={uploading > 0 || attachments.length + uploadFiles.length >= 12 || attachments.some((entry) => entry.id === item.id)} onClick={() => addAttachment(item)}>添加</Button>
                        </div>)}
                      </>}
                      <Pagination current={mediaPage} pageSize={6} total={mediaTotal} size="sm" onChange={setMediaPage} />
                    </div>}
                    <ul className="space-y-2" aria-label="文章附件">
                      {attachments.map((item) => <li key={item.id} className="flex min-w-0 items-center justify-between gap-2">
                        {canView ? <Button variant="ghost" size="sm" className="min-w-0 truncate" onClick={() => navigate(`/files/${item.id}`)}>{item.originalFileName}</Button> : <span className="min-w-0 truncate">{item.originalFileName}</span>}
                        <Button variant="ghost" size="sm" aria-label={`移除附件 ${item.originalFileName}`} onClick={() => setAttachments((current) => current.filter((entry) => entry.id !== item.id))}>移除</Button>
                      </li>)}
                    </ul>
                    {!attachments.length && <Text size="sm" color="secondary">暂无附件</Text>}
                    {!canUpload && <Text size="sm" color="secondary">当前账号无上传权限</Text>}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentPage;
