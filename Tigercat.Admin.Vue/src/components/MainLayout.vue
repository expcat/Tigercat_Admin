<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Layout, Content, Drawer } from '@expcat/tigercat-vue'
import MainHeader from './MainHeader.vue'
import MainSidebar from './MainSidebar.vue'
import CommandPalette from './CommandPalette.vue'
import ChatDock from './ChatDock.vue'
import ShellQuickActions from './ShellQuickActions.vue'
import OnboardingTour from './OnboardingTour.vue'
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

defineEmits<{
  (e: 'logout'): void
  (e: 'change-password'): void
  (e: 'toggle-theme'): void
}>()

const route = useRoute()
const router = useRouter()

const collapsed = ref(props.compactMode ?? false)
const isMobile = ref(false)
const sidebarOpen = ref(false)
const chatOpen = ref(false)

const activeMenu = ref<ShellPageKey>('home')

const pageTitle = computed(() => getShellPageTitle(activeMenu.value))
const breadcrumbItems = computed(() => getShellBreadcrumbItems(activeMenu.value))

const handleMenuSelect = (key: string) => {
  const menuKey = key as ShellPageKey
  const routeName = SHELL_MENU_ROUTES[menuKey]
  if (!routeName) {
    return
  }

  activeMenu.value = menuKey
  if (isMobile.value) {
    handleSidebarClose()
  }
  router.push({ name: routeName })
}

const handleSidebarToggle = () => {
  if (isMobile.value) {
    sidebarOpen.value = !sidebarOpen.value
  } else {
    collapsed.value = !collapsed.value
  }
}

const focusSidebarToggle = () => {
  nextTick(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-controls="main-sidebar"]')
      ?.focus()
  })
}

const handleDrawerOpenChange = (value: boolean) => {
  sidebarOpen.value = value
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

let mediaQuery: MediaQueryList | null = null

onMounted(() => {
  mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY)
  syncMobileState(mediaQuery.matches)
  mediaQuery.addEventListener('change', handleViewportChange)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', handleViewportChange)
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
      handleSidebarClose()
    }
  },
  { immediate: true }
)
</script>

<template>
  <Layout class="h-screen w-full overflow-hidden !flex-row">
    <!-- Sidebar -->
    <Drawer
      v-if="isMobile"
      placement="left"
      :open="sidebarOpen"
      :closable="false"
      :mask="true"
      :mask-closable="true"
      :destroy-on-close="true"
      :destroy-on-close-after-leave="true"
      :fullscreen-on-mobile="false"
      width="240px"
      :panel-style="{
        width: '240px',
        maxWidth: '240px'
      }"
      body-class-name="!p-0 h-full"
      @update:open="handleDrawerOpenChange"
      @close="handleSidebarClose"
      @after-leave="focusSidebarToggle"
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
      v-if="!isMobile"
      id="main-sidebar"
      class="relative h-full shrink-0 overflow-hidden"
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
        :show-sidebar-toggle="true"
        :sidebar-open="!isMobile ? !collapsed : sidebarOpen"
        :demo-mode="DEMO_MODE"
        @logout="$emit('logout')"
        @change-password="$emit('change-password')"
        @toggle-theme="$emit('toggle-theme')"
        @toggle-sidebar="handleSidebarToggle"
      />

      <!-- Content -->
      <Content id="main-content-scroll" class="min-h-0 overflow-auto p-3 scroll-smooth sm:p-4 md:p-6">
        <div class="mx-auto max-w-7xl animate-fade-in">
          <slot></slot>
        </div>
      </Content>
    </Layout>

    <!-- 全局 Shell 挂件 -->
    <CommandPalette
      @toggle-theme="$emit('toggle-theme')"
      @change-password="$emit('change-password')"
      @logout="$emit('logout')"
      @open-chat="chatOpen = true"
    />
    <ChatDock v-model:open="chatOpen" />
    <ShellQuickActions />
    <OnboardingTour />
  </Layout>
</template>
