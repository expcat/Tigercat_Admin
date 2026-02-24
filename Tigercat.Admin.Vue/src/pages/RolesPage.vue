<script setup lang="ts">
import { ref, computed, inject, onMounted, h } from 'vue'
import { Card, Table, Button, Input, Modal, Form, FormItem, Select, Tag, Message, Checkbox } from '@expcat/tigercat-vue'
import type { TableColumn } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { apiRequest, type Session } from '../utils'
import { usePermission } from '../utils/permission'

// ---- Types ----
interface PermissionInfo { id: number; code: string; description: string | null }
interface RoleUserInfo { id: number; username: string; displayName: string | null }
interface RoleItem {
  id: number
  name: string
  description: string | null
  createdAt: string
  permissions: PermissionInfo[]
  users: RoleUserInfo[]
}
interface PagedResult { items: RoleItem[]; total: number; page: number; pageSize: number }

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
    const res = await apiRequest<PagedResult>(`/api/roles?${params}`, {
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
const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'id', title: 'ID', width: 70, align: 'center' },
    { key: 'name', title: '角色名称', width: 150 },
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
}))

function handlePageChange(e: any) {
  if (e.current !== undefined) currentPage.value = e.current
  if (e.pageSize !== undefined) {
    pageSize.value = e.pageSize
    currentPage.value = 1
  }
  loadRoles()
}

// ---- Search ----
let searchTimer: ReturnType<typeof setTimeout> | null = null
function handleSearch(val: string) {
  keyword.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadRoles()
  }, 300)
}

// Permission group helpers – group permissions by module prefix (e.g. "user", "role", "dashboard")
const permissionGroups = computed(() => {
  const groups: Record<string, PermissionInfo[]> = {}
  for (const p of allPermissions.value) {
    const prefix = p.code.split(':')[0] || 'other'
    if (!groups[prefix]) groups[prefix] = []
    groups[prefix].push(p)
  }
  return groups
})

const groupLabels: Record<string, string> = {
  dashboard: '仪表盘',
  user: '用户管理',
  role: '角色管理',
}

function toggleGroupPerms(groupPerms: PermissionInfo[], target: number[]) {
  const ids = groupPerms.map(p => p.id)
  const allChecked = ids.every(id => target.includes(id))
  if (allChecked) {
    return target.filter(id => !ids.includes(id))
  } else {
    const set = new Set(target)
    ids.forEach(id => set.add(id))
    return [...set]
  }
}

function isGroupAllChecked(groupPerms: PermissionInfo[], target: number[]) {
  return groupPerms.every(p => target.includes(p.id))
}

function isGroupPartialChecked(groupPerms: PermissionInfo[], target: number[]) {
  const checked = groupPerms.filter(p => target.includes(p.id))
  return checked.length > 0 && checked.length < groupPerms.length
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
        </div>
        <div class="flex items-center gap-2">
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
        row-key="id"
        :hoverable="true"
        :striped="true"
        empty-text="暂无角色数据"
        @page-change="handlePageChange"
      />
    </Card>

    <!-- Create / Edit Modal -->
    <Modal
      :visible="modalVisible"
      :title="modalTitle"
      ok-text="确定"
      cancel-text="取消"
      @ok="handleSubmit"
      @cancel="modalVisible = false"
      @close="modalVisible = false"
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
      :visible="permModalVisible"
      :title="`权限配置 - ${permConfigRole?.name || ''}`"
      ok-text="保存"
      cancel-text="取消"
      @ok="handlePermSubmit"
      @cancel="permModalVisible = false"
      @close="permModalVisible = false"
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
              {{ groupLabels[group as string] || group }}
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
      :visible="deleteConfirmVisible"
      title="确认删除"
      ok-text="确认删除"
      cancel-text="取消"
      @ok="confirmDelete"
      @cancel="deleteConfirmVisible = false"
      @close="deleteConfirmVisible = false"
    >
      <p class="text-slate-600">
        确定要删除角色
        <span class="font-semibold text-slate-800">{{ deletingRole?.name }}</span>
        吗？此操作不可撤销。
      </p>
    </Modal>
  </div>
</template>
