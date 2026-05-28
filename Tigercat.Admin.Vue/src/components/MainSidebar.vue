<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { Sidebar, Menu, MenuItem, SubMenu } from '@expcat/tigercat-vue'
import Icon from './Icon.vue'
import AppLogo from './AppLogo.vue'
import { usePermission } from '../utils/permission'

interface MenuItemDef {
  key: string
  label: string
  icon: string
  /**
   * Permission code required to see this menu item.
   * - `string` — must have this single permission
   * - `string[]` — must have **ALL** listed permissions (same semantics as v-permission)
   */
  permission?: string | string[]
  children?: MenuItemDef[]
}

const props = withDefaults(defineProps<{
  collapsed: boolean
  activeMenu: string
  showCollapseToggle?: boolean
}>(), {
  showCollapseToggle: true
})

const emit = defineEmits<{
  (e: 'update:collapsed', value: boolean): void
  (e: 'update:activeMenu', value: string): void
  (e: 'select', key: string): void
}>()

const menuItems: MenuItemDef[] = [
  { 
    key: 'home', 
    label: '仪表盘', 
    icon: 'dashboard',
    permission: 'dashboard:view',
  },
  { 
    key: 'system', 
    label: '系统管理', 
    icon: 'server',
    children: [
      { key: 'users', label: '用户管理', icon: 'users', permission: 'user:view' },
      { key: 'roles', label: '角色管理', icon: 'shield', permission: 'role:view' },
      { key: 'settings', label: '系统设置', icon: 'settings' }
    ]
  }
]

const bottomMenuItems: MenuItemDef[] = [
  { key: 'about', label: '关于', icon: 'info' }
]

const expandedKeys = ref<(string | number)[]>(['system'])

const handleMenuSelect = (key: string | number) => {
  const k = String(key)
  emit('update:activeMenu', k)
  emit('select', k)
}

const toggleCollapsed = () => {
  emit('update:collapsed', !props.collapsed)
}

const displayCollapsed = computed(() =>
  props.showCollapseToggle ? props.collapsed : false
)

// ---- Permission-based menu filtering ----
const { has: hasPerm } = usePermission()

function isPermitted(item: MenuItemDef): boolean {
  if (!item.permission) return true
  const codes = Array.isArray(item.permission) ? item.permission : [item.permission]
  return codes.every((c) => hasPerm(c))
}

/** Top-level menu items filtered by permission (groups kept only if they have visible children). */
const filteredMenuItems = computed(() =>
  menuItems
    .map((item) => {
      if (item.children) {
        const visibleChildren = item.children.filter(isPermitted)
        if (visibleChildren.length === 0) return null
        return { ...item, children: visibleChildren }
      }
      return isPermitted(item) ? item : null
    })
    .filter(Boolean) as MenuItemDef[]
)

/** Helper to create an Icon VNode for menu icon props */
const menuIcon = (name: string, size = 20) => h(Icon, { name, size })
</script>

<template>
  <Sidebar
    :collapsed="displayCollapsed"
    width="240px"
    collapsed-width="64px"
  >
    <!-- Logo -->
    <div class="flex h-16 items-center justify-center border-b border-[var(--tiger-border,#e2e8f0)]">
      <div class="flex items-center gap-3">
        <AppLogo :size="36" />
        <span v-if="!displayCollapsed" class="font-bold text-lg text-[var(--tiger-text,#1f2937)] tracking-wide whitespace-nowrap">Tigercat</span>
      </div>
    </div>

    <!-- Menu -->
    <nav class="flex-1 overflow-y-auto py-2">
      <div class="flex flex-col min-h-full">
        <Menu
          :selected-keys="[activeMenu]"
          :open-keys="expandedKeys"
          :collapsed="displayCollapsed"
          @select="handleMenuSelect"
          @update:open-keys="(keys: (string | number)[]) => expandedKeys = keys"
        >
          <template v-for="item in filteredMenuItems" :key="item.key">
            <SubMenu
              v-if="item.children?.length"
              :item-key="item.key"
              :title="item.label"
              :icon="menuIcon(item.icon)"
            >
              <MenuItem
                v-for="child in item.children"
                :key="child.key"
                :item-key="child.key"
                :icon="menuIcon(child.icon, 18)"
              >
                {{ child.label }}
              </MenuItem>
            </SubMenu>
            <MenuItem
              v-else
              :item-key="item.key"
              :icon="menuIcon(item.icon)"
            >
              {{ item.label }}
            </MenuItem>
          </template>
        </Menu>

        <!-- Bottom menu -->
        <div class="mt-auto pt-2">
          <Menu
            :selected-keys="[activeMenu]"
            :collapsed="displayCollapsed"
            @select="handleMenuSelect"
          >
            <MenuItem
              v-for="item in bottomMenuItems"
              :key="item.key"
              :item-key="item.key"
              :icon="menuIcon(item.icon)"
            >
              {{ item.label }}
            </MenuItem>
          </Menu>
        </div>
      </div>
    </nav>
    
    <!-- 折叠按钮 -->
    <div v-if="props.showCollapseToggle" class="p-3 border-t border-[var(--tiger-border,#e2e8f0)]">
      <button 
        @click="toggleCollapsed" 
        class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-[var(--tiger-text-secondary,#64748b)] hover:bg-[var(--tiger-bg-hover,#f3f4f6)] hover:text-[var(--tiger-text,#1f2937)] transition-all duration-200"
      >
        <span class="shrink-0">
          <Icon :name="props.collapsed ? 'chevronRight' : 'chevronLeft'" :size="18" />
        </span>
        <span v-if="!props.collapsed" class="whitespace-nowrap">收起菜单</span>
      </button>
    </div>
  </Sidebar>
</template>
