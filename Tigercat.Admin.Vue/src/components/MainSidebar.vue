<script setup lang="ts">
import { Menu } from '@expcat/tigercat-vue'

const props = defineProps<{
  collapsed: boolean
  activeMenu: string
}>()

const emit = defineEmits<{
  (e: 'update:collapsed', value: boolean): void
  (e: 'update:activeMenu', value: string): void
  (e: 'select', key: string): void
}>()

const menuItems = [
  { 
    key: 'home', 
    label: 'Dashboard', 
    icon: '📊' 
  },
  { 
    key: 'system', 
    label: 'System', 
    icon: '⚙️',
    children: [
      { key: 'users', label: 'Users', icon: '👥' },
      { key: 'roles', label: 'Roles', icon: '🛡️' },
      { key: 'settings', label: 'Settings', icon: '🔧' }
    ]
  },
  {
    key: 'about',
    label: 'About',
    icon: 'ℹ️'
  }
]

const handleMenuSelect = (key: string) => {
  emit('update:activeMenu', key);
  emit('select', key);
}

const toggleCollapsed = () => {
  emit('update:collapsed', !props.collapsed);
}
</script>

<template>
  <aside 
    class="flex flex-col bg-white border-r border-slate-200 transition-all duration-300"
    :class="collapsed ? 'w-16' : 'w-64'"
  >
    <div class="flex h-16 items-center justify-center border-b border-slate-100">
      <div class="flex items-center gap-2 font-bold text-xl text-slate-800">
        <span>🐯</span>
        <span v-if="!collapsed">Tigercat</span>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto py-4">
      <Menu 
        :activeKey="activeMenu"
        :items="menuItems"
        @select="handleMenuSelect"
      />
    </div>
    
    <div class="p-4 border-t border-slate-100 flex justify-center">
      <button @click="toggleCollapsed" class="text-slate-500 hover:text-slate-700">
        {{ collapsed ? '➡️' : '⬅️ Collapse' }}
      </button>
    </div>
  </aside>
</template>
