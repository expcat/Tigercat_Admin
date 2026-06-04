<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, Card, Message, Modal, Select, Tag, Text } from '@expcat/tigercat-vue'
import { FileManager } from '@expcat/tigercat-vue/FileManager'
import { Upload } from '@expcat/tigercat-vue/Upload'
import type { FileItem, UploadRequestOptions } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { batchDeleteMedia, listMedia, uploadMediaFile } from '../utils/media'
import { usePermission } from '../utils/permission'
import { clearWorkbenchSelection, loadWorkbenchState, saveWorkbenchState } from '../utils/workbench'
import type { MediaItem } from '../utils/types'

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
    Message.error({ content: e.message || '上传失败', duration: 3000 })
  }
}

async function confirmDelete() {
  if (selectedIds.value.length === 0) return
  try {
    deleting.value = true
    const res = await batchDeleteMedia(selectedIds.value)
    Message.success({ content: res.data.message || '已删除选中文件', duration: 3000 })
    selectedKeys.value = []
    clearWorkbenchSelection('files')
    deleteOpen.value = false
    await loadMedia()
  } catch (e: any) {
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
  if (typeof item.url === 'string') {
    window.open(item.url, '_blank', 'noopener,noreferrer')
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
      :tags="[{ label: '媒体资源', color: 'blue' }]"
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
          <Tag v-if="selectedIds.length > 0" color="blue" size="sm">
            已选择 {{ selectedIds.length }} 个
          </Tag>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            v-if="canDelete"
            variant="outline"
            color="danger"
            :disabled="selectedIds.length === 0"
            @click="deleteOpen = true"
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
      <Text>将删除 {{ selectedIds.length }} 个媒体资源。被引用的文件会被后端阻止删除。</Text>
    </Modal>
  </div>
</template>
