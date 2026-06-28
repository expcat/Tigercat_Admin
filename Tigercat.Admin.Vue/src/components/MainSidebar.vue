<script setup lang="ts">
import { ref, computed, h, watch } from 'vue'
import { Sidebar, Menu } from '@expcat/tigercat-vue'
import type { MenuItem } from '@expcat/tigercat-core'
import Icon from './Icon.vue'
import AppLogo from './AppLogo.vue'
import { usePermission } from '../utils/permission'
import {
  SHELL_BOTTOM_MENU_ITEMS,
  SHELL_MENU_ITEMS,
  filterShellMenuItems,
  getShellExpandedKeys,
} from '../utils/shell-navigation'

const props = withDefaults(defineProps<{
  collapsed: boolean
  activeMenu: string
  showCollapseToggle?: boolean
  sidebarWidth?: string
  collapsedWidth?: string
}>(), {
  showCollapseToggle: true,
  sidebarWidth: '240px',
  collapsedWidth: '64px'
})

const emit = defineEmits<{
  (e: 'update:collapsed', value: boolean): void
  (e: 'update:activeMenu', value: string): void
  (e: 'select', key: string): void
}>()

const expandedKeys = ref<(string | number)[]>(['system'])

const handleMenuSelect = (key: string | number) => {
  const k = String(key)
  emit('update:activeMenu', k)
  emit('select', k)
}

const toggleCollapsed = () => {
  emit('update:collapsed', !props.collapsed)
}

const displayCollapsed = computed(() =>
  props.showCollapseToggle ? props.collapsed : false
)

const { has: hasPerm } = usePermission()
const filteredMenuItems = computed(() =>
  filterShellMenuItems(SHELL_MENU_ITEMS, hasPerm)
)
const filteredBottomMenuItems = computed(() =>
  filterShellMenuItems(SHELL_BOTTOM_MENU_ITEMS, hasPerm)
)

watch(
  [() => props.activeMenu, filteredMenuItems],
  ([activeMenu, items]) => {
    expandedKeys.value = getShellExpandedKeys(activeMenu, items)
  },
  { immediate: true }
)

const menuIcon = (name?: string, size = 20) => h(Icon, { name: name || 'placeholder', size })

function toMenuItems(items: typeof SHELL_MENU_ITEMS): MenuItem[] {
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    icon: menuIcon(item.icon, item.key === 'home' || item.key === 'system' || item.key === 'about' ? 20 : 18),
    children: item.children ? toMenuItems(item.children) : undefined,
  }))
}

const mainMenuItems = computed(() => toMenuItems(filteredMenuItems.value))
const bottomMenuItems = computed(() => toMenuItems(filteredBottomMenuItems.value))
</script>

<template>
  <Sidebar
    :collapsed="displayCollapsed"
    :width="props.sidebarWidth"
    :collapsed-width="props.collapsedWidth"
    class="h-full shrink-0"
  >
    <div class="flex h-full min-h-0 flex-col">
      <!-- Logo -->
      <div class="flex h-16 shrink-0 items-center justify-center border-b border-(--tiger-border,#e2e8f0) overflow-hidden">
        <div class="flex items-center gap-3">
          <AppLogo :size="36" />
          <span 
            class="overflow-hidden whitespace-nowrap font-bold text-lg text-(--tiger-text,#1f2937) tracking-wide transition-[max-width,opacity,transform] duration-300 ease-in-out"
            :class="displayCollapsed ? 'max-w-0 -translate-x-2 opacity-0 pointer-events-none' : 'max-w-32 translate-x-0 opacity-100'"
          >
            Tigercat
          </span>
        </div>
      </div>

      <!-- Menu -->
      <nav class="min-h-0 flex-1 overflow-y-auto py-2">
        <Menu
          :selected-keys="[activeMenu]"
          :open-keys="expandedKeys"
          :collapsed="false"
          mode="inline"
          :items="mainMenuItems"
          class="!min-w-0"
          :class="{ 'menu-collapsed': displayCollapsed }"
          @select="handleMenuSelect"
          @update:open-keys="(keys: (string | number)[]) => expandedKeys = keys"
        />
      </nav>

      <!-- Bottom menu -->
      <div class="shrink-0 border-t border-(--tiger-border,#e2e8f0) py-2">
        <Menu
          :selected-keys="[activeMenu]"
          :collapsed="false"
          mode="inline"
          :items="bottomMenuItems"
          class="!min-w-0"
          :class="{ 'menu-collapsed': displayCollapsed }"
          @select="handleMenuSelect"
        />
      </div>

      <!-- 折叠按钮 -->
      <div v-if="props.showCollapseToggle" class="shrink-0 border-t border-(--tiger-border,#e2e8f0) p-3 overflow-hidden">
        <button 
          @click="toggleCollapsed" 
          class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm text-(--tiger-text-secondary,#64748b) hover:bg-(--tiger-bg-hover,#f3f4f6) hover:text-(--tiger-text,#1f2937) transition-all duration-200"
        >
          <span class="shrink-0">
            <Icon :name="props.collapsed ? 'chevronRight' : 'chevronLeft'" :size="18" />
          </span>
          <span 
            class="overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-in-out"
            :class="props.collapsed ? 'max-w-0 -translate-x-2 opacity-0 pointer-events-none' : 'max-w-20 translate-x-0 opacity-100'"
          >
            收起菜单
          </span>
        </button>
      </div>
    </div>
  </Sidebar>
</template>
