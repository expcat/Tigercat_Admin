<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
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
const MOBILE_SIDEBAR_ANIMATION_MS = 300
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
const sidebarRendered = ref(false)

const activeMenu = ref<ShellPageKey>('home')

const pageTitle = computed(() => getShellPageTitle(activeMenu.value))
const breadcrumbItems = computed(() => getShellBreadcrumbItems(activeMenu.value))

const handleMenuSelect = (key: string) => {
  const menuKey = key as ShellPageKey
  activeMenu.value = menuKey
  if (isMobile.value) {
    handleSidebarClose()
  }
  router.push({ name: SHELL_MENU_ROUTES[menuKey] })
}

const handleSidebarToggle = () => {
  if (isMobile.value) {
    if (sidebarOpen.value) {
      handleSidebarClose()
    } else {
      handleSidebarOpen()
    }
  } else {
    collapsed.value = !collapsed.value
  }
}

let sidebarCloseTimer: number | null = null
let sidebarOpenFrame: number | null = null

const clearSidebarCloseTimer = () => {
  if (sidebarCloseTimer !== null) {
    window.clearTimeout(sidebarCloseTimer)
    sidebarCloseTimer = null
  }
}

const clearSidebarOpenFrame = () => {
  if (sidebarOpenFrame !== null) {
    window.cancelAnimationFrame(sidebarOpenFrame)
    sidebarOpenFrame = null
  }
}

const focusSidebarToggle = () => {
  nextTick(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-controls="main-sidebar"]')
      ?.focus()
  })
}

const handleSidebarOpen = () => {
  clearSidebarCloseTimer()
  clearSidebarOpenFrame()
  if (sidebarRendered.value) {
    sidebarOpen.value = true
    return
  }

  sidebarRendered.value = true
  nextTick(() => {
    sidebarOpenFrame = window.requestAnimationFrame(() => {
      sidebarOpen.value = true
      sidebarOpenFrame = null
    })
  })
}

const handleSidebarClose = () => {
  clearSidebarOpenFrame()
  sidebarOpen.value = false
}

const syncMobileState = (matches: boolean) => {
  clearSidebarCloseTimer()
  clearSidebarOpenFrame()
  isMobile.value = matches
  sidebarOpen.value = false
  sidebarRendered.value = false
}

const handleViewportChange = (event: MediaQueryListEvent) => {
  syncMobileState(event.matches)
}

const handleWindowKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isMobile.value && sidebarOpen.value) {
    handleSidebarClose()
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
  clearSidebarCloseTimer()
  clearSidebarOpenFrame()
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
      handleSidebarClose()
    }
  },
  { immediate: true }
)

watch(
  [isMobile, sidebarOpen, sidebarRendered],
  ([mobile, open, rendered]) => {
    clearSidebarCloseTimer()
    if (!mobile || open || !rendered) {
      return
    }

    sidebarCloseTimer = window.setTimeout(() => {
      if (!sidebarOpen.value) {
        sidebarRendered.value = false
        focusSidebarToggle()
      }
      sidebarCloseTimer = null
    }, MOBILE_SIDEBAR_ANIMATION_MS)
  }
)
</script>

<template>
  <Layout class="h-screen w-full overflow-hidden !flex-row">
    <!-- Sidebar -->
    <Drawer
      v-if="isMobile && sidebarRendered"
      placement="left"
      :open="sidebarRendered"
      :closable="false"
      :mask="true"
      :mask-closable="true"
      width="240px"
      :style="{
        maxWidth: '240px',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: `transform ${MOBILE_SIDEBAR_ANIMATION_MS}ms ease-in-out`
      }"
      body-class-name="!p-0 h-full"
      @update:open="(value) => { if (!value) handleSidebarClose() }"
      @close="handleSidebarClose"
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
      <Content class="min-h-0 overflow-auto p-3 scroll-smooth sm:p-4 md:p-6">
        <div class="mx-auto max-w-7xl animate-fade-in">
          <slot></slot>
        </div>
      </Content>
    </Layout>
  </Layout>
</template>
