<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Layout, Content } from '@expcat/tigercat-vue'
import MainHeader from './MainHeader.vue'
import MainSidebar from './MainSidebar.vue'
import type { ThemeMode } from '../utils/types'

interface Session {
  username: string
}

const props = defineProps<{
  session: Session | null
  themeMode: ThemeMode
  compactMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'logout'): void
  (e: 'change-password'): void
  (e: 'toggle-theme'): void
}>()

const route = useRoute()
const router = useRouter()

const collapsed = ref(props.compactMode ?? false)

const MENU_ROUTES = {
  home: 'dashboard',
  users: 'users',
  roles: 'roles',
  settings: 'settings',
  about: 'about'
} as const

type MenuKey = keyof typeof MENU_ROUTES

const activeMenu = ref<MenuKey>('home')

const ROUTE_TO_MENU = Object.fromEntries(
  Object.entries(MENU_ROUTES).map(([key, value]) => [value, key as MenuKey])
) as Record<string, MenuKey | undefined>

const handleMenuSelect = (key: MenuKey) => {
  activeMenu.value = key
  router.push({ name: MENU_ROUTES[key] })
}

watch(
  () => route.name,
  (name) => {
    if (typeof name === 'string') {
      activeMenu.value = ROUTE_TO_MENU[name] ?? 'home'
    } else {
      activeMenu.value = 'home'
    }
  },
  { immediate: true }
)
</script>

<template>
  <Layout class="h-screen w-full overflow-hidden">
    <!-- Sidebar -->
    <MainSidebar 
      v-model:collapsed="collapsed"
      v-model:active-menu="activeMenu" 
      @select="handleMenuSelect" 
    />

    <!-- Main Content Area -->
    <Layout>
      <!-- Header -->
      <MainHeader 
        :session="session"
        :theme-mode="themeMode"
        @logout="$emit('logout')"
        @change-password="$emit('change-password')"
        @toggle-theme="$emit('toggle-theme')"
      />

      <!-- Content -->
      <Content class="overflow-auto p-6 scroll-smooth">
        <div class="mx-auto max-w-7xl animate-fade-in">
          <slot></slot>
        </div>
      </Content>
    </Layout>
  </Layout>
</template>
