<script setup lang="ts">
import { ref, computed, inject, onMounted, h } from 'vue'
import { Card, Table, Button, Input, Modal, Form, FormItem, Select, Tag, Message, Checkbox, Popover } from '@expcat/tigercat-vue'
import type { TableColumn, SortState } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { apiRequest, debounce, type Session } from '../utils'
import { exportData, type ExportFormat } from '../utils/export'
import type { PermissionInfo, RoleUserInfo, RoleItem, PagedResult } from '../utils/types'
import { usePermission } from '../utils/permission'
import {
  GROUP_LABELS,
  buildPermissionGroups,
  toggleGroupPerms,
  isGroupAllChecked,
  isGroupPartialChecked,
} from '../utils/permission-helpers'

// ---- Permission ----
const { has: hasPerm } = usePermission()
const canEdit = computed(() => hasPerm('role:edit'))
const canDelete = computed(() => hasPerm('role:delete'))

// ---- Session ----
const session = inject<import('vue').Ref<Session | null>>('session')!
const authHeaders = computed(() =>
  session.value?.token ? { Authorization: `Bearer ${session.value.token}` } : {}
)

// ---- State ----
const roles = ref<RoleItem[]>([])
const loading = ref(false)
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// Sort state (controlled)
const sortState = ref<SortState>({ key: null, direction: null })

// Column visibility
const hiddenColumns = ref<Set<string>>(new Set())

// Modal state
const modalVisible = ref(false)
const modalTitle = ref('新增角色')
const editingId = ref<number | null>(null)
const formData = ref({
  name: '',
  description: '',
  permissionIds: [] as number[],
})

// Delete state
const deleteConfirmVisible = ref(false)
const deletingRole = ref<RoleItem | null>(null)

// Permission config modal
const permModalVisible = ref(false)
const permConfigRole = ref<RoleItem | null>(null)
const permConfigIds = ref<number[]>([])

// All permissions for selection
const allPermissions = ref<PermissionInfo[]>([])

// ---- Export state ----
const exportModalVisible = ref(false)
const exportFormat = ref<ExportFormat>('csv')
const exportFields = ref<string[]>(['id', 'name', 'description', 'createdAt', 'permissions', 'userCount'])
const exporting = ref(false)

const EXPORT_FIELD_OPTIONS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '角色名称' },
  { key: 'description', label: '描述' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'permissions', label: '权限' },
  { key: 'userCount', label: '用户数' },
] as const

const FORMAT_OPTIONS = [
  { label: 'CSV', value: 'csv' },
  { label: 'JSON', value: 'json' },
  { label: 'XLSX', value: 'xlsx' },
]

// ---- API calls ----
async function loadRoles() {
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
    const res = await apiRequest<PagedResult<RoleItem>>(`/api/roles?${params}`, {
      headers: authHeaders.value,
    })
    roles.value = res.data.items
    total.value = res.data.total
  } catch (e: any) {
    Message.error({ content: e.message || '加载角色列表失败', duration: 3000 })
  } finally {
    loading.value = false
  }
}

async function loadAllPermissions() {
  try {
    const res = await apiRequest<PermissionInfo[]>('/api/roles/permissions', {
      headers: authHeaders.value,
    })
    allPermissions.value = res.data
  } catch {
    allPermissions.value = []
  }
}

async function handleSubmit() {
  if (!modalVisible.value) return

  // Validation
  if (!formData.value.name.trim()) {
    Message.error({ content: '请输入角色名称', duration: 3000 })
    return
  }
  if (formData.value.name.trim().length < 2 || formData.value.name.trim().length > 50) {
    Message.error({ content: '角色名称长度需在 2-50 之间', duration: 3000 })
    return
  }
  if (formData.value.description && formData.value.description.length > 200) {
    Message.error({ content: '描述长度不能超过 200', duration: 3000 })
    return
  }

  try {
    if (editingId.value) {
      // Update
      await apiRequest(`/api/roles/${editingId.value}`, {
        method: 'PUT',
        headers: authHeaders.value,
        body: JSON.stringify({
          name: formData.value.name.trim(),
          description: formData.value.description || null,
          permissionIds: formData.value.permissionIds,
        }),
      })
      Message.success({ content: '角色更新成功', duration: 3000 })
    } else {
      // Create
      await apiRequest('/api/roles', {
        method: 'POST',
        headers: authHeaders.value,
        body: JSON.stringify({
          name: formData.value.name.trim(),
          description: formData.value.description || null,
          permissionIds: formData.value.permissionIds,
        }),
      })
      Message.success({ content: '角色创建成功', duration: 3000 })
    }
    modalVisible.value = false
    await loadRoles()
  } catch (e: any) {
    Message.error({ content: e.message || '操作失败', duration: 3000 })
  }
}

async function handleDelete(role: RoleItem) {
  deletingRole.value = role
  deleteConfirmVisible.value = true
}

async function confirmDelete() {
  if (!deletingRole.value) return

  try {
    await apiRequest(`/api/roles/${deletingRole.value.id}`, {
      method: 'DELETE',
      headers: authHeaders.value,
    })
    Message.success({ content: '删除成功', duration: 3000 })
    deleteConfirmVisible.value = false
    deletingRole.value = null
    await loadRoles()
  } catch (e: any) {
    Message.error({ content: e.message || '删除失败', duration: 3000 })
  }
}

function openCreateModal() {
  editingId.value = null
  modalTitle.value = '新增角色'
  formData.value = { name: '', description: '', permissionIds: [] }
  modalVisible.value = true
}

function openEditModal(role: RoleItem) {
  editingId.value = role.id
  modalTitle.value = '编辑角色'
  formData.value = {
    name: role.name,
    description: role.description || '',
    permissionIds: role.permissions.map(p => p.id),
  }
  modalVisible.value = true
}

function openPermModal(role: RoleItem) {
  permConfigRole.value = role
  permConfigIds.value = role.permissions.map(p => p.id)
  permModalVisible.value = true
}

async function handlePermSubmit() {
  if (!permConfigRole.value) return

  try {
    await apiRequest(`/api/roles/${permConfigRole.value.id}/permissions`, {
      method: 'PUT',
      headers: authHeaders.value,
      body: JSON.stringify({ permissionIds: permConfigIds.value }),
    })
    Message.success({ content: '权限配置已保存', duration: 3000 })
    permModalVisible.value = false
    permConfigRole.value = null
    await loadRoles()
  } catch (e: any) {
    Message.error({ content: e.message || '权限配置失败', duration: 3000 })
  }
}

// Permission select options (for create/edit form)
const permissionOptions = computed(() =>
  allPermissions.value.map(p => ({
    label: p.description ? `${p.code} (${p.description})` : p.code,
    value: p.id,
  }))
)

// ---- Table columns ----
const ALL_COLUMN_KEYS = ['id', 'name', 'description', 'permissions', 'users', 'createdAt', 'actions'] as const

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '角色名称',
  description: '描述',
  permissions: '权限数',
  users: '关联用户',
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
    { key: 'name', title: '角色名称', width: 150, sortable: true },
    {
      key: 'description',
      title: '描述',
      width: 200,
      render: (record: any) =>
        h('span', { class: 'text-sm text-slate-600' },
          record.description || '-'),
    },
    {
      key: 'permissions',
      title: '权限数',
      width: 100,
      align: 'center',
      render: (record: any) => {
        const perms = record.permissions as PermissionInfo[]
        return h(Tag, { color: 'blue', size: 'sm' }, () => `${perms?.length ?? 0} 项`)
      },
    },
    {
      key: 'users',
      title: '关联用户',
      width: 120,
      align: 'center',
      render: (record: any) => {
        const users = record.users as RoleUserInfo[]
        return h(Tag, { color: 'purple', size: 'sm' }, () => `${users?.length ?? 0} 人`)
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
      width: 220,
      align: 'center',
      fixed: 'right',
      render: (record: any) => {
        const role = record as RoleItem
        const buttons: any[] = []
        if (canEdit.value) {
          buttons.push(
            h(Button, {
              size: 'sm',
              variant: 'ghost',
              onClick: () => openEditModal(role),
            }, () => '编辑')
          )
          buttons.push(
            h(Button, {
              size: 'sm',
              variant: 'ghost',
              color: 'primary',
              onClick: () => openPermModal(role),
            }, () => '权限')
          )
        }
        if (canDelete.value) {
          buttons.push(
            h(Button, {
              size: 'sm',
              variant: 'ghost',
              color: 'danger',
              onClick: () => handleDelete(role),
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
  loadRoles()
}

// ---- Sort ----
function handleSortChange(next: SortState) {
  sortState.value = next
  currentPage.value = 1
  loadRoles()
}

// ---- Search ----
const debouncedLoad = debounce(() => {
  currentPage.value = 1
  loadRoles()
}, 300)

function handleSearch(val: string) {
  keyword.value = val
  debouncedLoad()
}

// Permission group helpers
const permissionGroups = computed(() => buildPermissionGroups(allPermissions.value))

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
      entity: 'roles',
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
  loadRoles()
  loadAllPermissions()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="角色管理"
      subtitle="维护平台角色与权限配置"
      icon="shield"
      :tags="[
        { label: '权限中心', color: 'blue' },
        { label: '已启用', color: 'green' }
      ]"
    />

    <!-- Toolbar -->
    <Card>
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3 flex-wrap">
          <Input
            :model-value="keyword"
            placeholder="搜索角色名称或描述..."
            @update:model-value="handleSearch"
            class="w-64"
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
            v-permission="'role:view'"
            variant="outline"
            @click="openExportModal"
          >
            <span class="flex items-center gap-1">
              <Icon name="download" :size="16" />
              导出
            </span>
          </Button>
          <Button
            v-permission="'role:create'"
            color="primary"
            @click="openCreateModal"
          >
            <span class="flex items-center gap-1">
              <Icon name="shield" :size="16" />
              新增角色
            </span>
          </Button>
        </div>
      </div>
    </Card>

    <!-- Roles Table -->
    <Card>
      <Table
        :columns="columns"
        :data-source="roles as any"
        :loading="loading"
        :pagination="paginationConfig"
        :sort="sortState"
        column-lockable
        row-key="id"
        :hoverable="true"
        :striped="true"
        empty-text="暂无角色数据"
        @page-change="handlePageChange"
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
        <FormItem label="角色名称" name="name">
          <Input
            v-model="formData.name"
            placeholder="请输入角色名称（2-50 个字符）"
          />
        </FormItem>
        <FormItem label="描述" name="description">
          <Input
            v-model="formData.description"
            placeholder="请输入角色描述（选填，最多 200 字符）"
          />
        </FormItem>
        <FormItem label="权限" name="permissionIds">
          <Select
            v-model="formData.permissionIds"
            :options="permissionOptions"
            placeholder="请选择权限（可多选）"
            multiple
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- Permission Config Modal -->
    <Modal
      :open="permModalVisible"
      :title="`权限配置 - ${permConfigRole?.name || ''}`"
      ok-text="保存"
      cancel-text="取消"
      @ok="handlePermSubmit"
      @cancel="permModalVisible = false"
      @update:open="permModalVisible = $event"
    >
      <div class="space-y-4 max-h-96 overflow-y-auto">
        <div v-for="(perms, group) in permissionGroups" :key="group" class="border border-slate-200 rounded-lg p-3">
          <div class="flex items-center gap-2 mb-2">
            <Checkbox
              :model-value="isGroupAllChecked(perms, permConfigIds)"
              :indeterminate="isGroupPartialChecked(perms, permConfigIds)"
              @update:model-value="permConfigIds = toggleGroupPerms(perms, permConfigIds)"
            />
            <span class="font-medium text-slate-700 text-sm">
              {{ GROUP_LABELS[group as string] || group }}
            </span>
            <Tag color="blue" size="sm">
              {{ perms.filter(p => permConfigIds.includes(p.id)).length }} / {{ perms.length }}
            </Tag>
          </div>
          <div class="grid grid-cols-2 gap-2 ml-6">
            <label
              v-for="perm in perms"
              :key="perm.id"
              class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-800"
            >
              <Checkbox
                :model-value="permConfigIds.includes(perm.id)"
                @update:model-value="(checked: boolean) => {
                  if (checked) {
                    permConfigIds = [...permConfigIds, perm.id]
                  } else {
                    permConfigIds = permConfigIds.filter(id => id !== perm.id)
                  }
                }"
              />
              <span>{{ perm.description || perm.code }}</span>
              <span class="text-xs text-slate-400">({{ perm.code }})</span>
            </label>
          </div>
        </div>
        <div v-if="allPermissions.length === 0" class="text-center text-slate-400 py-4">
          暂无可配置的权限
        </div>
      </div>
    </Modal>

    <!-- Delete Confirm -->
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
        确定要删除角色
        <span class="font-semibold text-slate-800">{{ deletingRole?.name }}</span>
        吗？此操作不可撤销。
      </p>
    </Modal>

    <!-- Export Modal -->
    <Modal
      :open="exportModalVisible"
      title="导出角色数据"
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
