<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainHeader from './MainHeader.vue'
import MainSidebar from './MainSidebar.vue'

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

const route = useRoute()
const router = useRouter()

const collapsed = ref(false)
const activeMenu = ref('home')

const handleMenuSelect = (key: string) => {
  activeMenu.value = key
  switch (key) {
    case 'home':
      router.push({ name: 'dashboard' })
      break
    case 'users':
      router.push({ name: 'users' })
      break
    case 'roles':
      router.push({ name: 'roles' })
      break
    default:
      break
  }
}

const handleRouteChange = (path: string) => {
  switch (path) {
    case '/dashboard':
      activeMenu.value = 'home'
      break
    case '/users':
      activeMenu.value = 'users'
      break
    case '/roles':
      activeMenu.value = 'roles'
      break
    default:
      activeMenu.value = 'home'
      break
  }
}

watch(
  () => route.path,
  (path) => {
    handleRouteChange(path)
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex h-screen w-full bg-slate-50 overflow-hidden">
    <!-- Sidebar -->
    <MainSidebar 
      v-model:collapsed="collapsed"
      v-model:active-menu="activeMenu" 
      @select="handleMenuSelect" 
    />

    <!-- Main Content Area -->
    <div class="flex flex-col flex-1 min-w-0">
      <!-- Header -->
      <MainHeader 
        :session="session"
        @logout="$emit('logout')"
        @change-password="$emit('change-password')"
      />

      <!-- Content -->
      <main class="flex-1 overflow-auto p-6 scroll-smooth">
         <div class="mx-auto max-w-7xl animate-fade-in">
            <slot></slot>
         </div>
      </main>
    </div>
  </div>
</template>
