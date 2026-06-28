<script setup lang="ts">
import { ref, computed, inject, onMounted, h } from 'vue'
import { DataTableWithToolbar, Button, Dropdown, DropdownMenu, DropdownItem, Input, Modal, Form, FormItem, Popconfirm, Select, Tag, Tree, Tooltip, Message, Checkbox } from '@expcat/tigercat-vue'
import type { TableColumn, TableCardLayoutItem, SortState } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { apiRequest, debounce, loadWorkbenchState, saveWorkbenchState, type Session } from '../utils'
import { exportData, type ExportFormat } from '../utils/export'
import type { PermissionInfo, RoleUserInfo, RoleItem, PagedResult } from '../utils/types'
import { usePermission } from '../utils/permission'
import {
  buildPermissionTreeData,
} from '../utils/permission-helpers'

// ---- Permission ----
const { has: hasPerm } = usePermission()
const canEdit = computed(() => hasPerm('role:edit'))
const canDelete = computed(() => hasPerm('role:delete'))

// ---- Session ----
const session = inject<import('vue').Ref<Session | null>>('session')!
const authHeaders = computed<Record<string, string>>(() => {
  const headers: Record<string, string> = {}
  if (session.value?.token) headers.Authorization = `Bearer ${session.value.token}`
  return headers
})

const DEFAULT_EXPORT_FIELDS = ['id', 'name', 'description', 'createdAt', 'permissions', 'userCount']
const ROLE_CARD_LAYOUT: TableCardLayoutItem[] = [
  { key: 'description', colSpan: 12, labelPosition: 'left' },
  { key: 'permissions', colSpan: 12, labelPosition: 'left' },
  { key: 'users', colSpan: 12, labelPosition: 'left' },
  { key: 'createdAt', colSpan: 12, labelPosition: 'left' },
  { key: 'actions', colSpan: 12, hideLabel: true },
]
const savedWorkbench = loadWorkbenchState('roles', {
  queryState: { page: 1, pageSize: 10 },
  selectedRowKeys: [],
  hiddenColumnKeys: [],
  exportState: { format: 'csv', fields: DEFAULT_EXPORT_FIELDS },
})
const savedQuery = savedWorkbench.queryState

// ---- State ----
const roles = ref<RoleItem[]>([])
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

// Column visibility
const hiddenColumns = ref<Set<string>>(new Set(savedWorkbench.hiddenColumnKeys))

// Modal state
const modalVisible = ref(false)
const modalTitle = ref('新增角色')
const editingId = ref<number | null>(null)
const formData = ref({
  name: '',
  description: '',
  permissionIds: [] as number[],
})

// Permission config modal
const permModalVisible = ref(false)
const permConfigRole = ref<RoleItem | null>(null)
const permConfigIds = ref<number[]>([])

// All permissions for selection
const allPermissions = ref<PermissionInfo[]>([])

// ---- Export state ----
const exportModalVisible = ref(false)
const exportFormat = ref<ExportFormat>(savedWorkbench.exportState?.format ?? 'csv')
const exportFields = ref<string[]>(savedWorkbench.exportState?.fields?.length ? savedWorkbench.exportState.fields : DEFAULT_EXPORT_FIELDS)
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

function persistQuery() {
  saveWorkbenchState('roles', {
    queryState: {
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
      sortBy: sortState.value.key ?? null,
      sortOrder: sortState.value.direction ?? null,
    },
  })
}

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
  try {
    await apiRequest(`/api/roles/${role.id}`, {
      method: 'DELETE',
      headers: authHeaders.value,
    })
    Message.success({ content: '删除成功', duration: 3000 })
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

const permissionTreeData = computed(() => buildPermissionTreeData(allPermissions.value))

function handlePermTreeCheck(checkedKeys: (string | number)[]) {
  permConfigIds.value = checkedKeys.filter((key): key is number => typeof key === 'number')
}

// ---- Table columns ----
const hiddenColumnKeys = computed(() => Array.from(hiddenColumns.value))

function handleHiddenColumnsChange(nextHiddenKeys: string[]) {
  hiddenColumns.value = new Set(nextHiddenKeys)
  saveWorkbenchState('roles', { hiddenColumnKeys: nextHiddenKeys })
}

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    {
      key: 'id',
      title: 'ID',
      width: 70,
      align: 'center',
      sortable: true,
      hideInCard: true,
    },
    {
      key: 'name',
      title: '角色名称',
      width: 150,
      sortable: true,
      cardTitle: true,
    },
    {
      key: 'description',
      title: '描述',
      width: 200,
      render: (record: any) =>
        h('span', { class: 'p2-text-secondary text-sm' },
          record.description || '-'),
    },
    {
      key: 'permissions',
      title: '权限数',
      width: 100,
      align: 'center',
      render: (record: any) => {
        const perms = record.permissions as PermissionInfo[]
        return h(Tag, { variant: 'primary', size: 'sm' }, () => `${perms?.length ?? 0} 项`)
      },
    },
    {
      key: 'users',
      title: '关联用户',
      width: 120,
      align: 'center',
      render: (record: any) => {
        const users = record.users as RoleUserInfo[]
        return h(Tag, { variant: 'info', size: 'sm' }, () => `${users?.length ?? 0} 人`)
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
        const role = record as RoleItem
        const buttons: any[] = []
        if (canEdit.value) {
          buttons.push(
            h(Tooltip, { content: '更多操作' }, {
              default: () =>
                h(Dropdown, { trigger: 'click', placement: 'bottom-end' }, {
                  trigger: () =>
                    h(Button, {
                      size: 'sm',
                      variant: 'ghost',
                    }, () => '操作'),
                  default: () => [
                    h(DropdownMenu, null, {
                      default: () => [
                        h(DropdownItem, {
                          onClick: () => openEditModal(role),
                        }, () => '编辑角色'),
                        h(DropdownItem, {
                          onClick: () => openPermModal(role),
                        }, () => '权限配置')
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
              title: '确认删除角色',
              description: `将删除角色 ${role.name}，此操作不可撤销。`,
              okText: '删除',
              cancelText: '取消',
              okType: 'danger',
              placement: 'left',
              onConfirm: () => handleDelete(role),
            }, {
              default: () =>
                h(Button, {
                  size: 'sm',
                  variant: 'ghost',
                  danger: true,
                }, () => '删除'),
            })
          )
        }
        return h('div', { class: 'flex items-center justify-center gap-1' }, buttons)
      },
    })
  }

  return cols
})

// ---- Pagination ----
const paginationConfig = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: true,
  pageSizeOptions: [10, 20, 50],
  totalText: (value: number, range: [number, number]) =>
    `显示第 ${range[0]} 到 ${range[1]} 条，共 ${value} 条`,
  prevText: '上一页',
  nextText: '下一页',
  pageIndicatorText: (current: number, totalPages: number) =>
    `第 ${current} 页，共 ${totalPages} 页`,
  pageSizeText: (size: number) => `${size} 条/页`,
}))

function handlePageChange(current: number, nextPageSize: number) {
  if (nextPageSize !== pageSize.value) {
    return
  }

  currentPage.value = current
  persistQuery()
  loadRoles()
}

function handlePageSizeChange(_current: number, nextPageSize: number) {
  pageSize.value = nextPageSize
  currentPage.value = 1
  persistQuery()
  loadRoles()
}

// ---- Sort ----
function handleSortChange(next: SortState) {
  sortState.value = next
  currentPage.value = 1
  persistQuery()
  loadRoles()
}

// ---- Search ----
const debouncedLoad = debounce(() => {
  currentPage.value = 1
  persistQuery()
  loadRoles()
}, 300)

function handleSearch(val: string) {
  keyword.value = val
  persistQuery()
  debouncedLoad()
}

function handleSelectionChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys.map(Number).filter(id => Number.isFinite(id))
  saveWorkbenchState('roles', { selectedRowKeys: selectedRowKeys.value })
}

const tableToolbar = computed(() => ({
  searchValue: keyword.value,
  searchPlaceholder: '搜索角色名称或描述...',
  selectedKeys: selectedRowKeys.value,
  selectedCount: selectedRowKeys.value.length,
  showColumnSettings: true,
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
  saveWorkbenchState('roles', {
    exportState: { format: exportFormat.value, fields: exportFields.value },
  })
}

function handleExportFormatChange(value: unknown) {
  const format = value as ExportFormat
  exportFormat.value = format
  saveWorkbenchState('roles', {
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
      entity: 'roles',
      format: exportFormat.value,
      fields: exportFields.value,
      query: {
        keyword: keyword.value,
        sortBy: sortState.value.key ?? undefined,
        sortOrder: sortState.value.direction ?? undefined,
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
        { label: '权限中心', variant: 'primary' },
        { label: '已启用', variant: 'success' }
      ]"
    />

    <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
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
        variant="primary"
        @click="openCreateModal"
      >
        <span class="flex items-center gap-1">
          <Icon name="shield" :size="16" />
          新增角色
        </span>
      </Button>
    </div>

    <div class="p2-muted-panel px-4 py-3 text-sm">
      {{ serverPaginationHint }}
    </div>

    <DataTableWithToolbar
      :columns="columns"
      :data-source="roles as any"
      :loading="loading"
      :pagination="paginationConfig"
      :hidden-column-keys="hiddenColumnKeys"
      :row-selection="{
        selectedRowKeys: selectedRowKeys,
        type: 'checkbox',
      }"
      :sort="sortState"
      column-lockable
      row-key="id"
      :hoverable="true"
      :striped="true"
      responsive-mode="card"
      card-breakpoint="md"
      :card-layout="ROLE_CARD_LAYOUT"
      empty-text="暂无角色数据"
      :toolbar="tableToolbar"
      @search-change="handleSearch"
      @search="handleSearch"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      @hidden-column-keys-change="handleHiddenColumnsChange"
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
      </div>
    </Modal>

    <!-- Permission Config Modal -->
    <Modal
      v-model:open="permModalVisible"
      :title="`权限配置 - ${permConfigRole?.name || ''}`"
      show-default-footer
      ok-text="保存"
      cancel-text="取消"
      @ok="handlePermSubmit"
      @cancel="permModalVisible = false"
    >
      <div class="p2-modal-scroll space-y-3">
        <div class="flex flex-col gap-2 text-sm text-(--tiger-text-secondary,#64748b) sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span>按分组勾选权限，保存时仍提交扁平 permissionIds。</span>
          <Tag variant="primary" size="sm">
            {{ permConfigIds.length }} / {{ allPermissions.length }}
          </Tag>
        </div>
        <div class="max-h-96 overflow-y-auto rounded-lg border border-(--tiger-border,#e2e8f0) p-3">
          <Tree
            :tree-data="permissionTreeData"
            :checked-keys="permConfigIds"
            checkable
            block-node
            searchable
            default-expand-all
            check-strategy="child"
            empty-text="暂无可配置的权限"
            aria-label="角色权限树"
            @check="handlePermTreeCheck"
          />
        </div>
      </div>
    </Modal>

    <!-- Export Modal -->
    <Modal
      v-model:open="exportModalVisible"
      title="导出角色数据"
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
