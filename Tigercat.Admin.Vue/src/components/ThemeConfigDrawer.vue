<script setup lang="ts">
import { Drawer, Segmented, Switch, Text } from '@expcat/tigercat-vue'
import { ColorSwatch } from '@expcat/tigercat-vue/ColorSwatch'
import { COLOR_PRESETS } from '../utils/constants'
import type { ThemeMode, ThemePreferences } from '../utils/types'

const MODE_OPTIONS = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' },
]

const SWATCH_COLORS = COLOR_PRESETS.map((preset) => ({
  value: preset.value,
  label: preset.label,
}))

const props = defineProps<{
  open: boolean
  themePrefs: ThemePreferences
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:open', value: boolean): void
  (e: 'update-theme', prefs: ThemePreferences): void
}>()

function patchTheme(patch: Partial<ThemePreferences>) {
  emit('update-theme', { ...props.themePrefs, ...patch })
}

function handleOpenChange(value: boolean) {
  emit('update:open', value)
  if (!value) {
    emit('close')
  }
}

function focusTrigger() {
  document
    .querySelector<HTMLButtonElement>('[data-testid="shell-theme-config-trigger"]')
    ?.focus()
}
</script>

<template>
  <Drawer
    placement="right"
    :open="props.open"
    title="主题配置"
    width="360px"
    :mask="true"
    :mask-closable="true"
    @update:open="handleOpenChange"
    @close="emit('close')"
    @after-close="focusTrigger"
  >
    <div data-testid="shell-theme-config-drawer" class="space-y-6">
      <div>
        <Text weight="medium" class="mb-2 block">外观</Text>
        <Segmented
          :model-value="props.themePrefs.mode"
          :options="MODE_OPTIONS"
          block
          @update:model-value="(value: string | number) => patchTheme({ mode: String(value) as ThemeMode })"
        />
      </div>

      <div>
        <Text weight="medium" class="mb-2 block">主色</Text>
        <ColorSwatch
          :model-value="props.themePrefs.primaryColor"
          :colors="SWATCH_COLORS"
          :columns="4"
          aria-label="选择主题主色"
          @update:model-value="(value: string) => patchTheme({ primaryColor: value })"
        />
      </div>

      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <Text weight="medium" class="block">紧凑密度</Text>
          <Text size="sm" color="secondary">收紧内容区内边距，侧栏默认折叠</Text>
        </div>
        <Switch
          :model-value="props.themePrefs.compactMode"
          @update:model-value="(checked: boolean) => patchTheme({ compactMode: checked })"
        />
      </div>
    </div>
  </Drawer>
</template>
