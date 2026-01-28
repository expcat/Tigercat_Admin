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
  },
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
    class="flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shrink-0"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <!-- Logo -->
    <div class="flex h-14 items-center justify-center border-b border-slate-100">
      <div class="flex items-center gap-2 font-bold text-lg text-slate-800">
        <span class="text-xl">🐯</span>
        <span v-if="!collapsed" class="transition-opacity">Tigercat</span>
      </div>
    </div>

    <!-- Menu -->
    <nav class="flex-1 overflow-y-auto py-2 px-2">
      <ul class="space-y-1">
        <template v-for="item in menuItems" :key="item.key">
          <!-- 有子菜单 -->
          <li v-if="item.children && item.children.length > 0">
            <button
              @click="toggleExpand(item.key)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="[
                isExpanded(item.key) ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              ]"
            >
              <span class="text-base">{{ item.icon }}</span>
              <span v-if="!collapsed" class="flex-1 text-left">{{ item.label }}</span>
              <span v-if="!collapsed" class="text-xs transition-transform" :class="isExpanded(item.key) ? 'rotate-90' : ''">▶</span>
            </button>
            <!-- 子菜单 -->
            <ul 
              v-if="!collapsed && isExpanded(item.key)" 
              class="mt-1 ml-4 space-y-1 border-l-2 border-slate-100 pl-2"
            >
              <li v-for="child in item.children" :key="child.key">
                <button
                  @click="handleMenuSelect(child.key)"
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  :class="[
                    isActive(child.key) 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  ]"
                >
                  <span class="text-sm">{{ child.icon }}</span>
                  <span>{{ child.label }}</span>
                </button>
              </li>
            </ul>
          </li>
          <!-- 无子菜单 -->
          <li v-else>
            <button
              @click="handleMenuSelect(item.key)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="[
                isActive(item.key) 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              ]"
            >
              <span class="text-base">{{ item.icon }}</span>
              <span v-if="!collapsed">{{ item.label }}</span>
            </button>
          </li>
        </template>
      </ul>
    </nav>
    
    <!-- 折叠按钮 -->
    <div class="p-3 border-t border-slate-100">
      <button 
        @click="toggleCollapsed" 
        class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
      >
        <span>{{ collapsed ? '▶' : '◀' }}</span>
        <span v-if="!collapsed">收起菜单</span>
      </button>
    </div>
  </aside>
</template>
