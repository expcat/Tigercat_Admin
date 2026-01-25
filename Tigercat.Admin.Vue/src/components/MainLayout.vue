<script setup lang="ts">
import { ref, computed } from 'vue'
import { Menu, Text } from '@expcat/tigercat-vue'

interface Session {
  username: string
}

const props = defineProps<{
  session: Session | null
}>()

const emit = defineEmits<{
  (e: 'logout'): void
  (e: 'change-password'): void
}>()

const collapsed = ref(false)
const activeMenu = ref('home')

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
}

const handleMenuSelect = (key: string) => {
  activeMenu.value = key
}

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
</script>

<template>
  <div class="flex h-screen w-full bg-slate-50 overflow-hidden">
    <!-- Sidebar -->
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
        <!-- Assuming Menu handles collapse visually if parent width changes, or simpler implementation -->
      </div>
      
      <div class="p-4 border-t border-slate-100 flex justify-center">
        <button @click="toggleCollapsed" class="text-slate-500 hover:text-slate-700">
            {{ collapsed ? '➡️' : '⬅️ Collapse' }}
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex flex-col flex-1 min-w-0">
      <!-- Header -->
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 transition-colors">
        <div class="flex items-center">
            <Text size="lg" weight="bold">Admin Portal</Text>
        </div>
        
        <div class="flex items-center gap-4">
           <!-- User Info / Actions -->
           <div class="flex items-center gap-2" v-if="session">
              <div class="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  {{ session.username.charAt(0).toUpperCase() }}
              </div>
              <div class="flex flex-col">
                  <span class="text-sm font-medium">{{ session.username }}</span>
              </div>
           </div>
           
           <div class="h-6 w-px bg-slate-200 mx-2"></div>
           
           <button @click="$emit('change-password')" class="text-sm text-slate-600 hover:text-blue-600 cursor-pointer">
              Password
           </button>
           <button @click="$emit('logout')" class="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer">
              Logout
           </button>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 overflow-auto p-6 scroll-smooth">
         <div class="mx-auto max-w-7xl animate-fade-in">
            <slot></slot>
         </div>
      </main>
    </div>
  </div>
</template>
