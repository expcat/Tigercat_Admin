<script setup lang="ts">
import { ref, computed, inject, onMounted, h } from 'vue'
import { Card, Table, Button, Input, Modal, Form, FormItem, Select, Tag, Message, Popover, Checkbox } from '@expcat/tigercat-vue'
import type { TableColumn, SortState } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { apiRequest, debounce, type Session } from '../utils'
import { exportData, type ExportFormat } from '../utils/export'
import type { RoleInfo, UserItem, PagedResult, MessageResult } from '../utils/types'
import { usePermission } from '../utils/permission'

// ---- Permission ----
const { has: hasPerm } = usePermission()
const canEdit = computed(() => hasPerm('user:edit'))
const canDelete = computed(() => hasPerm('user:delete'))

// ---- Session ----
const session = inject<import('vue').Ref<Session | null>>('session')!
const authHeaders = computed(() =>
  session.value?.token ? { Authorization: `Bearer ${session.value.token}` } : {}
)

// ---- State ----
const users = ref<UserItem[]>([])
const loading = ref(false)
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const selectedRowKeys = ref<number[]>([])

// Sort state (controlled)
const sortState = ref<SortState>({ key: null, direction: null })

// Status filter
const statusFilter = ref<number | null>(null)

// Column visibility
const hiddenColumns = ref<Set<string>>(new Set())

// Modal state
const modalVisible = ref(false)
const modalTitle = ref('新增用户')
const editingId = ref<number | null>(null)
const formData = ref({
  username: '',
  password: '',
  displayName: '',
  status: 0,
  roleIds: [] as number[],
})

// Delete state
const deleteConfirmVisible = ref(false)
const deletingUser = ref<UserItem | null>(null)
const batchDeleteConfirmVisible = ref(false)

// All roles for select
const allRoles = ref<RoleInfo[]>([])

// ---- Export state ----
const exportModalVisible = ref(false)
const exportFormat = ref<ExportFormat>('csv')
const exportFields = ref<string[]>(['id', 'username', 'displayName', 'status', 'createdAt', 'updatedAt', 'roles'])
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
  deletingUser.value = user
  deleteConfirmVisible.value = true
}

async function confirmDelete() {
  if (!deletingUser.value) return
  const userId = deletingUser.value.id

  try {
    await apiRequest(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: authHeaders.value,
    })
    Message.success({ content: '删除成功', duration: 3000 })
    deleteConfirmVisible.value = false
    deletingUser.value = null
    selectedRowKeys.value = selectedRowKeys.value.filter(k => k !== userId)
    await loadUsers()
  } catch (e: any) {
    Message.error({ content: e.message || '删除失败', duration: 3000 })
  }
}

async function handleBatchDelete() {
  if (selectedRowKeys.value.length === 0) {
    Message.error({ content: '请选择要删除的用户', duration: 3000 })
    return
  }
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
    await loadUsers()
  } catch (e: any) {
    Message.error({ content: e.message || '批量删除失败', duration: 3000 })
  }
}

function openCreateModal() {
  editingId.value = null
  modalTitle.value = '新增用户'
  formData.value = { username: '', password: '', displayName: '', status: 0, roleIds: [] }
  modalVisible.value = true
}

function openEditModal(user: UserItem) {
  editingId.value = user.id
  modalTitle.value = '编辑用户'
  formData.value = {
    username: user.username,
    password: '',
    displayName: user.displayName || '',
    status: user.status,
    roleIds: user.roles.map(r => r.id),
  }
  modalVisible.value = true
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
}

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'id', title: 'ID', width: 70, align: 'center', sortable: true },
    { key: 'username', title: '用户名', width: 150, sortable: true },
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
        if (!roles || roles.length === 0) return h('span', { class: 'text-slate-400 text-sm' }, '无角色')
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
        h('span', { class: 'text-sm text-slate-600' },
          new Date(record.createdAt).toLocaleString('zh-CN')),
    },
  ]

  // Action column (only if user has edit or delete permission)
  if (canEdit.value || canDelete.value) {
    cols.push({
      key: 'actions',
      title: '操作',
      width: 160,
      align: 'center',
      fixed: 'right',
      render: (record: any) => {
        const buttons: any[] = []
        if (canEdit.value) {
          buttons.push(
            h(Button, {
              size: 'sm',
              variant: 'ghost',
              onClick: () => openEditModal(record as UserItem),
            }, () => '编辑')
          )
        }
        if (canDelete.value) {
          buttons.push(
            h(Button, {
              size: 'sm',
              variant: 'ghost',
              color: 'danger',
              onClick: () => handleDelete(record as UserItem),
            }, () => '删除')
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

function handlePageChange(e: any) {
  if (e.current !== undefined) currentPage.value = e.current
  if (e.pageSize !== undefined) {
    pageSize.value = e.pageSize
    currentPage.value = 1
  }
  loadUsers()
}

function handleSelectionChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys as number[]
}

// ---- Sort ----
function handleSortChange(next: SortState) {
  sortState.value = next
  currentPage.value = 1
  loadUsers()
}

// ---- Status filter ----
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '正常', value: 0 },
  { label: '禁用', value: 1 },
]

function handleStatusFilter(val: number | string) {
  statusFilter.value = val === '' ? null : Number(val)
  currentPage.value = 1
  loadUsers()
}

// ---- Search ----
const debouncedLoad = debounce(() => {
  currentPage.value = 1
  loadUsers()
}, 300)

function handleSearch(val: string) {
  keyword.value = val
  debouncedLoad()
}

// Role select options
const roleOptions = computed(() =>
  allRoles.value.map(r => ({ label: r.name, value: r.id }))
)

// ---- Export ----
function openExportModal() {
  exportFormat.value = 'csv'
  exportFields.value = EXPORT_FIELD_OPTIONS.map(f => f.key)
  exportModalVisible.value = true
}

function toggleExportField(key: string) {
  const idx = exportFields.value.indexOf(key)
  if (idx >= 0) {
    exportFields.value = exportFields.value.filter(f => f !== key)
  } else {
    exportFields.value = [...exportFields.value, key]
  }
}

async function handleExport() {
  if (exportFields.value.length === 0) {
    Message.error({ content: '请至少选择一个导出字段', duration: 3000 })
    return
  }
  exporting.value = true
  try {
    await exportData({
      entity: 'users',
      format: exportFormat.value,
      fields: exportFields.value,
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

    <!-- Toolbar -->
    <Card>
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3 flex-wrap">
          <Input
            :model-value="keyword"
            placeholder="搜索用户名或显示名..."
            @update:model-value="handleSearch"
            class="w-64"
          />
          <Select
            :model-value="statusFilter ?? ''"
            :options="statusOptions"
            placeholder="筛选状态"
            @update:model-value="handleStatusFilter"
            class="w-32"
          />
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
                class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-800"
              >
                <Checkbox
                  :model-value="!hiddenColumns.has(key)"
                  @update:model-value="() => toggleColumn(key)"
                />
                <span>{{ columnLabels[key] || key }}</span>
              </label>
            </div>
          </Popover>
        </div>
        <div class="flex items-center gap-2">
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
            v-permission="'user:delete'"
            v-if="selectedRowKeys.length > 0"
            color="danger"
            variant="outline"
            size="sm"
            @click="handleBatchDelete"
          >
            批量删除 ({{ selectedRowKeys.length }})
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
      </div>
    </Card>

    <!-- Users Table -->
    <Card>
      <Table
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
        @page-change="handlePageChange"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
      />
    </Card>

    <!-- Create / Edit Modal -->
    <Modal
      :open="modalVisible"
      :title="modalTitle"
      ok-text="确定"
      cancel-text="取消"
      @ok="handleSubmit"
      @cancel="modalVisible = false"
      @update:open="modalVisible = $event"
    >
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
        <FormItem label="角色" name="roleIds">
          <Select
            v-model="formData.roleIds"
            :options="roleOptions"
            placeholder="请选择角色（可多选）"
            multiple
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- Single Delete Confirm -->
    <Modal
      :open="deleteConfirmVisible"
      title="确认删除"
      ok-text="确认删除"
      cancel-text="取消"
      @ok="confirmDelete"
      @cancel="deleteConfirmVisible = false"
      @update:open="deleteConfirmVisible = $event"
    >
      <p class="text-slate-600">
        确定要删除用户
        <span class="font-semibold text-slate-800">{{ deletingUser?.username }}</span>
        吗？此操作不可撤销。
      </p>
    </Modal>

    <!-- Batch Delete Confirm -->
    <Modal
      :open="batchDeleteConfirmVisible"
      title="确认批量删除"
      ok-text="确认删除"
      cancel-text="取消"
      @ok="confirmBatchDelete"
      @cancel="batchDeleteConfirmVisible = false"
      @update:open="batchDeleteConfirmVisible = $event"
    >
      <p class="text-slate-600">
        确定要删除选中的
        <span class="font-semibold text-slate-800">{{ selectedRowKeys.length }}</span>
        个用户吗？此操作不可撤销。
      </p>
    </Modal>

    <!-- Export Modal -->
    <Modal
      :open="exportModalVisible"
      title="导出用户数据"
      ok-text="导出"
      cancel-text="取消"
      @ok="handleExport"
      @cancel="exportModalVisible = false"
      @update:open="exportModalVisible = $event"
    >
      <Form :label-width="88">
        <FormItem label="导出格式">
          <Select
            v-model="exportFormat"
            :options="FORMAT_OPTIONS"
            placeholder="选择导出格式"
          />
        </FormItem>
        <FormItem label="导出字段">
          <div class="space-y-2">
            <label
              v-for="field in EXPORT_FIELD_OPTIONS"
              :key="field.key"
              class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-800"
            >
              <Checkbox
                :model-value="exportFields.includes(field.key)"
                @update:model-value="() => toggleExportField(field.key)"
              />
              <span>{{ field.label }}</span>
            </label>
          </div>
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>
