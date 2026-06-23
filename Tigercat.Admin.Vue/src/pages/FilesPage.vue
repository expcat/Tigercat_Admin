<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, Card, Checkbox, Message, Modal, Select, Tag, Text } from '@expcat/tigercat-vue'
import { FileManager } from '@expcat/tigercat-vue/FileManager'
import { Upload } from '@expcat/tigercat-vue/Upload'
import type { FileItem, UploadRequestOptions } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { batchDeleteMedia, getMediaDetail, listMedia, uploadMediaFile } from '../utils/media'
import { usePermission } from '../utils/permission'
import { ApiError } from '../utils/request'
import { clearWorkbenchSelection, loadWorkbenchState, saveWorkbenchState } from '../utils/workbench'
import type { DuplicateMediaResult, MediaDetail, MediaItem, MediaReference } from '../utils/types'

const typeOptions = [
  { label: '全部类型', value: '' },
  { label: '图片', value: 'image/' },
  { label: 'PDF', value: 'application/pdf' },
  { label: '文本', value: 'text/' },
  { label: '表格', value: 'application/vnd' },
]

const { has: hasPerm } = usePermission()
const canUpload = computed(() => hasPerm('media:upload'))
const canDelete = computed(() => hasPerm('media:delete'))
const savedWorkbench = loadWorkbenchState('files', {
  queryState: { contentType: '', keyword: '' },
  selectedRowKeys: [],
})
const savedQuery = savedWorkbench.queryState

const items = ref<MediaItem[]>([])
const loading = ref(false)
const contentType = ref(savedQuery.contentType ?? '')
const searchText = ref(savedQuery.keyword ?? '')
const selectedKeys = ref<(string | number)[]>(savedWorkbench.selectedRowKeys)
const deleteOpen = ref(false)
const deleting = ref(false)
const forceDelete = ref(false)
const deleteReferences = ref<MediaReference[]>([])
const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref<MediaDetail | null>(null)

const files = computed<FileItem[]>(() =>
  items.value.map((item) => ({
    key: item.id,
    name: item.originalFileName,
    type: 'file',
    extension: item.extension ?? undefined,
    size: item.sizeBytes,
    modified: item.createdAt,
    mimeType: item.contentType,
    url: item.url,
    referenceCount: item.referenceCount,
  }))
)

const selectedIds = computed(() =>
  selectedKeys.value.map(Number).filter((id) => Number.isFinite(id))
)

const isDetailImage = computed(() => detail.value?.contentType.startsWith('image/') ?? false)

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function referenceLabel(reference: MediaReference) {
  return reference.displayName || `${reference.referenceType}:${reference.referenceKey}`
}

function describeUploadError(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    const duplicate = error.data as DuplicateMediaResult | undefined
    return duplicate?.existing
      ? `文件已存在，可复用 ${duplicate.existing.originalFileName}`
      : error.message
  }

  return error instanceof Error ? error.message : '上传失败'
}

async function loadMedia() {
  try {
    loading.value = true
    const res = await listMedia({
      page: 1,
      pageSize: 100,
      keyword: searchText.value,
      contentType: contentType.value || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
    items.value = res.data.items
  } catch (e: any) {
    Message.error({ content: e.message || '加载媒体资源失败', duration: 3000 })
  } finally {
    loading.value = false
  }
}

async function handleUpload(options: UploadRequestOptions) {
  try {
    options.onProgress?.(20)
    const media = await uploadMediaFile(options.file, 'file')
    options.onProgress?.(100)
    options.onSuccess?.(media)
    Message.success({ content: '文件已上传', duration: 3000 })
    await loadMedia()
  } catch (e: any) {
    options.onError?.(e)
    Message.error({ content: describeUploadError(e), duration: 3000 })
  }
}

async function openDetail(id: number) {
  try {
    detailOpen.value = true
    detailLoading.value = true
    const res = await getMediaDetail(id)
    detail.value = res.data
  } catch (e: any) {
    Message.error({ content: e.message || '加载媒体详情失败', duration: 3000 })
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

async function openDeleteModal() {
  forceDelete.value = false
  deleteReferences.value = []
  deleteOpen.value = true

  try {
    const details = await Promise.all(selectedIds.value.map((id) => getMediaDetail(id)))
    deleteReferences.value = details.flatMap((res) => res.data.references)
  } catch {
    deleteReferences.value = []
  }
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    Message.success({ content: 'URL 已复制', duration: 2000 })
  } catch {
    Message.error({ content: '复制失败', duration: 3000 })
  }
}

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function handleForceDeleteChange(value: boolean | Event) {
  forceDelete.value = typeof value === 'boolean'
    ? value
    : Boolean((value.target as HTMLInputElement | null)?.checked)
}

async function confirmDelete(forceOverride?: boolean | Event) {
  if (selectedIds.value.length === 0) return
  const shouldForce = typeof forceOverride === 'boolean' ? forceOverride : forceDelete.value
  try {
    deleting.value = true
    const res = await batchDeleteMedia(selectedIds.value, shouldForce)
    Message.success({ content: res.data.message || '已删除选中文件', duration: 3000 })
    selectedKeys.value = []
    clearWorkbenchSelection('files')
    deleteOpen.value = false
    await loadMedia()
  } catch (e: any) {
    if (e instanceof ApiError && e.status === 409 && Array.isArray(e.data)) {
      deleteReferences.value = e.data as MediaReference[]
    }
    Message.error({ content: e.message || '删除失败', duration: 3000 })
  } finally {
    deleting.value = false
  }
}

async function handleContentTypeChange(value: unknown) {
  contentType.value = String(value ?? '')
  saveWorkbenchState('files', {
    queryState: { contentType: contentType.value, keyword: searchText.value },
  })
  await loadMedia()
}

async function handleSearchTextChange(value: string) {
  searchText.value = value
  saveWorkbenchState('files', {
    queryState: { contentType: contentType.value, keyword: searchText.value },
  })
  await loadMedia()
}

function handleSelectedKeysChange(keys: (string | number)[]) {
  selectedKeys.value = keys
  saveWorkbenchState('files', { selectedRowKeys: keys })
}

function handleOpen(item: any) {
  const id = Number(item.key)
  if (Number.isFinite(id)) {
    openDetail(id)
  }
}

onMounted(loadMedia)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="文件管理"
      subtitle="管理站点 Logo、用户头像与后台媒体资源"
      icon="fileText"
      :tags="[{ label: '媒体资源', variant: 'primary' }]"
    />

    <Card>
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select
            :model-value="contentType"
            :options="typeOptions"
            placeholder="筛选类型"
            :clearable="false"
            @update:model-value="handleContentTypeChange"
          />
          <Tag v-if="selectedIds.length > 0" variant="primary" size="sm">
            已选择 {{ selectedIds.length }} 个
          </Tag>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            variant="outline"
            :disabled="selectedIds.length !== 1"
            @click="openDetail(selectedIds[0])"
          >
            查看详情
          </Button>
          <Button
            v-if="canDelete"
            variant="outline"
            danger
            :disabled="selectedIds.length === 0"
            @click="openDeleteModal"
          >
            删除选中
          </Button>
          <Upload
            v-if="canUpload"
            accept="image/*,.pdf,.txt,.csv,.json,.xlsx,.xls"
            :show-file-list="false"
            :max-size="10 * 1024 * 1024"
            :custom-request="handleUpload"
          >
            <span class="flex items-center gap-1">
              <Icon name="upload" :size="16" />
              上传文件
            </span>
          </Upload>
        </div>
      </div>

      <FileManager
        :files="files"
        view-mode="list"
        multiple
        searchable
        :loading="loading"
        :selected-keys="selectedKeys"
        :search-text="searchText"
        empty-text="暂无媒体资源"
        @update:selected-keys="handleSelectedKeysChange"
        @update:search-text="handleSearchTextChange"
        @open="handleOpen"
      />

      <div class="p2-text-secondary mt-3 text-sm">
        <Text size="sm" color="secondary">
          被 Logo 或头像引用的媒体会在删除时返回冲突提示。
        </Text>
      </div>
    </Card>

    <Modal
      v-model:open="deleteOpen"
      title="确认删除文件"
      show-default-footer
      :ok-text="deleting ? '删除中…' : '确认删除'"
      cancel-text="取消"
      @ok="confirmDelete"
      @cancel="deleteOpen = false"
    >
      <div class="space-y-3">
        <Text>将删除 {{ selectedIds.length }} 个媒体资源。被引用的文件会被后端阻止删除。</Text>
        <div
          v-if="deleteReferences.length > 0"
          class="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <div class="mb-2 font-medium">引用来源</div>
          <ul class="space-y-1">
            <li v-for="reference in deleteReferences" :key="reference.id">
              {{ referenceLabel(reference) }}
            </li>
          </ul>
        </div>
        <label v-if="deleteReferences.length > 0" class="p2-checkbox-row text-sm">
          <Checkbox :checked="forceDelete" @update:checked="handleForceDeleteChange" />
          <span class="p2-checkbox-label">强制删除并清理已知 Logo / 头像引用</span>
        </label>
        <Button
          v-if="deleteReferences.length > 0"
          variant="outline"
          danger
          :disabled="deleting"
          @click="confirmDelete(true)"
        >
          强制删除
        </Button>
      </div>
    </Modal>

    <Modal
      v-model:open="detailOpen"
      title="媒体详情"
      :show-default-footer="false"
      @cancel="detailOpen = false"
    >
      <Text v-if="detailLoading || !detail">加载中…</Text>
      <div v-else class="space-y-4">
        <div v-if="isDetailImage" class="overflow-hidden rounded border border-slate-200 bg-slate-50">
          <img
            :src="detail.url"
            :alt="detail.originalFileName"
            class="max-h-64 w-full object-contain"
          />
        </div>
        <div class="grid gap-3 text-sm sm:grid-cols-2">
          <div><span class="text-slate-500">文件名：</span>{{ detail.originalFileName }}</div>
          <div><span class="text-slate-500">大小：</span>{{ formatBytes(detail.sizeBytes) }}</div>
          <div><span class="text-slate-500">类型：</span>{{ detail.contentType }}</div>
          <div><span class="text-slate-500">Provider：</span>{{ detail.storageProvider }}</div>
          <div>
            <span class="text-slate-500">尺寸：</span>
            {{ detail.width && detail.height ? `${detail.width} x ${detail.height}` : '未识别' }}
          </div>
          <div><span class="text-slate-500">上传人：</span>{{ detail.uploadedBy || '未知' }}</div>
          <div class="break-all sm:col-span-2">
            <span class="text-slate-500">SHA256：</span>{{ detail.sha256Hash || '未记录' }}
          </div>
          <div class="break-all sm:col-span-2">
            <span class="text-slate-500">URL：</span>{{ detail.url }}
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="copyUrl(detail.url)">
            <span class="flex items-center gap-1">
              <Icon name="clipboard" :size="16" />
              复制 URL
            </span>
          </Button>
          <Button variant="outline" @click="openUrl(detail.url)">
            <span class="flex items-center gap-1">
              <Icon name="link" :size="16" />
              打开资源
            </span>
          </Button>
        </div>
        <div>
          <div class="mb-2 text-sm font-medium">引用来源</div>
          <Text v-if="detail.references.length === 0" size="sm" color="secondary">暂无引用</Text>
          <div v-else class="flex flex-wrap gap-2">
            <Tag v-for="reference in detail.references" :key="reference.id" variant="primary" size="sm">
              {{ referenceLabel(reference) }}
            </Tag>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>
