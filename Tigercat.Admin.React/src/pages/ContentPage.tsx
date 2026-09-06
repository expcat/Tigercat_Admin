import { useEffect, useMemo, useState } from 'react';
import { Button } from '@expcat/tigercat-react/Button';
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
import { Upload } from '@expcat/tigercat-react/Upload';
import { Watermark } from '@expcat/tigercat-react/Watermark';
import { Result } from '@expcat/tigercat-react/Result';
import type {
  TreeNode,
  TreeSelectValue,
  CascaderOption,
  CascaderModelValue,
  MentionOption,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';
import { EditIcon, UploadIcon, DownloadIcon } from '../components/Icons';
import { ApiError } from '../utils/request';
import {
  asCategoryKey,
  asColumnPath,
  currentEditorBody,
  fetchArticle,
  fetchArticles,
  saveArticle,
  unwrapArticles,
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
  });

  useEffect(() => {
    let cancelled = false;
    const loadArticle = async () => {
      setLoading(true);
      try {
        let article: Article | undefined;
        try {
          const payload = await fetchArticle('a1');
          article = payload.data;
        } catch (error: unknown) {
          if (!(error instanceof ApiError) || error.status !== 404) throw error;
          const list = await fetchArticles();
          article = unwrapArticles(list.data)[0];
        }
        if (!cancelled && article) applyArticle(article);
      } catch (error: unknown) {
        if (!cancelled) {
          Message.error({ content: readErrorMessage(error, '文章加载失败'), duration: 3000 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadArticle();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveDraft = async () => {
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
    if (!title.trim()) {
      Message.warning({ content: '请先填写内容标题', duration: 2000 });
      return;
    }
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
            value={editorType}
            options={EDITOR_OPTIONS}
            onChange={(v) => setEditorType(v as EditorType)}
          />
          <Space size="sm" align="center" wrap>
            <div className="flex items-center gap-2">
              <Text size="sm" color="secondary">
                立即发布
              </Text>
              <Switch checked={publishNow} onChange={setPublishNow} />
            </div>
            <Button variant="outline" disabled={loading || saving} onClick={() => void saveDraft()}>
              <span className="mr-1 inline-flex align-middle">
                <DownloadIcon size={16} />
              </span>
              保存草稿
            </Button>
            <Button disabled={loading || saving} onClick={() => void publish()}>
              <span className="mr-1 inline-flex align-middle">
                <UploadIcon size={16} />
              </span>
              发布
            </Button>
          </Space>
        </div>
      </Card>

      {loading && !published ? (
        <Card>
          <MutedPanel description="正在加载文章…" />
        </Card>
      ) : published ? (
        <Card>
          <Result
            status="success"
            title="发布成功"
            subTitle={`《${title}》已${publishNow ? '立即发布' : '加入发布队列'}，栏目：${currentColumnText}`}
            extra={
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setPublished(false)}>
                  继续编辑
                </Button>
                <Button disabled={saving} onClick={() => void saveDraft()}>
                  查看发布记录
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                description="水印用于标识草稿状态；发布后正文水印移除（演示）。标题、正文与分类栏目标签会保存到服务端，刷新后从接口恢复。协作者与附件仍仅本页有效。"
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
                  <Upload autoUpload={false} accept="image/*" multiple>
                    <Button variant="outline" size="sm">
                      <span className="mr-1 inline-flex align-middle">
                        <UploadIcon size={14} />
                      </span>
                      选择文件
                    </Button>
                  </Upload>
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
