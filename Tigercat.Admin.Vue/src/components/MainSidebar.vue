<script setup lang="ts">
import { ref } from 'vue'

interface MenuItem {
  key: string
  label: string
  icon: string
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
    icon: '📊' 
  },
  { 
    key: 'system', 
    label: '系统管理', 
    icon: '⚙️',
    children: [
      { key: 'users', label: '用户管理', icon: '👥' },
      { key: 'roles', label: '角色管理', icon: '🛡️' },
      { key: 'settings', label: '系统设置', icon: '🔧' }
    ]
  }
]

const bottomMenuItems: MenuItem[] = [
  {
    key: 'about',
    label: '关于',
    icon: 'ℹ️'
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
</script>

<template>
  <aside 
    class="flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shrink-0 shadow-sm"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <!-- Logo -->
    <div class="flex h-16 items-center justify-center border-b border-slate-100">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
          <span class="text-lg text-white">🐯</span>
        </div>
        <span v-if="!collapsed" class="font-bold text-lg text-slate-800 tracking-wide whitespace-nowrap">Tigercat</span>
      </div>
    </div>

    <!-- Menu -->
    <nav class="flex-1 overflow-y-auto py-4 px-3">
      <div class="flex flex-col min-h-full">
        <ul class="space-y-1">
        <template v-for="item in menuItems" :key="item.key">
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
              <span class="text-base shrink-0">{{ item.icon }}</span>
              <span v-if="!collapsed" class="flex-1 text-left whitespace-nowrap">{{ item.label }}</span>
              <span v-if="!collapsed" class="text-xs transition-transform duration-200" :class="isExpanded(item.key) ? 'rotate-90' : ''">▶</span>
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
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-md' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  ]"
                >
                  <span class="text-sm shrink-0">{{ child.icon }}</span>
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
              <span class="text-base shrink-0">{{ item.icon }}</span>
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
              <span class="text-base shrink-0">{{ item.icon }}</span>
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
        <span class="transition-transform duration-200 shrink-0" :class="collapsed ? '' : 'rotate-180'">▶</span>
        <span v-if="!collapsed" class="whitespace-nowrap">收起菜单</span>
      </button>
    </div>
  </aside>
</template>
