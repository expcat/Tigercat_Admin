<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Empty } from '@expcat/tigercat-vue/Empty'
import { Form } from '@expcat/tigercat-vue/Form'
import { FormItem } from '@expcat/tigercat-vue/FormItem'
import { Input } from '@expcat/tigercat-vue/Input'
import { Menu } from '@expcat/tigercat-vue/Menu'
import { Message } from '@expcat/tigercat-vue/Message'
import { Modal } from '@expcat/tigercat-vue/Modal'
import { Popconfirm } from '@expcat/tigercat-vue/Popconfirm'
import { Select } from '@expcat/tigercat-vue/Select'
import { Switch } from '@expcat/tigercat-vue/Switch'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Tree } from '@expcat/tigercat-vue/Tree'
import type { MenuItem, TreeNodeKey } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { usePermission } from '../utils/permission'
import { resetShellMenuSchema } from '../utils/shell-navigation'
import type { MenuSchemaPayload, RoleItem } from '../utils/types'
import {
  collectDescendantKeys,
  createMenuNode,
  defaultCreateForm,
  deleteMenuNode,
  EMPTY_MENU_FORM,
  fetchMenuSchema,
  fetchRoleDetail,
  fetchRolesForPreview,
  findMenuNode,
  formFromNode,
  formToWrite,
  isMenuRootKey,
  MENU_ICON_OPTIONS,
  parentSelectOptions,
  previewMenuItems,
  previewRouteCount,
  schemaNodes,
  toMenuTreeData,
  updateMenuNode,
  type MenuNodeForm,
} from '../utils/menus'

const { has: hasPerm } = usePermission()
const canDelete = computed(() => hasPerm('menu:delete'))

const schema = ref<MenuSchemaPayload>({ items: [], bottomItems: [] })
const loading = ref(false)
const selectedKey = ref<string | null>(null)
const modalVisible = ref(false)
const modalTitle = ref('新增菜单节点')
const editingKey = ref<string | null>(null)
const formData = ref<MenuNodeForm>({ ...EMPTY_MENU_FORM })
const submitting = ref(false)
const roles = ref<RoleItem[]>([])
const previewRoleId = ref<number | null>(null)
const previewCodes = ref<string[]>([])
const previewError = ref('')
const previewLoading = ref(false)

const treeData = computed(() => toMenuTreeData(schema.value))
const selectedKeys = computed(() => (selectedKey.value ? [selectedKey.value] : []))
const selectedNode = computed(() =>
  selectedKey.value && !isMenuRootKey(selectedKey.value)
    ? findMenuNode(schemaNodes(schema.value), selectedKey.value)
    : undefined,
)
const canDeleteSelected = computed(
  () =>
    canDelete.value
    && Boolean(selectedNode.value)
    && selectedNode.value?.key !== 'home'
    && !(selectedNode.value?.children && selectedNode.value.children.length > 0),
)
const parentOptions = computed(() => {
  const exclude = editingKey.value
    ? [
        editingKey.value,
        ...collectDescendantKeys(
          findMenuNode(schemaNodes(schema.value), editingKey.value) ?? { key: editingKey.value },
        ),
      ]
    : []
  return parentSelectOptions(schema.value, exclude)
})
const roleOptions = computed(() =>
  roles.value.map((role) => ({ label: role.name, value: role.id })),
)
const previewItems = computed(() =>
  previewMenuItems(schema.value.items, previewCodes.value),
)
const previewRouteTotal = computed(() =>
  previewRoleId.value == null
    ? 0
    : previewRouteCount(schemaNodes(schema.value), previewCodes.value),
)

function withPreviewIcons(items: MenuItem[]): MenuItem[] {
  return items.map((item) => ({
    ...item,
    icon:
      typeof item.icon === 'string'
        ? h(Icon, { name: item.icon, size: 16 })
        : item.icon,
    children: item.children ? withPreviewIcons(item.children) : undefined,
  }))
}

const previewMenuData = computed(() => withPreviewIcons(previewItems.value))

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

async function loadSchema() {
  loading.value = true
  try {
    const res = await fetchMenuSchema()
    schema.value = res.data
    if (
      selectedKey.value
      && !isMenuRootKey(selectedKey.value)
      && !findMenuNode(schemaNodes(schema.value), selectedKey.value)
    ) {
      selectedKey.value = null
    }
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '菜单 schema 加载失败'), duration: 3000 })
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  previewError.value = ''
  try {
    const res = await fetchRolesForPreview()
    roles.value = res.data.items
  } catch (error: unknown) {
    previewError.value = readErrorMessage(error, '角色列表加载失败，预览需要 role:view')
    roles.value = []
  }
}

function handleSelectedKeys(keys: TreeNodeKey[]) {
  selectedKey.value = keys.length ? String(keys[0]) : null
}

function openCreate() {
  modalTitle.value = '新增菜单节点'
  editingKey.value = null
  formData.value = defaultCreateForm(selectedKey.value)
  modalVisible.value = true
}

function openEdit() {
  if (!selectedNode.value) {
    Message.warning({ content: '请先选择要编辑的节点', duration: 2000 })
    return
  }
  modalTitle.value = '编辑菜单节点'
  editingKey.value = selectedNode.value.key
  formData.value = formFromNode(schema.value, selectedNode.value)
  modalVisible.value = true
}

async function submitForm() {
  if (!editingKey.value && !formData.value.key.trim()) {
    Message.warning({ content: '请输入菜单节点 key', duration: 2000 })
    return
  }
  submitting.value = true
  try {
    if (editingKey.value) {
      await updateMenuNode(editingKey.value, formToWrite(formData.value, false))
      Message.success({ content: '菜单节点已更新', duration: 2000 })
    } else {
      await createMenuNode(formToWrite(formData.value, true))
      Message.success({ content: '菜单节点已创建', duration: 2000 })
    }
    modalVisible.value = false
    resetShellMenuSchema()
    await loadSchema()
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '保存失败'), duration: 3000 })
  } finally {
    submitting.value = false
  }
}

async function handleDelete() {
  if (!selectedNode.value) return
  try {
    await deleteMenuNode(selectedNode.value.key)
    Message.success({ content: '菜单节点已删除', duration: 2000 })
    selectedKey.value = null
    resetShellMenuSchema()
    await loadSchema()
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '删除失败'), duration: 3000 })
  }
}

async function handlePreviewRoleChange(value: unknown) {
  const id = typeof value === 'number' ? value : Number(value)
  previewRoleId.value = Number.isFinite(id) ? id : null
  previewCodes.value = []
  if (!previewRoleId.value) return
  previewLoading.value = true
  previewError.value = ''
  try {
    const res = await fetchRoleDetail(previewRoleId.value)
    previewCodes.value = (res.data.permissions ?? []).map((item) => item.code)
  } catch (error: unknown) {
    previewError.value = readErrorMessage(error, '角色权限加载失败')
  } finally {
    previewLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadSchema(), loadRoles()])
})
</script>

<template>
  <div class="space-y-4">
    <PageHeader
      title="菜单管理"
      subtitle="维护侧栏 MenuSchema，并用角色权限预览过滤后的菜单。"
      icon="menu"
      :tags="[{ label: '轻页', variant: 'info' }]"
    />

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Text weight="medium">菜单树</Text>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              v-permission="'menu:create'"
              size="sm"
              @click="openCreate"
            >
              新增节点
            </Button>
            <Button
              v-permission="'menu:edit'"
              size="sm"
              variant="outline"
              :disabled="!selectedNode"
              @click="openEdit"
            >
              编辑
            </Button>
            <Popconfirm
              v-if="canDelete"
              title="确认删除菜单节点"
              :description="`将删除「${selectedNode?.label || selectedNode?.key || ''}」，此操作不可撤销。`"
              ok-text="删除"
              cancel-text="取消"
              ok-type="danger"
              :disabled="!canDeleteSelected"
              @confirm="handleDelete"
            >
              <Button
                size="sm"
                variant="outline"
                danger
                :disabled="!canDeleteSelected"
              >
                删除
              </Button>
            </Popconfirm>
          </div>
        </div>
        <Text size="sm" color="secondary" class="mb-3 block">
          选择节点后可新增子项、编辑或删除。仪表盘节点不可删除；有子节点时请先删子项。
        </Text>
        <div v-if="loading" class="p2-text-secondary mb-3">菜单树加载中...</div>
        <Tree
          :tree-data="treeData"
          :selected-keys="selectedKeys"
          default-expand-all
          block-node
          searchable
          aria-label="菜单树"
          empty-text="暂无菜单节点"
          @update:selected-keys="handleSelectedKeys"
        />
      </Card>

      <Card>
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Text weight="medium">角色预览</Text>
          <Tag v-if="previewRoleId != null" size="sm" variant="primary">
            {{ previewRouteTotal }} 条路由记录
          </Tag>
        </div>
        <Text size="sm" color="secondary" class="mb-3 block">
          使用 filterMenuByPermission 与 menuSchemaToMenuItems 按角色权限过滤，不裁剪服务端 schema。
        </Text>
        <Select
          :model-value="previewRoleId ?? undefined"
          :options="roleOptions"
          placeholder="选择角色预览"
          :disabled="Boolean(previewError) && roles.length === 0"
          class="mb-3"
          @update:model-value="handlePreviewRoleChange"
        />
        <Text v-if="previewError" size="sm" color="danger" class="mb-3 block">
          {{ previewError }}
        </Text>
        <Empty
          v-if="!previewRoleId"
          description="选择一个角色，查看该角色侧栏会看到的菜单"
        />
        <div v-else-if="previewLoading" class="p2-text-secondary py-8 text-center">
          预览加载中...
        </div>
        <Empty
          v-else-if="previewMenuData.length === 0"
          description="该角色过滤后没有可见菜单"
        />
        <Menu
          v-else
          mode="inline"
          :items="previewMenuData"
          :selected-keys="[]"
          aria-label="角色菜单预览"
        />
      </Card>
    </div>

    <Modal
      v-model:open="modalVisible"
      :title="modalTitle"
      show-default-footer
      :ok-text="submitting ? '保存中…' : '确定'"
      cancel-text="取消"
      @ok="submitForm"
      @cancel="modalVisible = false"
    >
      <div class="p2-modal-scroll">
        <Form :label-width="96">
          <FormItem label="Key" required>
            <Input
              v-model="formData.key"
              placeholder="例如 reports"
              :disabled="Boolean(editingKey)"
            />
          </FormItem>
          <FormItem label="显示名">
            <Input v-model="formData.label" placeholder="请输入显示名" />
          </FormItem>
          <FormItem label="图标">
            <Select
              v-model="formData.icon"
              :options="MENU_ICON_OPTIONS"
              placeholder="选择图标"
            />
          </FormItem>
          <FormItem label="路径">
            <Input v-model="formData.path" placeholder="例如 /help" />
          </FormItem>
          <FormItem label="权限码">
            <Input v-model="formData.permission" placeholder="例如 menu:view，可空" />
          </FormItem>
          <FormItem label="父节点">
            <Select
              v-model="formData.parentKey"
              :options="parentOptions"
              placeholder="选择父节点"
            />
          </FormItem>
          <FormItem label="iframe">
            <Input v-model="formData.iframeSrc" placeholder="可选 iframe 地址" />
          </FormItem>
          <FormItem label="隐藏菜单">
            <Switch
              :model-value="formData.hideInMenu"
              @update:model-value="(val: boolean) => (formData.hideInMenu = val)"
            />
          </FormItem>
          <FormItem label="面包屑隐藏">
            <Switch
              :model-value="formData.hideInBreadcrumb"
              @update:model-value="(val: boolean) => (formData.hideInBreadcrumb = val)"
            />
          </FormItem>
          <FormItem label="平铺子菜单">
            <Switch
              :model-value="formData.flatMenu"
              @update:model-value="(val: boolean) => (formData.flatMenu = val)"
            />
          </FormItem>
        </Form>
      </div>
    </Modal>
  </div>
</template>
