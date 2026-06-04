<script setup lang="ts">
import { ref, computed, inject, onMounted, h } from 'vue'
import { Avatar, DataTableWithToolbar, Button, Dropdown, DropdownMenu, DropdownItem, Input, Modal, Form, FormItem, Popconfirm, Select, Tag, Tooltip, Message, Popover, Checkbox } from '@expcat/tigercat-vue'
import { CropUpload } from '@expcat/tigercat-vue/CropUpload'
import type { TableColumn, SortState, TableToolbarFilterValue } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { apiRequest, debounce, loadWorkbenchState, saveWorkbenchState, clearWorkbenchSelection, type Session } from '../utils'
import { exportData, type ExportFormat } from '../utils/export'
import type { RoleInfo, UserItem, PagedResult, MessageResult } from '../utils/types'
import { usePermission } from '../utils/permission'
import { uploadMediaBlob } from '../utils/media'

// ---- Permission ----
const { has: hasPerm } = usePermission()
const canEdit = computed(() => hasPerm('user:edit'))
const canDelete = computed(() => hasPerm('user:delete'))

// ---- Session ----
const session = inject<import('vue').Ref<Session | null>>('session')!
const authHeaders = computed(() =>
  session.value?.token ? { Authorization: `Bearer ${session.value.token}` } : {}
)

const DEFAULT_EXPORT_FIELDS = ['id', 'username', 'displayName', 'status', 'createdAt', 'updatedAt', 'roles']
const savedWorkbench = loadWorkbenchState('users', {
  queryState: { page: 1, pageSize: 10, status: null },
  selectedRowKeys: [],
  hiddenColumnKeys: [],
  exportState: { format: 'csv', fields: DEFAULT_EXPORT_FIELDS },
})
const savedQuery = savedWorkbench.queryState

// ---- State ----
const users = ref<UserItem[]>([])
const loading = ref(false)
const keyword = ref(savedQuery.keyword ?? '')
const currentPage = ref(savedQuery.page ?? 1)
const pageSize = ref(savedQuery.pageSize ?? 10)
const total = ref(0)
const selectedRowKeys = ref<number[]>(savedWorkbench.selectedRowKeys.map(Number).filter(id => Number.isFinite(id)))

// Sort state (controlled)
const sortState = ref<SortState>({
  key: savedQuery.sortBy ?? null,
  direction: savedQuery.sortOrder ?? null,
})

// Status filter
const statusFilter = ref<number | null>(savedQuery.status === 0 || savedQuery.status === 1 ? savedQuery.status : null)

// Column visibility
const hiddenColumns = ref<Set<string>>(new Set(savedWorkbench.hiddenColumnKeys))

// Modal state
const modalVisible = ref(false)
const modalTitle = ref('新增用户')
const editingId = ref<number | null>(null)
const editingAvatarId = ref<number | null>(null)
const avatarUploading = ref(false)
const formData = ref({
  username: '',
  password: '',
  displayName: '',
  status: 0,
  avatarMediaId: null as number | null,
  avatarUrl: null as string | null,
  roleIds: [] as number[],
})

const batchDeleteConfirmVisible = ref(false)
const batchStatusConfirmVisible = ref(false)
const batchStatusValue = ref<0 | 1>(1)

// All roles for select
const allRoles = ref<RoleInfo[]>([])

// ---- Export state ----
const exportModalVisible = ref(false)
const exportFormat = ref<ExportFormat>(savedWorkbench.exportState?.format ?? 'csv')
const exportFields = ref<string[]>(savedWorkbench.exportState?.fields?.length ? savedWorkbench.exportState.fields : DEFAULT_EXPORT_FIELDS)
const exporting = ref(false)

const EXPORT_FIELD_OPTIONS = [
  { key: 'id', label: 'ID' },
  { key: 'username', label: '用户名' },
  { key: 'displayName', label: '显示名' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '更新时间' },
  { key: 'roles', label: '角色' },
] as const

const FORMAT_OPTIONS = [
  { label: 'CSV', value: 'csv' },
  { label: 'JSON', value: 'json' },
  { label: 'XLSX', value: 'xlsx' },
]

function persistQuery() {
  saveWorkbenchState('users', {
    queryState: {
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
      sortBy: sortState.value.key ?? null,
      sortOrder: sortState.value.direction ?? null,
      status: statusFilter.value,
    },
  })
}

// ---- API calls ----
async function loadUsers() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(currentPage.value),
      pageSize: String(pageSize.value),
    })
    if (keyword.value.trim()) {
      params.set('keyword', keyword.value.trim())
    }
    if (sortState.value.key && sortState.value.direction) {
      params.set('sortBy', sortState.value.key)
      params.set('sortOrder', sortState.value.direction)
    }
    if (statusFilter.value !== null) {
      params.set('status', String(statusFilter.value))
    }
    const res = await apiRequest<PagedResult<UserItem>>(`/api/users?${params}`, {
      headers: authHeaders.value,
    })
    users.value = res.data.items
    total.value = res.data.total
  } catch (e: any) {
    Message.error({ content: e.message || '加载用户列表失败', duration: 3000 })
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  try {
    const res = await apiRequest<{ items: RoleInfo[] }>('/api/roles?pageSize=100', {
      headers: authHeaders.value,
    })
    allRoles.value = res.data.items.map((r: any) => ({ id: r.id, name: r.name }))
  } catch {
    // Roles may not be accessible if user lacks permission
    allRoles.value = []
  }
}

async function handleSubmit() {
  if (modalVisible.value === false) {
    return
  }

  // Validation
  if (!editingId.value) {
    if (!formData.value.username.trim()) {
      Message.error({ content: '请输入用户名', duration: 3000 })
      return
    }
    if (!formData.value.password) {
      Message.error({ content: '请输入密码', duration: 3000 })
      return
    }
    if (formData.value.password.length < 6) {
      Message.error({ content: '密码长度不能少于 6 位', duration: 3000 })
      return
    }
  }

  try {
    if (editingId.value) {
      // Update
      const body: Record<string, any> = {
        displayName: formData.value.displayName || null,
        status: formData.value.status,
        roleIds: formData.value.roleIds,
      }
      if (formData.value.avatarMediaId !== editingAvatarId.value) {
        body.avatarMediaId = formData.value.avatarMediaId ?? 0
      }
      if (formData.value.password) {
        body.password = formData.value.password
      }
      await apiRequest(`/api/users/${editingId.value}`, {
        method: 'PUT',
        headers: authHeaders.value,
        body: JSON.stringify(body),
      })
      Message.success({ content: '用户更新成功', duration: 3000 })
    } else {
      // Create
      await apiRequest('/api/users', {
        method: 'POST',
        headers: authHeaders.value,
        body: JSON.stringify({
          username: formData.value.username.trim(),
          password: formData.value.password,
          displayName: formData.value.displayName || null,
          roleIds: formData.value.roleIds,
        }),
      })
      Message.success({ content: '用户创建成功', duration: 3000 })
    }
    modalVisible.value = false
    await loadUsers()
  } catch (e: any) {
    Message.error({ content: e.message || '操作失败', duration: 3000 })
  }
}

async function handleDelete(user: UserItem) {
  const userId = user.id

  try {
    await apiRequest(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: authHeaders.value,
    })
    Message.success({ content: '删除成功', duration: 3000 })
    selectedRowKeys.value = selectedRowKeys.value.filter(k => k !== userId)
    saveWorkbenchState('users', { selectedRowKeys: selectedRowKeys.value })
    await loadUsers()
  } catch (e: any) {
    Message.error({ content: e.message || '删除失败', duration: 3000 })
  }
}

async function handleBatchDelete(keys = selectedRowKeys.value) {
  if (keys.length === 0) {
    Message.error({ content: '请选择要删除的用户', duration: 3000 })
    return
  }
  selectedRowKeys.value = keys.map(Number).filter(id => Number.isFinite(id))
  saveWorkbenchState('users', { selectedRowKeys: selectedRowKeys.value })
  batchDeleteConfirmVisible.value = true
}

async function confirmBatchDelete() {
  try {
    const res = await apiRequest<MessageResult>('/api/users/batch-delete', {
      method: 'POST',
      headers: authHeaders.value,
      body: JSON.stringify({ ids: selectedRowKeys.value }),
    })
    Message.success({ content: res.data.message || '批量删除成功', duration: 3000 })
    batchDeleteConfirmVisible.value = false
    selectedRowKeys.value = []
    clearWorkbenchSelection('users')
    await loadUsers()
  } catch (e: any) {
    Message.error({ content: e.message || '批量删除失败', duration: 3000 })
  }
}

async function handleBatchStatus(status: 0 | 1, keys = selectedRowKeys.value) {
  if (keys.length === 0) {
    Message.error({ content: '请选择要更新状态的用户', duration: 3000 })
    return
  }
  selectedRowKeys.value = keys.map(Number).filter(id => Number.isFinite(id))
  saveWorkbenchState('users', { selectedRowKeys: selectedRowKeys.value })
  batchStatusValue.value = status
  batchStatusConfirmVisible.value = true
}

async function confirmBatchStatus() {
  try {
    const res = await apiRequest<MessageResult>('/api/users/batch-status', {
      method: 'POST',
      headers: authHeaders.value,
      body: JSON.stringify({ ids: selectedRowKeys.value, status: batchStatusValue.value }),
    })
    Message.success({ content: res.data.message || '批量状态更新成功', duration: 3000 })
    batchStatusConfirmVisible.value = false
    selectedRowKeys.value = []
    clearWorkbenchSelection('users')
    await loadUsers()
  } catch (e: any) {
    Message.error({ content: e.message || '批量状态更新失败', duration: 3000 })
  }
}

function openCreateModal() {
  editingId.value = null
  editingAvatarId.value = null
  modalTitle.value = '新增用户'
  formData.value = { username: '', password: '', displayName: '', status: 0, avatarMediaId: null, avatarUrl: null, roleIds: [] }
  modalVisible.value = true
}

function openEditModal(user: UserItem) {
  editingId.value = user.id
  editingAvatarId.value = user.avatarMediaId
  modalTitle.value = '编辑用户'
  formData.value = {
    username: user.username,
    password: '',
    displayName: user.displayName || '',
    status: user.status,
    avatarMediaId: user.avatarMediaId,
    avatarUrl: user.avatarUrl,
    roleIds: user.roles.map(r => r.id),
  }
  modalVisible.value = true
}

async function handleAvatarCropComplete(result: { blob: Blob }) {
  if (!editingId.value) return
  try {
    avatarUploading.value = true
    const media = await uploadMediaBlob(result.blob, `avatar-${editingId.value}.png`, 'avatar')
    formData.value = {
      ...formData.value,
      avatarMediaId: media.id,
      avatarUrl: media.url,
    }
    Message.success({ content: '头像已上传，请保存用户资料', duration: 3000 })
  } catch (e: any) {
    Message.error({ content: e.message || '头像上传失败', duration: 3000 })
  } finally {
    avatarUploading.value = false
  }
}

// ---- Table columns ----
const ALL_COLUMN_KEYS = ['id', 'username', 'displayName', 'status', 'roles', 'createdAt', 'actions'] as const

const columnLabels: Record<string, string> = {
  id: 'ID',
  username: '用户名',
  displayName: '显示名',
  status: '状态',
  roles: '角色',
  createdAt: '创建时间',
  actions: '操作',
}

function toggleColumn(key: string) {
  const next = new Set(hiddenColumns.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  hiddenColumns.value = next
  saveWorkbenchState('users', { hiddenColumnKeys: Array.from(next) })
}

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'id', title: 'ID', width: 70, align: 'center', sortable: true },
    {
      key: 'username',
      title: '用户名',
      width: 190,
      sortable: true,
      render: (record: any) =>
        h('div', { class: 'flex items-center gap-2' }, [
          h(Avatar, {
            src: record.avatarUrl || undefined,
            class: 'h-8 w-8',
          }, () => String(record.username).charAt(0).toUpperCase()),
          h('span', String(record.username)),
        ]),
    },
    { key: 'displayName', title: '显示名', width: 150, sortable: true },
    {
      key: 'status',
      title: '状态',
      width: 100,
      align: 'center',
      render: (record: any) =>
        h(Tag, {
          color: record.status === 0 ? 'green' : 'red',
          size: 'sm',
        }, () => record.status === 0 ? '正常' : '禁用'),
    },
    {
      key: 'roles',
      title: '角色',
      width: 200,
      render: (record: any) => {
        const roles = record.roles as RoleInfo[]
        if (!roles || roles.length === 0) return h('span', { class: 'p2-text-secondary text-sm' }, '无角色')
        return h('div', { class: 'flex flex-wrap gap-1' },
          roles.map(r => h(Tag, { color: 'blue', size: 'sm', key: r.id }, () => r.name))
        )
      },
    },
    {
      key: 'createdAt',
      title: '创建时间',
      width: 180,
      sortable: true,
      render: (record: any) =>
        h('span', { class: 'p2-text-secondary text-sm' },
          new Date(record.createdAt).toLocaleString('zh-CN')),
    },
  ]

  // Action column (only if user has edit or delete permission)
  if (canEdit.value || canDelete.value) {
    cols.push({
      key: 'actions',
      title: '操作',
      width: 180,
      align: 'center',
      fixed: 'right',
      render: (record: any) => {
        const user = record as UserItem
        const buttons: any[] = []
        if (canEdit.value) {
          buttons.push(
            h(Tooltip, { content: '更多操作' }, {
              default: () =>
                h(Dropdown, { trigger: 'click', placement: 'bottom-end' }, {
                  default: () => [
                    h(Button, {
                      size: 'sm',
                      variant: 'ghost',
                    }, () => '操作'),
                    h(DropdownMenu, null, {
                      default: () => [
                        h(DropdownItem, {
                          onClick: () => openEditModal(user),
                        }, () => '编辑用户')
                      ],
                    }),
                  ],
                }),
            })
          )
        }
        if (canDelete.value) {
          buttons.push(
            h(Popconfirm, {
              title: '确认删除用户',
              description: `将删除用户 ${user.username}，此操作不可撤销。`,
              okText: '删除',
              cancelText: '取消',
              okType: 'danger',
              placement: 'left',
              onConfirm: () => handleDelete(user),
            }, {
              default: () =>
                h(Button, {
                  size: 'sm',
                  variant: 'ghost',
                  color: 'danger',
                }, () => '删除'),
            })
          )
        }
        return h('div', { class: 'flex items-center justify-center gap-1' }, buttons)
      },
    })
  }

  // Filter out hidden columns
  return cols.filter(c => !hiddenColumns.value.has(c.key))
})

// ---- Pagination ----
const paginationConfig = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: true,
  pageSizeOptions: [10, 20, 50],
}))

function handlePageChange(current: number, nextPageSize: number) {
  if (nextPageSize !== pageSize.value) {
    return
  }

  currentPage.value = current
  persistQuery()
  loadUsers()
}

function handlePageSizeChange(_current: number, nextPageSize: number) {
  pageSize.value = nextPageSize
  currentPage.value = 1
  persistQuery()
  loadUsers()
}

function handleSelectionChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys.map(Number).filter(id => Number.isFinite(id))
  saveWorkbenchState('users', { selectedRowKeys: selectedRowKeys.value })
}

// ---- Sort ----
function handleSortChange(next: SortState) {
  sortState.value = next
  currentPage.value = 1
  persistQuery()
  loadUsers()
}

// ---- Status filter ----
const statusFilterOptions = [
  { label: '正常', value: 0 },
  { label: '禁用', value: 1 },
]

function handleStatusFilter(value: TableToolbarFilterValue) {
  statusFilter.value = value === null || value === '' ? null : Number(value)
  currentPage.value = 1
  persistQuery()
  loadUsers()
}

function handleToolbarFiltersChange(filters: Record<string, TableToolbarFilterValue>) {
  handleStatusFilter(filters.status ?? null)
}

// ---- Search ----
const debouncedLoad = debounce(() => {
  currentPage.value = 1
  persistQuery()
  loadUsers()
}, 300)

function handleSearch(val: string) {
  keyword.value = val
  persistQuery()
  debouncedLoad()
}

// Role select options
const roleOptions = computed(() =>
  allRoles.value.map(r => ({ label: r.name, value: r.id }))
)

const tableToolbar = computed(() => ({
  searchValue: keyword.value,
  searchPlaceholder: '搜索用户名或显示名...',
  filters: [
    {
      key: 'status',
      label: '状态',
      placeholder: '筛选状态',
      options: statusFilterOptions,
      value: statusFilter.value,
    },
  ],
  bulkActions: canEdit.value || canDelete.value
    ? [
        ...(canEdit.value
          ? [
              {
                key: 'batch-enable',
                label: '批量启用',
                variant: 'outline',
                onClick: (keys: (string | number)[]) => handleBatchStatus(0, keys as number[]),
              },
              {
                key: 'batch-disable',
                label: '批量禁用',
                variant: 'outline',
                onClick: (keys: (string | number)[]) => handleBatchStatus(1, keys as number[]),
              },
            ]
          : []),
        ...(canDelete.value
          ? [
              {
                key: 'batch-delete',
                label: '批量删除',
                variant: 'outline',
                onClick: (keys: (string | number)[]) => handleBatchDelete(keys as number[]),
              },
            ]
          : []),
      ]
    : undefined,
  selectedKeys: selectedRowKeys.value,
  selectedCount: selectedRowKeys.value.length,
}))

const serverPaginationHint = computed(() => {
  if (total.value > pageSize.value) {
    return `列表采用服务端分页，当前页仅加载 ${pageSize.value} / ${total.value} 条结果。后端每页最多返回 100 条记录，请通过翻页或缩小筛选范围查看更多数据。`
  }

  return '列表采用服务端分页，当前仅加载本页数据。后端每页最多返回 100 条记录。'
})

// ---- Export ----
function openExportModal() {
  exportModalVisible.value = true
}

function toggleExportField(key: string) {
  const idx = exportFields.value.indexOf(key)
  if (idx >= 0) {
    exportFields.value = exportFields.value.filter(f => f !== key)
  } else {
    exportFields.value = [...exportFields.value, key]
  }
  saveWorkbenchState('users', {
    exportState: { format: exportFormat.value, fields: exportFields.value },
  })
}

function handleExportFormatChange(value: unknown) {
  const format = value as ExportFormat
  exportFormat.value = format
  saveWorkbenchState('users', {
    exportState: { format, fields: exportFields.value },
  })
}

async function handleExport() {
  if (exportFields.value.length === 0) {
    Message.error({ content: '请至少选择一个导出字段', duration: 3000 })
    return
  }
  if (total.value === 0) {
    Message.error({ content: '当前筛选没有可导出的结果', duration: 3000 })
    return
  }
  exporting.value = true
  try {
    await exportData({
      entity: 'users',
      format: exportFormat.value,
      fields: exportFields.value,
      query: {
        keyword: keyword.value,
        sortBy: sortState.value.key ?? undefined,
        sortOrder: sortState.value.direction ?? undefined,
        status: statusFilter.value,
      },
      headers: authHeaders.value,
    })
    Message.success({ content: '导出成功', duration: 3000 })
    exportModalVisible.value = false
  } catch (e: any) {
    Message.error({ content: e.message || '导出失败', duration: 3000 })
  } finally {
    exporting.value = false
  }
}

// ---- Lifecycle ----
onMounted(() => {
  loadUsers()
  loadRoles()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="用户管理"
      subtitle="管理平台用户账号、角色与权限"
      icon="users"
      :tags="[
        { label: '核心模块', color: 'blue' },
        { label: '运行中', color: 'green' }
      ]"
    />

    <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <Popover trigger="click" placement="bottom-end" :width="180">
        <template #reference>
          <Button variant="outline" size="sm">
            <span class="flex items-center gap-1">
              <Icon name="settings" :size="14" />
              列显隐
            </span>
          </Button>
        </template>
        <div class="space-y-2">
          <label
            v-for="key in ALL_COLUMN_KEYS.filter(k => k !== 'actions' || canEdit || canDelete)"
            :key="key"
            class="p2-checkbox-row text-sm"
          >
            <Checkbox
              :model-value="!hiddenColumns.has(key)"
              @update:model-value="() => toggleColumn(key)"
            />
            <span class="p2-checkbox-label">{{ columnLabels[key] || key }}</span>
          </label>
        </div>
      </Popover>
      <Button
        v-permission="'user:view'"
        variant="outline"
        @click="openExportModal"
      >
        <span class="flex items-center gap-1">
          <Icon name="download" :size="16" />
          导出
        </span>
      </Button>
      <Button
        v-permission="'user:create'"
        color="primary"
        @click="openCreateModal"
      >
        <span class="flex items-center gap-1">
          <Icon name="userPlus" :size="16" />
          新增用户
        </span>
      </Button>
    </div>

    <div class="p2-muted-panel px-4 py-3 text-sm">
      {{ serverPaginationHint }}
    </div>

    <DataTableWithToolbar
      :columns="columns"
      :data-source="users as any"
      :loading="loading"
      :pagination="paginationConfig"
      :row-selection="{
        selectedRowKeys: selectedRowKeys,
        type: 'checkbox',
      }"
      :sort="sortState"
      column-lockable
      row-key="id"
      :hoverable="true"
      :striped="true"
      empty-text="暂无用户数据"
      :toolbar="tableToolbar"
      @search-change="handleSearch"
      @search="handleSearch"
      @filters-change="handleToolbarFiltersChange"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
    />

    <!-- Create / Edit Modal -->
    <Modal
      v-model:open="modalVisible"
      :title="modalTitle"
      show-default-footer
      ok-text="确定"
      cancel-text="取消"
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <div class="p2-modal-scroll">
      <Form :model="formData" :label-width="88">
        <FormItem label="用户名" name="username">
          <Input
            v-model="formData.username"
            placeholder="请输入用户名"
            :disabled="!!editingId"
          />
        </FormItem>
        <FormItem label="密码" name="password">
          <Input
            v-model="formData.password"
            type="password"
            :placeholder="editingId ? '留空则不修改密码' : '请输入密码'"
          />
        </FormItem>
        <FormItem label="显示名称" name="displayName">
          <Input
            v-model="formData.displayName"
            placeholder="请输入显示名称（选填）"
          />
        </FormItem>
        <FormItem v-if="editingId" label="状态" name="status">
          <Select
            v-model="formData.status"
            :options="[
              { label: '正常', value: 0 },
              { label: '禁用', value: 1 },
            ]"
            placeholder="请选择状态"
          />
        </FormItem>
        <FormItem v-if="editingId" label="头像" name="avatarMediaId">
          <div class="flex flex-wrap items-center gap-3">
            <Avatar :src="formData.avatarUrl || undefined" class="h-14 w-14">
              {{ formData.username.charAt(0).toUpperCase() }}
            </Avatar>
            <CropUpload
              accept="image/*"
              :max-size="2 * 1024 * 1024"
              modal-title="裁剪头像"
              @crop-complete="handleAvatarCropComplete"
            >
              <Button variant="outline" :disabled="avatarUploading">
                {{ avatarUploading ? '上传中…' : '选择头像并裁剪' }}
              </Button>
            </CropUpload>
            <Button
              v-if="formData.avatarMediaId"
              variant="ghost"
              color="danger"
              :disabled="avatarUploading"
              @click="formData.avatarMediaId = null; formData.avatarUrl = null"
            >
              移除头像
            </Button>
          </div>
        </FormItem>
        <FormItem label="角色" name="roleIds">
          <Select
            v-model="formData.roleIds"
            :options="roleOptions"
            placeholder="请选择角色（可多选）"
            multiple
          />
        </FormItem>
      </Form>
      </div>
    </Modal>

    <!-- Batch Delete Confirm -->
    <Modal
      v-model:open="batchDeleteConfirmVisible"
      title="确认批量删除"
      show-default-footer
      ok-text="确认删除"
      cancel-text="取消"
      @ok="confirmBatchDelete"
      @cancel="batchDeleteConfirmVisible = false"
    >
      <p class="p2-text-secondary">
        确定要删除选中的
        <span class="p2-text-primary font-semibold">{{ selectedRowKeys.length }}</span>
        个用户吗？此操作不可撤销。
      </p>
    </Modal>

    <Modal
      v-model:open="batchStatusConfirmVisible"
      :title="batchStatusValue === 0 ? '确认批量启用' : '确认批量禁用'"
      show-default-footer
      :ok-text="batchStatusValue === 0 ? '确认启用' : '确认禁用'"
      cancel-text="取消"
      @ok="confirmBatchStatus"
      @cancel="batchStatusConfirmVisible = false"
    >
      <p class="p2-text-secondary">
        将选中的
        <span class="p2-text-primary font-semibold">{{ selectedRowKeys.length }}</span>
        个用户设为{{ batchStatusValue === 0 ? '正常' : '禁用' }}状态。
      </p>
    </Modal>

    <!-- Export Modal -->
    <Modal
      v-model:open="exportModalVisible"
      title="导出用户数据"
      show-default-footer
      ok-text="导出"
      cancel-text="取消"
      @ok="handleExport"
      @cancel="exportModalVisible = false"
    >
      <div class="p2-modal-scroll">
      <Form :label-width="88">
        <FormItem label="导出格式">
          <Select
            :model-value="exportFormat"
            :options="FORMAT_OPTIONS"
            placeholder="选择导出格式"
            @update:model-value="handleExportFormatChange"
          />
        </FormItem>
        <FormItem label="导出字段">
          <div class="space-y-2">
            <label
              v-for="field in EXPORT_FIELD_OPTIONS"
              :key="field.key"
              class="p2-checkbox-row text-sm"
            >
              <Checkbox
                :model-value="exportFields.includes(field.key)"
                @update:model-value="() => toggleExportField(field.key)"
              />
              <span class="p2-checkbox-label">{{ field.label }}</span>
            </label>
          </div>
        </FormItem>
      </Form>
      </div>
    </Modal>
  </div>
</template>
