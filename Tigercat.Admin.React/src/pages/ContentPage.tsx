import { useMemo, useState } from 'react';
import { Card, Text, Tag, Button, Input, Message } from '@expcat/tigercat-react';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { Switch } from '@expcat/tigercat-react/Switch';
import { Space } from '@expcat/tigercat-react/Space';
import { RichTextEditor } from '@expcat/tigercat-react/RichTextEditor';
import { MarkdownEditor } from '@expcat/tigercat-react/MarkdownEditor';
import { CodeEditor } from '@expcat/tigercat-react/CodeEditor';
import { TreeSelect } from '@expcat/tigercat-react/TreeSelect';
import { Cascader } from '@expcat/tigercat-react/Cascader';
import { AutoComplete } from '@expcat/tigercat-react/AutoComplete';
import { Mentions } from '@expcat/tigercat-react/Mentions';
import { Upload } from '@expcat/tigercat-react/Upload';
import { Watermark } from '@expcat/tigercat-react/Watermark';
import { Result } from '@expcat/tigercat-react/Result';
import type {
  TreeNode,
  TreeSelectValue,
  CascaderOption,
  CascaderValue,
  AutoCompleteOption,
  MentionOption,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';
import { EditIcon, UploadIcon, DownloadIcon } from '../components/Icons';

type EditorType = 'rich' | 'markdown' | 'code';

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

const TAG_OPTIONS: AutoCompleteOption[] = [
  { label: '发布', value: '发布' },
  { label: '公告', value: '公告' },
  { label: '教程', value: '教程' },
  { label: '组件库', value: '组件库' },
  { label: '设计规范', value: '设计规范' },
];

const MENTION_OPTIONS: MentionOption[] = [
  { value: 'alice', label: 'Alice（前端）' },
  { value: 'bob', label: 'Bob（设计）' },
  { value: 'carol', label: 'Carol（运营）' },
];

function columnText(value: CascaderValue): string {
  if (!value.length) return '未选择';
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

function ContentPage() {
  const [editorType, setEditorType] = useState<EditorType>('rich');
  const [richValue, setRichValue] = useState(
    '<h2>组件库 v1.6 发布说明</h2><p>本次更新带来内容编辑工作台，支持富文本 / Markdown / 代码三种模式互切。</p>',
  );
  const [markdownValue, setMarkdownValue] = useState(
    '# 组件库 v1.6 发布说明\n\n- 新增内容编辑工作台\n- 支持富文本 / Markdown / 代码切换\n- 元数据侧栏：分类、栏目、标签、协作者',
  );
  const [codeValue, setCodeValue] = useState(
    'export const version = "1.6.0";\n\nexport function release() {\n  return `Tigercat ${version} ready`;\n}',
  );

  const [title, setTitle] = useState('组件库 v1.6 发布说明');
  const [category, setCategory] = useState<TreeSelectValue>('frontend');
  const [column, setColumn] = useState<CascaderValue>(['docs', 'guide']);
  const [tagInput, setTagInput] = useState<string | number>('');
  const [tags, setTags] = useState<string[]>(['发布', '组件库']);
  const [collaborators, setCollaborators] = useState('@Alice 请补充前端改动；@Bob 复核设计稿。');
  const [publishNow, setPublishNow] = useState(true);
  const [published, setPublished] = useState(false);

  const currentColumnText = useMemo(() => columnText(column), [column]);

  const addTag = (value: string | number) => {
    const text = String(value).trim();
    if (text && !tags.includes(text)) {
      setTags((prev) => [...prev, text]);
    }
    setTagInput('');
  };
  const removeTag = (text: string) => setTags((prev) => prev.filter((t) => t !== text));

  const saveDraft = () => Message.success({ content: '草稿已保存（演示）', duration: 2200 });
  const publish = () => {
    if (!title.trim()) {
      Message.warning({ content: '请先填写内容标题', duration: 2000 });
      return;
    }
    setPublished(true);
    Message.success({ content: `《${title.trim()}》已发布（演示）`, duration: 2400 });
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
            <Button variant="outline" onClick={saveDraft}>
              <span className="mr-1 inline-flex align-middle">
                <DownloadIcon size={16} />
              </span>
              保存草稿
            </Button>
            <Button onClick={publish}>
              <span className="mr-1 inline-flex align-middle">
                <UploadIcon size={16} />
              </span>
              发布
            </Button>
          </Space>
        </div>
      </Card>

      {published ? (
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
                <Button onClick={saveDraft}>查看发布记录</Button>
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
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请输入内容标题" />
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
                description="水印用于标识草稿状态；发布后正文水印移除（演示）。编辑器内容保存在内存中，刷新后重置。"
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
                    showSearch
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
                <AutoComplete
                  value={tagInput}
                  options={TAG_OPTIONS}
                  placeholder="输入或选择标签后回车"
                  allowFreeInput
                  onChange={setTagInput}
                  onSelect={(value) => addTag(value)}
                />
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <Tag key={t} variant="primary" size="sm" closable onClose={() => removeTag(t)}>
                      {t}
                    </Tag>
                  ))}
                  {!tags.length && (
                    <Text size="sm" color="secondary">
                      暂无标签
                    </Text>
                  )}
                </div>
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
