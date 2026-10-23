<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { Button } from '@expcat/tigercat-vue/Button'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Pagination } from '@expcat/tigercat-vue/Pagination'
import { Card } from '@expcat/tigercat-vue/Card'
import { AutoComplete } from '@expcat/tigercat-vue/AutoComplete'
import { Message } from '@expcat/tigercat-vue/Message'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { Switch } from '@expcat/tigercat-vue/Switch'
import { Space } from '@expcat/tigercat-vue/Space'
import {
  RichTextEditor,
  MarkdownEditor,
  CodeEditor,
} from '../utils/lazyTigercat'
import { TreeSelect } from '@expcat/tigercat-vue/TreeSelect'
import { Cascader } from '@expcat/tigercat-vue/Cascader'
import { TagsInput } from '@expcat/tigercat-vue/TagsInput'
import { Mentions } from '@expcat/tigercat-vue/Mentions'
import { Watermark } from '@expcat/tigercat-vue/Watermark'
import { Result } from '@expcat/tigercat-vue/Result'
import type {
  TreeNode,
  TreeSelectValue,
  CascaderOption,
  CascaderModelValue,
  MentionOption,
  UploadFile,
} from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'
import Icon from '../components/Icon.vue'
import { useRouter } from 'vue-router'
import { usePermission } from '../utils/permission'
import { listMedia, uploadOrReuseMedia } from '../utils/media'
import type { MediaItem } from '../utils/types'
import {
  asCategoryKey,
  asColumnPath,
  currentEditorBody,
  fetchArticle,
  saveArticle,
  type Article,
  type ArticleEditorType,
} from '../utils/content'

type EditorType = ArticleEditorType

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

const TITLE_OPTIONS = [
  { label: '组件库 v1.6 发布说明', value: '组件库 v1.6 发布说明' },
  { label: '管理后台使用指南', value: '管理后台使用指南' },
  { label: '版本更新日志', value: '版本更新日志' },
  { label: '权限模型说明', value: '权限模型说明' },
]

const MENTION_OPTIONS: MentionOption[] = [
  { value: 'alice', label: 'Alice（前端）' },
  { value: 'bob', label: 'Bob（设计）' },
  { value: 'carol', label: 'Carol（运营）' },
]

const DEFAULT_RICH =
  '<h2>组件库 v1.6 发布说明</h2><p>本次更新带来内容编辑工作台，支持富文本 / Markdown / 代码三种模式互切。</p>'
const DEFAULT_MARKDOWN =
  '# 组件库 v1.6 发布说明\n\n- 新增内容编辑工作台\n- 支持富文本 / Markdown / 代码切换\n- 元数据侧栏：分类、栏目、标签、协作者'
const DEFAULT_CODE =
  'export const version = "1.6.0";\n\nexport function release() {\n  return `Tigercat ${version} ready`;\n}'

const router = useRouter()
const { has } = usePermission()
const canUpload = computed(() => has('media:upload'))
const canView = computed(() => has('media:view'))
let loadController: AbortController | null = null
const uploadControllers = new Map<string, AbortController>()
const fileInputRef = ref<HTMLInputElement | null>(null)
const loadError = ref('')
const attachments = ref<MediaItem[]>([])
const uploadFiles = ref<UploadFile[]>([])
const uploading = computed(() => uploadFiles.value.filter((file) => file.status === 'uploading').length)
const pickerOpen = ref(false)
const mediaItems = ref<MediaItem[]>([])
const mediaPage = ref(1)
const mediaTotal = ref(0)
const mediaLoading = ref(false)
const mediaError = ref('')
let mediaController: AbortController | null = null

const articleId = ref('a1')
const loading = ref(false)
const saving = ref(false)
const editorType = ref<EditorType>('rich')
const richValue = ref(DEFAULT_RICH)
const markdownValue = ref(DEFAULT_MARKDOWN)
const codeValue = ref(DEFAULT_CODE)

const title = ref('组件库 v1.6 发布说明')
const category = ref<TreeSelectValue>('frontend')
const column = ref<CascaderModelValue>(['docs', 'guide'])
const tags = ref<string[]>(['发布', '组件库'])
const collaborators = ref('@Alice 请补充前端改动；@Bob 复核设计稿。')
const publishNow = ref(true)
const published = ref(false)

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

function applyArticle(article: Article) {
  attachments.value = article.attachments
  uploadFiles.value = []
  articleId.value = article.id
  title.value = article.title
  editorType.value = article.editorType
  tags.value = article.tags
  category.value = article.category
  column.value = article.column
  published.value = article.published
  if (article.editorType === 'markdown') {
    markdownValue.value = article.body
  } else if (article.editorType === 'code') {
    codeValue.value = article.body
  } else {
    richValue.value = article.body
  }
}

function buildPayload(nextPublished: boolean) {
  return {
    title: title.value.trim(),
    editorType: editorType.value,
    body: currentEditorBody(editorType.value, richValue.value, markdownValue.value, codeValue.value),
    tags: tags.value,
    category: asCategoryKey(category.value),
    column: asColumnPath(column.value),
    published: nextPublished,
    attachmentIds: attachments.value.map((item) => item.id),
  }
}

async function loadArticle() {
  loadController?.abort()
  uploadControllers.forEach((controller) => controller.abort())
  uploadFiles.value = []
  const controller = new AbortController()
  loadController = controller
  loading.value = true
  loadError.value = ''
  try {
    const payload = await fetchArticle('a1', controller.signal)
    if (!controller.signal.aborted) applyArticle(payload.data)
  } catch (error) {
    if (!controller.signal.aborted) loadError.value = readErrorMessage(error, '文章加载失败')
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

async function loadMedia(page = mediaPage.value) {
  mediaController?.abort()
  const controller = new AbortController()
  mediaController = controller
  mediaPage.value = page
  mediaLoading.value = true
  mediaError.value = ''
  try {
    const { data } = await listMedia({ page, pageSize: 6, sortOrder: 'desc' }, controller.signal)
    if (!controller.signal.aborted) { mediaItems.value = data.items; mediaTotal.value = data.total }
  } catch (error) {
    if (!controller.signal.aborted) mediaError.value = readErrorMessage(error, '媒体加载失败')
  } finally {
    if (!controller.signal.aborted) mediaLoading.value = false
  }
}

function togglePicker() {
  pickerOpen.value = !pickerOpen.value
  if (pickerOpen.value && canView.value) void loadMedia()
  else mediaController?.abort()
}

function addAttachment(item: MediaItem) {
  if (!attachments.value.some((entry) => entry.id === item.id)) attachments.value.push(item)
}

async function handleUpload(upload: UploadFile) {
  if (!upload.file || uploadControllers.has(upload.uid)) return
  const controller = new AbortController()
  uploadControllers.set(upload.uid, controller)
  uploadFiles.value = uploadFiles.value.map((item) => item.uid === upload.uid ? { ...item, status: 'uploading', error: undefined } : item)
  try {
    const item = await uploadOrReuseMedia(upload.file, controller.signal)
    if (controller.signal.aborted) return
    addAttachment(item)
    uploadFiles.value = uploadFiles.value.filter((entry) => entry.uid !== upload.uid)
  } catch (error) {
    if (!controller.signal.aborted) uploadFiles.value = uploadFiles.value.map((item) => item.uid === upload.uid
      ? { ...item, status: 'error', error: readErrorMessage(error, '附件上传失败') } : item)
  } finally {
    uploadControllers.delete(upload.uid)
  }
}

function handleFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  const remaining = 12 - attachments.value.length - uploadFiles.value.length
  if (files.length > remaining) {
    Message.warning({ content: `最多 12 个附件，当前还可添加 ${remaining} 个；本次未上传`, duration: 3000 })
    return
  }
  if (files.some((file) => file.size > 10 * 1024 * 1024)) {
    Message.warning({ content: '文件超过 10 MB 上限，本次未上传', duration: 3000 })
    return
  }
  const added: UploadFile[] = files.map((file) => ({ uid: crypto.randomUUID(), name: file.name, file, status: 'uploading' }))
  uploadFiles.value.push(...added)
  added.forEach((file) => void handleUpload(file))
}

function removeUpload(uid: string) {
  uploadControllers.get(uid)?.abort()
  uploadFiles.value = uploadFiles.value.filter((item) => item.uid !== uid)
}

onBeforeUnmount(() => {
  loadController?.abort()
  mediaController?.abort()
  uploadControllers.forEach((controller) => controller.abort())
})

async function saveDraft() {
  if (loading.value || saving.value || loadError.value || uploadFiles.value.length) return
  saving.value = true
  try {
    const payload = await saveArticle(articleId.value, buildPayload(false))
    applyArticle(payload.data)
    Message.success({ content: '草稿已保存', duration: 2200 })
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '草稿保存失败'), duration: 3000 })
  } finally {
    saving.value = false
  }
}

async function publish() {
  if (!publishNow.value) { await saveDraft(); return }
  if (!title.value.trim()) {
    Message.warning({ content: '请先填写内容标题', duration: 2000 })
    return
  }
  if (loading.value || saving.value || loadError.value || uploadFiles.value.length) return
  saving.value = true
  try {
    const payload = await saveArticle(articleId.value, buildPayload(true))
    applyArticle(payload.data)
    Message.success({ content: `《${title.value.trim()}》已发布`, duration: 2400 })
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '发布失败'), duration: 3000 })
  } finally {
    saving.value = false
  }
}

function continueEditing() {
  published.value = false
}

onMounted(() => {
  void loadArticle()
})

const currentColumnText = computed(() => {
  if (!column.value?.length) return '未选择'
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
        <Segmented :disabled="saving || loading || !!loadError" v-model="editorType" :options="EDITOR_OPTIONS" />
        <Space :size="'sm'" align="center" wrap>
          <div class="flex items-center gap-2">
            <Text size="sm" color="secondary">立即发布</Text>
            <Switch :disabled="saving || loading || !!loadError" aria-label="立即发布" :model-value="publishNow" @update:model-value="(v: boolean) => (publishNow = v)" />
          </div>
          <Button variant="outline" :disabled="loading || saving || !!loadError || uploadFiles.length > 0" @click="saveDraft">
            <Icon name="download" :size="16" class="mr-1" />
            保存草稿
          </Button>
          <Button :disabled="loading || saving || !!loadError || uploadFiles.length > 0" @click="publish">
            <Icon name="upload" :size="16" class="mr-1" />
            {{ publishNow ? '发布' : '保存' }}
          </Button>
          <Button variant="ghost" :disabled="saving || loading" @click="loadArticle">重新加载</Button>
        </Space>
      </div>
    </Card>

    <Alert v-if="loadError" type="error" title="文章加载失败" :description="loadError"><template #action><Button @click="loadArticle">重试</Button></template></Alert>
    <Card v-else-if="loading">
      <MutedPanel description="正在加载文章…" />
    </Card>

    <div v-else-if="published">
      <Card>
        <Result
          status="success"
          title="发布成功"
          :sub-title="`《${title}》已发布，栏目：${currentColumnText}`"
        >
          <div class="flex justify-center gap-2">
            <Button variant="outline" @click="continueEditing">继续编辑</Button>
          </div>
        </Result>
      </Card>
    </div>

    <div v-else :inert="saving" class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card class="lg:col-span-2">
        <template #header>
          <div class="flex items-center gap-2">
            <Text weight="bold">正文</Text>
            <Tag variant="warning" size="sm">草稿</Tag>
          </div>
        </template>
        <div class="space-y-3">
          <AutoComplete
            v-model="title"
            :search-value="title"
            :options="TITLE_OPTIONS"
            allow-free-input
            :default-active-first-option="false"
            clearable
            placeholder="请输入内容标题"
            empty-text="没有匹配的历史标题"
            @update:search-value="(query: string) => (title = query)"
          />
          <Watermark :content="['草稿 DRAFT', '内部预览']" :font="{ fontSize: 15 }">
            <div class="rounded-lg border border-(--tiger-border,#e5e7eb) p-1">
              <RichTextEditor
                v-if="editorType === 'rich'"
                v-model="richValue"
                :height="320"
                placeholder="输入富文本内容…"
              />
              <MarkdownEditor
                v-else-if="editorType === 'markdown'"
                v-model="markdownValue"
                :height="320"
                default-mode="split"
              />
              <CodeEditor
                v-else
                v-model="codeValue"
                language="typescript"
                :min-lines="14"
                :max-lines="18"
              />
            </div>
          </Watermark>
          <MutedPanel
            compact
            description="标题、正文、分类、栏目、标签与附件随文章保存，刷新后恢复。附件上传后请保存草稿或发布；协作者备注仅供本页编辑参考。"
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
                searchable
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
            <TagsInput
              v-model="tags"
              placeholder="输入标签后回车，可用逗号分隔"
              :max="12"
              add-on-blur
              clearable
            />
            <Text v-if="!tags.length" size="sm" color="secondary">暂无标签</Text>
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
              <div class="space-y-3">
                <template v-if="canUpload">
                  <input ref="fileInputRef" type="file" multiple class="hidden" :disabled="saving || attachments.length + uploadFiles.length >= 12" @change="handleFileInputChange" />
                  <Button :disabled="saving || attachments.length + uploadFiles.length >= 12" @click="fileInputRef?.click()"><span class="inline-flex items-center gap-1"><Icon name="upload" :size="14" />上传附件</span></Button>
                </template>
                <ul class="space-y-2" aria-label="附件上传">
                  <li v-for="file in uploadFiles" :key="file.uid" class="space-y-1 rounded border border-(--tiger-border) p-2 text-sm">
                    <span class="block break-all">{{ file.name }}</span>
                    <span v-if="file.status === 'error'" role="alert" class="block break-all text-(--tiger-error)">{{ file.error }}</span><span v-else role="status">正在上传…</span>
                    <div class="flex gap-2">
                      <Button v-if="file.status === 'error'" size="sm" variant="outline" :aria-label="`重试上传 ${file.name}`" @click="handleUpload(file)">重试</Button>
                      <Button size="sm" variant="ghost" :aria-label="`取消上传 ${file.name}`" @click="removeUpload(file.uid)">{{ file.status === 'error' ? '移除' : '取消' }}</Button>
                    </div>
                  </li>
                </ul>
                <Text v-if="uploadFiles.length > 0" size="sm" color="secondary">请等待上传完成，或重试 / 移除失败项后保存文章。</Text>
                <Button v-if="canView" variant="outline" size="sm" @click="togglePicker">{{ pickerOpen ? '收起媒体选择' : '选择已有媒体' }}</Button>
                <div v-if="pickerOpen && canView" class="space-y-2 rounded border border-(--tiger-border) p-2">
                  <Alert v-if="mediaError" type="error" :title="mediaError"><template #action><Button size="sm" @click="loadMedia()">重试</Button></template></Alert>
                  <Text v-else-if="mediaLoading">正在加载媒体…</Text>
                  <template v-else>
                    <Text v-if="!mediaItems.length" color="secondary">暂无媒体，请先上传附件</Text>
                    <div v-for="item in mediaItems" :key="item.id" class="flex min-w-0 items-center justify-between gap-2">
                      <span class="min-w-0 truncate">{{ item.originalFileName }}</span>
                      <Button size="sm" variant="ghost" :disabled="uploading > 0 || attachments.length + uploadFiles.length >= 12 || attachments.some((entry) => entry.id === item.id)" @click="addAttachment(item)">添加</Button>
                    </div>
                  </template>
                  <Pagination :current="mediaPage" :page-size="6" :total="mediaTotal" size="sm" @change="loadMedia" />
                </div>
                <ul class="space-y-2" aria-label="文章附件">
                  <li v-for="item in attachments" :key="item.id" class="flex min-w-0 items-center justify-between gap-2">
                    <Button v-if="canView" variant="ghost" size="sm" class="min-w-0 truncate" @click="router.push(`/files/${item.id}`)">{{ item.originalFileName }}</Button>
                    <span v-else class="min-w-0 truncate">{{ item.originalFileName }}</span>
                    <Button variant="ghost" size="sm" :aria-label="`移除附件 ${item.originalFileName}`" @click="attachments = attachments.filter((entry) => entry.id !== item.id)">移除</Button>
                  </li>
                </ul>
                <Text v-if="!attachments.length" size="sm" color="secondary">暂无附件</Text>
                <Text v-if="!canUpload" size="sm" color="secondary">当前账号无上传权限</Text>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
