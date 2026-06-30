<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card, Text, Tag, Button, Input, Message } from '@expcat/tigercat-vue'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { Switch } from '@expcat/tigercat-vue/Switch'
import { Space } from '@expcat/tigercat-vue/Space'
import { RichTextEditor } from '@expcat/tigercat-vue/RichTextEditor'
import { MarkdownEditor } from '@expcat/tigercat-vue/MarkdownEditor'
import { CodeEditor } from '@expcat/tigercat-vue/CodeEditor'
import { TreeSelect } from '@expcat/tigercat-vue/TreeSelect'
import { Cascader } from '@expcat/tigercat-vue/Cascader'
import { AutoComplete } from '@expcat/tigercat-vue/AutoComplete'
import { Mentions } from '@expcat/tigercat-vue/Mentions'
import { Upload } from '@expcat/tigercat-vue/Upload'
import { Watermark } from '@expcat/tigercat-vue/Watermark'
import { Result } from '@expcat/tigercat-vue/Result'
import type {
  TreeNode,
  TreeSelectValue,
  CascaderOption,
  CascaderValue,
  AutoCompleteOption,
  MentionOption,
} from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'
import Icon from '../components/Icon.vue'

type EditorType = 'rich' | 'markdown' | 'code'

const EDITOR_OPTIONS = [
  { label: '富文本', value: 'rich' },
  { label: 'Markdown', value: 'markdown' },
  { label: '代码', value: 'code' },
]

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
]

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
]

const TAG_OPTIONS: AutoCompleteOption[] = [
  { label: '发布', value: '发布' },
  { label: '公告', value: '公告' },
  { label: '教程', value: '教程' },
  { label: '组件库', value: '组件库' },
  { label: '设计规范', value: '设计规范' },
]

const MENTION_OPTIONS: MentionOption[] = [
  { value: 'alice', label: 'Alice（前端）' },
  { value: 'bob', label: 'Bob（设计）' },
  { value: 'carol', label: 'Carol（运营）' },
]

// ── 编辑器状态 ────────────────────────────────────
const editorType = ref<EditorType>('rich')
const richValue = ref('<h2>组件库 v1.6 发布说明</h2><p>本次更新带来内容编辑工作台，支持富文本 / Markdown / 代码三种模式互切。</p>')
const markdownValue = ref('# 组件库 v1.6 发布说明\n\n- 新增内容编辑工作台\n- 支持富文本 / Markdown / 代码切换\n- 元数据侧栏：分类、栏目、标签、协作者')
const codeValue = ref('export const version = "1.6.0";\n\nexport function release() {\n  return `Tigercat ${version} ready`;\n}')

// ── 元数据 ────────────────────────────────────────
const title = ref('组件库 v1.6 发布说明')
const category = ref<TreeSelectValue>('frontend')
const column = ref<CascaderValue>(['docs', 'guide'])
const tagInput = ref<string | number>('')
const tags = ref<string[]>(['发布', '组件库'])
const collaborators = ref('@Alice 请补充前端改动；@Bob 复核设计稿。')
const publishNow = ref(true)
const published = ref(false)

function addTag(value: string | number) {
  const text = String(value).trim()
  if (text && !tags.value.includes(text)) {
    tags.value = [...tags.value, text]
  }
  tagInput.value = ''
}
function removeTag(text: string) {
  tags.value = tags.value.filter((t) => t !== text)
}

function saveDraft() {
  Message.success({ content: '草稿已保存（演示）', duration: 2200 })
}
function publish() {
  if (!title.value.trim()) {
    Message.warning({ content: '请先填写内容标题', duration: 2000 })
    return
  }
  published.value = true
  Message.success({ content: `《${title.value.trim()}》已发布（演示）`, duration: 2400 })
}
function continueEditing() {
  published.value = false
}

const currentColumnText = computed(() => {
  if (!column.value.length) return '未选择'
  const labels: string[] = []
  let level = COLUMN_OPTIONS
  for (const v of column.value) {
    const found = level.find((o) => o.value === v)
    if (!found) break
    labels.push(found.label)
    level = found.children ?? []
  }
  return labels.join(' / ')
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="edit"
      title="内容编辑"
      subtitle="多编辑器协作的文章工作台：富文本 / Markdown / 代码自由切换，配套分类、栏目与协作者元数据"
      :tags="[
        { label: '内容管理', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
      ]"
    />

    <Card>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented v-model="editorType" :options="EDITOR_OPTIONS" />
        <Space :size="'sm'" align="center" wrap>
          <div class="flex items-center gap-2">
            <Text size="sm" color="secondary">立即发布</Text>
            <Switch v-model:checked="publishNow" />
          </div>
          <Button variant="outline" @click="saveDraft">
            <Icon name="download" :size="16" class="mr-1" />
            保存草稿
          </Button>
          <Button @click="publish">
            <Icon name="upload" :size="16" class="mr-1" />
            发布
          </Button>
        </Space>
      </div>
    </Card>

    <div v-if="published">
      <Card>
        <Result
          status="success"
          title="发布成功"
          :sub-title="`《${title}》已${publishNow ? '立即发布' : '加入发布队列'}，栏目：${currentColumnText}`"
        >
          <div class="flex justify-center gap-2">
            <Button variant="outline" @click="continueEditing">继续编辑</Button>
            <Button @click="saveDraft">查看发布记录</Button>
          </div>
        </Result>
      </Card>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card class="lg:col-span-2">
        <template #header>
          <div class="flex items-center gap-2">
            <Text weight="bold">正文</Text>
            <Tag variant="warning" size="sm">草稿</Tag>
          </div>
        </template>
        <div class="space-y-3">
          <Input v-model="title" placeholder="请输入内容标题" />
          <Watermark :content="['草稿 DRAFT', '内部预览']" :font="{ fontSize: 15 }">
            <div class="rounded-lg border border-(--tiger-border,#e5e7eb) p-1">
              <RichTextEditor
                v-if="editorType === 'rich'"
                v-model:value="richValue"
                :height="320"
                placeholder="输入富文本内容…"
              />
              <MarkdownEditor
                v-else-if="editorType === 'markdown'"
                v-model:value="markdownValue"
                :height="320"
                default-mode="split"
              />
              <CodeEditor
                v-else
                v-model:value="codeValue"
                language="typescript"
                :min-lines="14"
                :max-lines="18"
              />
            </div>
          </Watermark>
          <MutedPanel
            compact
            description="水印用于标识草稿状态；发布后正文水印移除（演示）。编辑器内容保存在内存中，刷新后重置。"
          />
        </div>
      </Card>

      <div class="space-y-6">
        <Card>
          <template #header><Text weight="bold">分类与栏目</Text></template>
          <div class="space-y-4">
            <div>
              <Text weight="medium" class="mb-1 block">分类</Text>
              <TreeSelect
                v-model="category"
                :tree-data="CATEGORY_TREE"
                placeholder="选择内容分类"
                show-search
                default-expand-all
              />
            </div>
            <div>
              <Text weight="medium" class="mb-1 block">栏目层级</Text>
              <Cascader
                v-model="column"
                :options="COLUMN_OPTIONS"
                placeholder="选择栏目层级"
                change-on-select
              />
            </div>
          </div>
        </Card>

        <Card>
          <template #header><Text weight="bold">标签</Text></template>
          <div class="space-y-3">
            <AutoComplete
              v-model="tagInput"
              :options="TAG_OPTIONS"
              placeholder="输入或选择标签后回车"
              allow-free-input
              @select="addTag"
            />
            <div class="flex flex-wrap gap-2">
              <Tag
                v-for="t in tags"
                :key="t"
                variant="primary"
                size="sm"
                closable
                @close="removeTag(t)"
              >
                {{ t }}
              </Tag>
              <Text v-if="!tags.length" size="sm" color="secondary">暂无标签</Text>
            </div>
          </div>
        </Card>

        <Card>
          <template #header><Text weight="bold">协作者</Text></template>
          <div class="space-y-3">
            <Mentions
              v-model="collaborators"
              :options="MENTION_OPTIONS"
              :rows="3"
              placeholder="输入 @ 指派协作者…"
            />
            <div>
              <Text weight="medium" class="mb-1 block">封面 / 附件</Text>
              <Upload :auto-upload="false" accept="image/*" :multiple="true">
                <Button variant="outline" size="sm">
                  <Icon name="upload" :size="14" class="mr-1" />
                  选择文件
                </Button>
              </Upload>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
