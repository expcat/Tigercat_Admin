<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Layout, Content, Drawer } from '@expcat/tigercat-vue'
import MainHeader from './MainHeader.vue'
import MainSidebar from './MainSidebar.vue'
import type { ThemeMode } from '../utils/types'
import {
  getShellBreadcrumbItems,
  SHELL_MENU_ROUTES,
  SHELL_ROUTE_TO_MENU,
  getShellPageTitle,
  type ShellPageKey
} from '../utils/shell-navigation'

const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)'
const DEMO_MODE = import.meta.env.VITE_TIGERCAT_DEMO === 'true'

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

const activeMenu = ref<ShellPageKey>('home')

const pageTitle = computed(() => getShellPageTitle(activeMenu.value))
const breadcrumbItems = computed(() => getShellBreadcrumbItems(activeMenu.value))

const handleMenuSelect = (key: string) => {
  const menuKey = key as ShellPageKey
  activeMenu.value = menuKey
  if (isMobile.value) {
    sidebarOpen.value = false
  }
  router.push({ name: SHELL_MENU_ROUTES[menuKey] })
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
      activeMenu.value = SHELL_ROUTE_TO_MENU[name] ?? 'home'
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
  <Layout class="h-screen w-full overflow-hidden !flex-row">
    <button
      v-if="isMobile && sidebarOpen"
      type="button"
      aria-label="关闭导航菜单"
      class="p2-overlay fixed inset-0 z-30 md:hidden"
      @click="handleSidebarClose"
    />

    <!-- Sidebar -->
    <Drawer
      v-if="isMobile"
      placement="left"
      v-model:open="sidebarOpen"
      :closable="false"
      :mask="false"
      width="240px"
      body-class-name="!p-0 h-full"
    >
      <div id="main-sidebar" class="h-full">
        <MainSidebar 
          :collapsed="false"
          v-model:active-menu="activeMenu"
          :show-collapse-toggle="false"
          sidebar-width="240px"
          collapsed-width="64px"
          @update:collapsed="(value) => collapsed = value"
          @select="handleMenuSelect" 
        />
      </div>
    </Drawer>

    <div
      v-else
      id="main-sidebar"
      class="relative h-full shrink-0"
    >
      <MainSidebar 
        :collapsed="collapsed"
        v-model:active-menu="activeMenu"
        :show-collapse-toggle="true"
        sidebar-width="240px"
        collapsed-width="64px"
        @update:collapsed="(value) => collapsed = value"
        @select="handleMenuSelect" 
      />
    </div>

    <!-- Main Content Area -->
    <Layout class="h-full min-h-0 min-w-0 flex-1">
      <!-- Header -->
      <MainHeader 
        :session="session"
        :page-title="pageTitle"
        :breadcrumb-items="breadcrumbItems"
        :theme-mode="themeMode"
        :show-sidebar-toggle="isMobile"
        :sidebar-open="sidebarOpen"
        :demo-mode="DEMO_MODE"
        @logout="$emit('logout')"
        @change-password="$emit('change-password')"
        @toggle-theme="$emit('toggle-theme')"
        @toggle-sidebar="handleSidebarToggle"
      />

      <!-- Content -->
      <Content class="min-h-0 overflow-auto p-3 scroll-smooth sm:p-4 md:p-6">
        <div class="mx-auto max-w-7xl animate-fade-in">
          <slot></slot>
        </div>
      </Content>
    </Layout>
  </Layout>
</template>
