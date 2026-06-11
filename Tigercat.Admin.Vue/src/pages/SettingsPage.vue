<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Card, Button, Input, InputNumber, Modal, Popconfirm, Select, Segmented, Switch, Message, Text, Tag } from '@expcat/tigercat-vue'
import { ColorPicker } from '@expcat/tigercat-vue/ColorPicker'
import { Upload } from '@expcat/tigercat-vue/Upload'
import type { UploadRequestOptions } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import AppLogo from '../components/AppLogo.vue'
import { apiRequest, getAuthHeaders } from '../utils'
import { usePermission } from '../utils/permission'
import { SETTINGS_GROUP_LABELS, getColorPresets, getControl, getControlOptions, groupSettings } from '../utils/settings'
import type { SettingItem } from '../utils/types'
import { uploadMediaFile } from '../utils/media'

/* ── 状态 ────────────────────────────────────── */
const settings = ref<SettingItem[]>([])
const editValues = ref<Record<string, string>>({})
const loading = ref(true)
const saving = ref(false)
const saveConfirmOpen = ref(false)
const { has: hasPerm } = usePermission()
const route = useRoute()
const canEdit = computed(() => hasPerm('setting:edit'))
const targetSettingKey = computed(() => typeof route.query.key === 'string' ? route.query.key : '')
const groups = computed(() => groupSettings(settings.value))
const changedSettings = computed(() =>
  settings.value.filter(s => editValues.value[s.key] !== s.value)
)
const hasChanges = computed(() => changedSettings.value.length > 0)
const hasDefaultOverrides = computed(() =>
  settings.value.some(s => editValues.value[s.key] !== s.defaultValue)
)
const currentLogoUrl = computed(() => editValues.value['site.logo'] || '')

/* ── API 操作 ────────────────────────────────── */
async function fetchSettings() {
  try {
    loading.value = true
    const res = await apiRequest<SettingItem[]>('/api/settings', {
      headers: getAuthHeaders(),
    })
    settings.value = res.data
    const values: Record<string, string> = {}
    for (const s of res.data) values[s.key] = s.value
    editValues.value = values
  } catch (e: any) {
    Message.error({ content: e.message || '加载设置失败', duration: 3000 })
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!canEdit.value) return
  const entries = changedSettings.value
    .map(s => ({ key: s.key, value: editValues.value[s.key] ?? s.value }))
  if (entries.length === 0) return
  try {
    saving.value = true
    await apiRequest<SettingItem[]>('/api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ settings: entries }),
    })
    saveConfirmOpen.value = false
    Message.success({ content: '设置已保存', duration: 3000 })
    await fetchSettings()
  } catch (e: any) {
    Message.error({ content: e.message || '保存失败', duration: 3000 })
  } finally {
    saving.value = false
  }
}

function handleRestoreDefaults() {
  editValues.value = Object.fromEntries(
    settings.value.map((item) => [item.key, item.defaultValue])
  )
  Message.success({ content: '已恢复默认值，请确认保存修改', duration: 3000 })
}

async function handleLogoUpload(options: UploadRequestOptions) {
  try {
    options.onProgress?.(20)
    const media = await uploadMediaFile(options.file, 'logo')
    options.onProgress?.(100)
    options.onSuccess?.(media)
    editValues.value = { ...editValues.value, 'site.logo': media.url }
    Message.success({ content: 'Logo 已上传，请保存设置以持久化引用', duration: 3000 })
  } catch (e: any) {
    options.onError?.(e)
    Message.error({ content: e.message || 'Logo 上传失败', duration: 3000 })
  }
}

function scrollToTargetSetting() {
  if (!targetSettingKey.value || loading.value) return
  window.setTimeout(() => {
    document
      .getElementById(`setting-${targetSettingKey.value}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, 0)
}

onMounted(async () => {
  await fetchSettings()
  scrollToTargetSetting()
})
watch([targetSettingKey, loading], scrollToTargetSetting)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="系统设置"
      subtitle="管理系统基础配置与安全策略"
      icon="settings"
      :tags="[{ label: '配置中心', variant: 'primary' }]"
    />

    <Card v-if="loading">
      <Text color="secondary">加载中…</Text>
    </Card>

    <template v-else>
      <Card title="站点 Logo" class="overflow-hidden">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div class="space-y-4 rounded-lg border border-dashed border-(--tiger-border,#e2e8f0) p-4 sm:p-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <Text weight="bold">站点 Logo</Text>
                <Text size="sm" color="secondary">
                  上传后会写入 site.logo 表单值，保存设置后建立媒体引用。
                </Text>
              </div>
              <Tag variant="primary" size="sm">Media</Tag>
            </div>

            <div class="flex min-h-44 items-center justify-center rounded-lg bg-(--tiger-bg-hover,#f8fafc) p-4 sm:p-6">
              <img
                v-if="currentLogoUrl"
                :src="currentLogoUrl"
                alt="站点 Logo 预览"
                class="max-h-28 max-w-full rounded-lg object-contain"
              />
              <div v-else class="p2-text-secondary flex flex-col items-center gap-3 text-center">
                <AppLogo :size="56" />
                <Text size="sm" color="secondary">暂无 Logo，上传后会在这里显示本地预览</Text>
              </div>
            </div>

            <Upload
              accept="image/*"
              :disabled="!canEdit"
              list-type="picture-card"
              :show-file-list="false"
              :max-size="2 * 1024 * 1024"
              :custom-request="handleLogoUpload"
            />

            <div class="p2-muted-panel px-4 py-3 text-sm">
              当前持久化值：{{ editValues['site.logo'] || '未设置' }}
            </div>
          </div>

          <div class="p2-muted-panel flex items-center p-5 text-sm">
            Logo 媒体被设置引用后，文件管理页会阻止直接删除；恢复默认值并保存后会解除引用。
          </div>
        </div>
      </Card>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card v-for="[prefix, items] in groups" :key="prefix" :title="SETTINGS_GROUP_LABELS[prefix] ?? prefix">
          <div class="space-y-4">
            <div
              v-for="item in items"
              :key="item.key"
              :id="`setting-${item.key}`"
              :class="[
                'space-y-1 rounded-md p-2',
                targetSettingKey === item.key ? 'ring-2 ring-(--tiger-color-primary,#2563eb)' : ''
              ]"
            >
              <div class="flex items-center gap-2">
                <Text size="sm" weight="medium">{{ item.description ?? item.key }}</Text>
                <Tag :variant="targetSettingKey === item.key ? 'warning' : 'primary'" size="sm">{{ item.key }}</Tag>
              </div>

              <Switch
                v-if="getControl(item.key).type === 'switch'"
                :checked="editValues[item.key] === 'true'"
                @update:checked="(val: boolean) => (editValues[item.key] = String(val))"
                :disabled="!canEdit"
              />
              <Select
                v-else-if="getControl(item.key).type === 'select'"
                :model-value="editValues[item.key] ?? ''"
                :options="getControlOptions(item.key)"
                @update:model-value="(val: string) => (editValues[item.key] = String(val))"
                :placeholder="`选择 ${item.description ?? item.key}`"
                :disabled="!canEdit"
                :clearable="false"
              />
              <Segmented
                v-else-if="getControl(item.key).type === 'segmented'"
                :model-value="editValues[item.key] ?? ''"
                :options="getControlOptions(item.key)"
                @update:model-value="(val: string | number) => (editValues[item.key] = String(val))"
                :disabled="!canEdit"
                block
              />
              <ColorPicker
                v-else-if="getControl(item.key).type === 'color'"
                :model-value="editValues[item.key] || '#2563eb'"
                :presets="getColorPresets(item.key)"
                @update:model-value="(val: string) => (editValues[item.key] = val)"
                :disabled="!canEdit"
              />
              <InputNumber
                v-else-if="getControl(item.key).type === 'number'"
                :model-value="Number(editValues[item.key]) || 0"
                @update:model-value="(val: number | null) => (editValues[item.key] = String(val ?? 0))"
                :min="(getControl(item.key) as any).min"
                :max="(getControl(item.key) as any).max"
                :step="(getControl(item.key) as any).step"
                :disabled="!canEdit"
              />
              <Input
                v-else
                :model-value="editValues[item.key] ?? ''"
                @update:model-value="(val: string) => (editValues[item.key] = val)"
                :placeholder="`输入 ${item.key} 的值`"
                :disabled="!canEdit"
              />
            </div>
          </div>
        </Card>
      </div>

      <div v-if="canEdit" class="flex flex-col justify-end gap-3 sm:flex-row sm:flex-wrap">
        <Popconfirm
          title="恢复默认值"
          description="会将当前表单恢复为系统默认配置，提交后才会真正生效。"
          ok-text="恢复默认值"
          cancel-text="取消"
          placement="top"
          @confirm="handleRestoreDefaults"
        >
          <Button variant="outline" :disabled="!hasDefaultOverrides || saving">
            恢复默认值
          </Button>
        </Popconfirm>
        <Button color="primary" :disabled="!hasChanges || saving" @click="saveConfirmOpen = true">
          {{ saving ? '保存中…' : '保存修改' }}
        </Button>
      </div>

      <Modal
        v-model:open="saveConfirmOpen"
        title="确认保存设置"
        show-default-footer
        :ok-text="saving ? '保存中…' : '确认保存'"
        cancel-text="取消"
        @ok="handleSave"
        @cancel="saveConfirmOpen = false"
      >
        <div class="p2-modal-scroll space-y-4">
          <Text>
            将提交 {{ changedSettings.length }} 项设置变更。保存后会立即影响当前系统配置。
          </Text>
          <div class="flex flex-wrap gap-2">
            <Tag v-for="item in changedSettings" :key="item.key" variant="primary" size="sm">
              {{ item.key }}
            </Tag>
          </div>
        </div>
      </Modal>
    </template>
  </div>
</template>
