<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { Button } from '@expcat/tigercat-vue/Button'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Pagination } from '@expcat/tigercat-vue/Pagination'
import { Card } from '@expcat/tigercat-vue/Card'
import { Checkbox } from '@expcat/tigercat-vue/Checkbox'
import { DropdownItem } from '@expcat/tigercat-vue/Dropdown'
import { Message } from '@expcat/tigercat-vue/Message'
import { Modal } from '@expcat/tigercat-vue/Modal'
import { Select } from '@expcat/tigercat-vue/Select'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { FileManager } from '@expcat/tigercat-vue/FileManager'
import { ContextMenu, ContextMenuItem, ContextMenuMenu, ContextMenuSub } from '@expcat/tigercat-vue/ContextMenu'
import { SplitButton } from '@expcat/tigercat-vue/SplitButton'
import type { FileItem } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { batchDeleteMedia, getMediaDetail, listMedia, uploadMediaFile } from '../utils/media'
import { usePermission } from '../utils/permission'
import { ApiError } from '../utils/request'
import { clearWorkbenchSelection, loadWorkbenchState, saveWorkbenchState } from '../utils/workbench'
import type { DuplicateMediaResult, MediaItem, MediaReference } from '../utils/types'
import { useRouter } from 'vue-router'
const router = useRouter()
const FILE_UPLOAD_ACCEPT = 'image/*,.pdf,.txt,.csv,.json,.xlsx,.xls'
const FILE_UPLOAD_MAX_SIZE = 10 * 1024 * 1024

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
const page = ref(1)
const total = ref(0)
const loadError = ref('')
const deleteLoading = ref(false)
const deleteError = ref('')
const deleteIds = ref<number[]>([])
const uploading = ref(false)
const uploadError = ref('')
const failedFile = ref<File | null>(null)
const duplicate = ref<MediaItem | null>(null)
let loadController: AbortController | null = null
let deleteController: AbortController | null = null
let uploadController: AbortController | null = null
const contextFile = ref<MediaItem | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const files = computed<FileItem[]>(() =>
  items.value.map((item) => ({
    key: item.id,
    name: item.originalFileName,
    type: 'file',
    extension: item.extension ?? undefined,
    size: item.sizeBytes,
    modified: new Date(item.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    mimeType: item.contentType,
    url: item.url,
    referenceCount: item.referenceCount,
  }))
)

const selectedIds = computed(() =>
  selectedKeys.value.map(Number).filter((id) => Number.isFinite(id))
)

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
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await listMedia({ page: page.value, pageSize: 20, keyword: searchText.value, contentType: contentType.value || undefined, sortBy: 'createdAt', sortOrder: 'desc' }, controller.signal)
    if (controller.signal.aborted) return
    items.value = data.items
    total.value = data.total
    selectedKeys.value = selectedKeys.value.filter((key) => data.items.some((item) => item.id === Number(key)))
    const lastPage = Math.max(1, Math.ceil(data.total / 20))
    if (page.value > lastPage) { page.value = lastPage; void loadMedia() }
  } catch (error) {
    if (!controller.signal.aborted) loadError.value = error instanceof Error ? error.message : '加载媒体资源失败'
  } finally { if (!controller.signal.aborted) loading.value = false }
}

async function handleUpload(file: File) {
  if (!canUpload.value || uploading.value) return
  const controller = new AbortController()
  uploadController = controller
  uploading.value = true
  failedFile.value = null
  duplicate.value = null
  uploadError.value = ''
  try {
    await uploadMediaFile(file, 'file', controller.signal)
    if (controller.signal.aborted) return
    Message.success({ content: '文件已上传', duration: 2200 })
    page.value = 1
    await loadMedia()
  } catch (error) {
    if (controller.signal.aborted) return
    uploadError.value = describeUploadError(error)
    const existing = error instanceof ApiError && error.status === 409 ? (error.data as DuplicateMediaResult)?.existing : undefined
    duplicate.value = existing ?? null
    if (!existing) failedFile.value = file
  } finally { uploading.value = false }
}

function openDetail(id: number) { void router.push(`/files/${id}`) }
async function openDeleteModal(ids = selectedIds.value) {
  if (!canDelete.value || !ids.length || deleting.value) return
  deleteController?.abort()
  const controller = new AbortController()
  deleteController = controller
  deleteIds.value = ids
  forceDelete.value = false
  deleteReferences.value = []
  deleteError.value = ''
  deleteLoading.value = true
  deleteOpen.value = true
  try {
    const details = await Promise.all(ids.map((id) => getMediaDetail(id, controller.signal)))
    if (!controller.signal.aborted) deleteReferences.value = details.flatMap((res) => res.data.references)
  } catch (error) {
    if (!controller.signal.aborted) deleteError.value = error instanceof Error ? error.message : '引用读取失败'
  } finally { if (!controller.signal.aborted) deleteLoading.value = false }
}
function closeDelete() {
  if (deleting.value) return
  deleteController?.abort()
  deleteOpen.value = false
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

async function confirmDelete() {
  if (!canDelete.value || !deleteIds.value.length || deleting.value || deleteLoading.value || deleteError.value) return
  try {
    deleting.value = true
    const res = await batchDeleteMedia(deleteIds.value, forceDelete.value)
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
  page.value = 1
  selectedKeys.value = []
  clearWorkbenchSelection('files')
  contentType.value = String(value ?? '')
  saveWorkbenchState('files', {
    queryState: { contentType: contentType.value, keyword: searchText.value },
  })
  await loadMedia()
}

async function handleSearchTextChange(value: string) {
  page.value = 1
  selectedKeys.value = []
  clearWorkbenchSelection('files')
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

function resolveFileFromEvent(event: MouseEvent): MediaItem | null {
  const option = (event.target as HTMLElement | null)?.closest('[role="option"]')
  if (!(option instanceof HTMLElement)) return null
  const name = option.querySelector('.truncate')?.textContent?.trim()
  if (name) {
    const matches = items.value.filter((item) => item.originalFileName === name)
    if (matches.length === 1) return matches[0]
  }
  const index = Number(option.dataset.optionIndex)
  const file = Number.isFinite(index) ? files.value[index] : undefined
  if (!file) return matchesFromName(name)
  return items.value.find((item) => item.id === Number(file.key)) ?? matchesFromName(name)
}

function matchesFromName(name: string | undefined): MediaItem | null {
  if (!name) return null
  return items.value.find((item) => item.originalFileName === name) ?? null
}

function onFilesContextMenu(event: MouseEvent) {
  contextFile.value = resolveFileFromEvent(event)
  if (!contextFile.value) {
    event.stopPropagation()
  }
}

function previewContextFile() {
  const file = contextFile.value
  if (!file) return
  void openDetail(file.id)
}

function openContextFile() {
  const file = contextFile.value
  if (!file) return
  openUrl(file.url)
}

function copyContextFileUrl() {
  const file = contextFile.value
  if (!file) return
  void copyUrl(file.url)
}

async function deleteContextFile() {
  const file = contextFile.value
  if (!file || !canDelete.value) return
  selectedKeys.value = [file.id]
  saveWorkbenchState('files', { selectedRowKeys: [file.id] })
  await openDeleteModal()
}

function triggerFilePick() {
  fileInputRef.value?.click()
}

async function handleFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > FILE_UPLOAD_MAX_SIZE) {
    Message.error({ content: '文件超过 10 MB 上限', duration: 3000 })
    return
  }
  await handleUpload(file)
}

function changePage(next: number) {
  page.value = next
  selectedKeys.value = []
  clearWorkbenchSelection('files')
  void loadMedia()
}
onMounted(loadMedia)
onBeforeUnmount(() => { loadController?.abort(); deleteController?.abort(); uploadController?.abort() })
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
            aria-label="筛选类型"
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
            :disabled="loading || !!loadError || selectedIds.length !== 1"
            @click="openDetail(selectedIds[0])"
          >
            查看详情
          </Button>
          <Button
            v-if="canDelete"
            variant="outline"
            danger
            :disabled="loading || !!loadError || selectedIds.length === 0"
            @click="openDeleteModal()"
          >
            删除选中
          </Button>
          <SplitButton
            v-if="canUpload"
            :disabled="uploading"
            trigger-aria-label="更多操作"
            @click="triggerFilePick"
          >
            <span class="flex items-center gap-1">
              <Icon name="upload" :size="16" />
              上传文件
            </span>
            <template #menu>
              <DropdownItem @click="triggerFilePick">选择文件</DropdownItem>
            </template>
          </SplitButton>
          <input
            v-if="canUpload"
            ref="fileInputRef"
            type="file"
            class="hidden"
            :accept="FILE_UPLOAD_ACCEPT"
            @change="handleFileInputChange"
          >
        </div>
      </div>

      <div v-if="uploading" class="mb-3 flex items-center gap-2"><Text>正在上传…</Text><Button size="sm" variant="outline" @click="uploadController?.abort()">取消上传</Button></div>
      <Alert v-if="uploadError" type="error" :title="uploadError"><template #action><Button v-if="failedFile" :disabled="uploading" @click="handleUpload(failedFile)">重试上传</Button><Button v-else-if="duplicate" @click="openDetail(duplicate.id)">查看已有文件</Button></template></Alert>
      <Alert v-if="loadError" type="error" title="媒体列表加载失败" :description="loadError"><template #action><Button @click="loadMedia">重试</Button></template></Alert>
      <ContextMenu>
        <div :inert="!!loadError" @contextmenu.capture="onFilesContextMenu">
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
        </div>
        <ContextMenuMenu>
          <ContextMenuItem :disabled="!contextFile" @click="previewContextFile">
            预览
          </ContextMenuItem>
          <ContextMenuSub title="打开">
            <ContextMenuItem :disabled="!contextFile" @click="openContextFile">
              在新窗口打开
            </ContextMenuItem>
            <ContextMenuItem :disabled="!contextFile" @click="copyContextFileUrl">
              复制 URL
            </ContextMenuItem>
          </ContextMenuSub>
          <ContextMenuItem
            v-if="canDelete"
            :disabled="!contextFile"
            divided
            @click="deleteContextFile"
          >
            删除
          </ContextMenuItem>
        </ContextMenuMenu>
      </ContextMenu>

      <Pagination :current="page" :page-size="20" :total="total" @change="changePage" />
      <div class="p2-text-secondary mt-3 text-sm">
        <Text size="sm" color="secondary">
          Logo、头像或文章附件引用会阻止普通删除；强制删除会清理这些已知引用。
        </Text>
      </div>
    </Card>

    <Modal :open="deleteOpen" title="确认删除文件" :show-default-footer="false" :mask-closable="!deleting" :closable="!deleting" @cancel="closeDelete">
      <div class="space-y-3">
        <Text>将删除 {{ deleteIds.length }} 个媒体资源。被引用的文件会被后端阻止删除。</Text>
        <Text v-if="deleteLoading">正在读取引用…</Text>
        <Alert v-if="deleteError" type="error" :title="deleteError"><template #action><Button @click="openDeleteModal(deleteIds)">重试</Button></template></Alert>
        <Alert v-if="deleteReferences.length > 0" type="warning" title="引用来源"><ul class="space-y-1"><li v-for="reference in deleteReferences" :key="reference.id">{{ referenceLabel(reference) }}</li></ul></Alert>
        <Checkbox v-if="deleteReferences.length > 0" :model-value="forceDelete" :disabled="deleting" @update:model-value="handleForceDeleteChange">强制删除并清理已知 Logo / 头像 / 文章附件引用</Checkbox>
      </div>
      <template #footer><div class="flex justify-end gap-2"><Button variant="outline" :disabled="deleting" @click="closeDelete">取消</Button><Button danger :disabled="deleting || deleteLoading || !!deleteError" @click="confirmDelete">{{ deleting ? '删除中…' : forceDelete ? '强制删除' : '确认删除' }}</Button></div></template>
    </Modal>
  </div>
</template>
