<script setup lang="ts">
import { ref, computed } from 'vue'
import Icon from './Icon.vue'
import AppLogo from './AppLogo.vue'
import { usePermission } from '../utils/permission'

interface MenuItem {
  key: string
  label: string
  icon: string
  /**
   * Permission code required to see this menu item.
   * - `string` — must have this single permission
   * - `string[]` — must have **ALL** listed permissions (same semantics as v-permission)
   */
  permission?: string | string[]
  children?: MenuItem[]
}

const props = defineProps<{
  collapsed: boolean
  activeMenu: string
}>()

const emit = defineEmits<{
  (e: 'update:collapsed', value: boolean): void
  (e: 'update:activeMenu', value: string): void
  (e: 'select', key: string): void
}>()

const menuItems: MenuItem[] = [
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

const bottomMenuItems: MenuItem[] = [
  {
    key: 'about',
    label: '关于',
    icon: 'info'
  }
]

// 展开的菜单组
const expandedKeys = ref<string[]>(['system'])

const handleMenuSelect = (key: string) => {
  emit('update:activeMenu', key)
  emit('select', key)
}

const toggleExpand = (key: string) => {
  const index = expandedKeys.value.indexOf(key)
  if (index > -1) {
    expandedKeys.value.splice(index, 1)
  } else {
    expandedKeys.value.push(key)
  }
}

const toggleCollapsed = () => {
  emit('update:collapsed', !props.collapsed)
}

const isExpanded = (key: string) => expandedKeys.value.includes(key)
const isActive = (key: string) => props.activeMenu === key

// ---- Permission-based menu filtering ----
const { has: hasPerm } = usePermission()

function isPermitted(item: MenuItem): boolean {
  if (!item.permission) return true
  const codes = Array.isArray(item.permission) ? item.permission : [item.permission]
  // Require ALL listed permissions — consistent with v-permission default semantics
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
    .filter(Boolean) as MenuItem[]
)
</script>

<template>
  <aside 
    class="flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shrink-0 shadow-sm"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <!-- Logo -->
    <div class="flex h-16 items-center justify-center border-b border-slate-100">
      <div class="flex items-center gap-3">
        <AppLogo :size="36" />
        <span v-if="!collapsed" class="font-bold text-lg text-slate-800 tracking-wide whitespace-nowrap">Tigercat</span>
      </div>
    </div>

    <!-- Menu -->
    <nav class="flex-1 overflow-y-auto py-4 px-3">
      <div class="flex flex-col min-h-full">
        <ul class="space-y-1">
        <template v-for="item in filteredMenuItems" :key="item.key">
          <!-- 有子菜单 -->
          <li v-if="item.children && item.children.length > 0">
            <button
              @click="toggleExpand(item.key)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              :class="[
                isExpanded(item.key) 
                  ? 'bg-slate-100 text-slate-900' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              ]"
            >
              <span class="shrink-0 text-slate-500"><Icon :name="item.icon" :size="20" /></span>
              <span v-if="!collapsed" class="flex-1 text-left whitespace-nowrap">{{ item.label }}</span>
              <span v-if="!collapsed" class="text-slate-400 transition-transform duration-200" :class="isExpanded(item.key) ? 'rotate-180' : ''">
                <Icon name="chevronDown" :size="16" />
              </span>
            </button>
            <!-- 子菜单 -->
            <ul 
              v-if="!collapsed && isExpanded(item.key)" 
              class="mt-1 ml-4 space-y-1 border-l-2 border-slate-200 pl-3"
            >
              <li v-for="child in item.children" :key="child.key">
                <button
                  @click="handleMenuSelect(child.key)"
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200"
                  :class="[
                    isActive(child.key) 
                      ? 'text-blue-600 font-medium bg-blue-50' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  ]"
                >
                  <span class="shrink-0" :class="isActive(child.key) ? 'text-blue-600' : 'text-slate-400'"><Icon :name="child.icon" :size="18" /></span>
                  <span class="whitespace-nowrap">{{ child.label }}</span>
                </button>
              </li>
            </ul>
          </li>
          <!-- 无子菜单 -->
          <li v-else>
            <button
              @click="handleMenuSelect(item.key)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              :class="[
                isActive(item.key) 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              ]"
            >
              <span class="shrink-0" :class="isActive(item.key) ? 'text-white' : 'text-slate-500'"><Icon :name="item.icon" :size="20" /></span>
              <span v-if="!collapsed" class="whitespace-nowrap">{{ item.label }}</span>
            </button>
          </li>
        </template>
        </ul>
        <ul class="mt-auto space-y-1 pt-4">
          <li v-for="item in bottomMenuItems" :key="item.key">
            <button
              @click="handleMenuSelect(item.key)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              :class="[
                isActive(item.key) 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              ]"
            >
              <span class="shrink-0" :class="isActive(item.key) ? 'text-white' : 'text-slate-500'"><Icon :name="item.icon" :size="20" /></span>
              <span v-if="!collapsed" class="whitespace-nowrap">{{ item.label }}</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
    
    <!-- 折叠按钮 -->
    <div class="p-3 border-t border-slate-100">
      <button 
        @click="toggleCollapsed" 
        class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
      >
        <span class="shrink-0">
          <Icon :name="collapsed ? 'chevronRight' : 'chevronLeft'" :size="18" />
        </span>
        <span v-if="!collapsed" class="whitespace-nowrap">收起菜单</span>
      </button>
    </div>
  </aside>
</template>
