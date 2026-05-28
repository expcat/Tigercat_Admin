<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Layout, Content } from '@expcat/tigercat-vue'
import MainHeader from './MainHeader.vue'
import MainSidebar from './MainSidebar.vue'
import type { ThemeMode } from '../utils/types'

const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)'

const PAGE_TITLES: Record<string, string> = {
  home: '仪表盘',
  users: '用户管理',
  roles: '角色管理',
  settings: '系统设置',
  about: '关于'
}

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
const isMobile = ref(false)
const sidebarOpen = ref(false)

const MENU_ROUTES = {
  home: 'dashboard',
  users: 'users',
  roles: 'roles',
  settings: 'settings',
  about: 'about'
} as const

type MenuKey = keyof typeof MENU_ROUTES

const activeMenu = ref<MenuKey>('home')

const pageTitle = computed(() => PAGE_TITLES[activeMenu.value] ?? '仪表盘')

const ROUTE_TO_MENU = Object.fromEntries(
  Object.entries(MENU_ROUTES).map(([key, value]) => [value, key as MenuKey])
) as Record<string, MenuKey | undefined>

const handleMenuSelect = (key: MenuKey) => {
  activeMenu.value = key
  if (isMobile.value) {
    sidebarOpen.value = false
  }
  router.push({ name: MENU_ROUTES[key] })
}

const handleSidebarToggle = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const handleSidebarClose = () => {
  sidebarOpen.value = false
}

const syncMobileState = (matches: boolean) => {
  isMobile.value = matches
  sidebarOpen.value = false
}

const handleViewportChange = (event: MediaQueryListEvent) => {
  syncMobileState(event.matches)
}

const handleWindowKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isMobile.value && sidebarOpen.value) {
    sidebarOpen.value = false
  }
}

let mediaQuery: MediaQueryList | null = null

onMounted(() => {
  mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY)
  syncMobileState(mediaQuery.matches)
  mediaQuery.addEventListener('change', handleViewportChange)
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', handleViewportChange)
  window.removeEventListener('keydown', handleWindowKeydown)
})

watch(
  () => route.name,
  (name) => {
    if (typeof name === 'string') {
      activeMenu.value = ROUTE_TO_MENU[name] ?? 'home'
    } else {
      activeMenu.value = 'home'
    }

    if (isMobile.value) {
      sidebarOpen.value = false
    }
  },
  { immediate: true }
)
</script>

<template>
  <Layout class="h-screen w-full overflow-hidden">
    <button
      v-if="isMobile && sidebarOpen"
      type="button"
      aria-label="关闭导航菜单"
      class="fixed inset-0 z-30 bg-slate-950/45 md:hidden"
      @click="handleSidebarClose"
    />

    <!-- Sidebar -->
    <div
      id="main-sidebar"
      :aria-hidden="isMobile && !sidebarOpen"
      :class="isMobile
        ? [
            'fixed inset-y-0 left-0 z-40 shrink-0 transform transition-transform duration-200 ease-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          ]
        : 'relative shrink-0'"
      :style="{ width: isMobile ? '240px' : collapsed ? '64px' : '240px' }"
    >
      <MainSidebar 
        v-model:collapsed="collapsed"
        v-model:active-menu="activeMenu"
        :show-collapse-toggle="!isMobile"
        @select="handleMenuSelect" 
      />
    </div>

    <!-- Main Content Area -->
    <Layout class="min-w-0">
      <!-- Header -->
      <MainHeader 
        :session="session"
        :page-title="pageTitle"
        :theme-mode="themeMode"
        :show-sidebar-toggle="isMobile"
        :sidebar-open="sidebarOpen"
        @logout="$emit('logout')"
        @change-password="$emit('change-password')"
        @toggle-theme="$emit('toggle-theme')"
        @toggle-sidebar="handleSidebarToggle"
      />

      <!-- Content -->
      <Content class="overflow-auto p-4 scroll-smooth md:p-6">
        <div class="mx-auto max-w-7xl animate-fade-in">
          <slot></slot>
        </div>
      </Content>
    </Layout>
  </Layout>
</template>
