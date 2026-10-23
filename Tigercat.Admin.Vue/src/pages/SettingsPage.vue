<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Input } from '@expcat/tigercat-vue/Input'
import { InputNumber } from '@expcat/tigercat-vue/InputNumber'
import { Message } from '@expcat/tigercat-vue/Message'
import { Modal } from '@expcat/tigercat-vue/Modal'
import { Popconfirm } from '@expcat/tigercat-vue/Popconfirm'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { Select } from '@expcat/tigercat-vue/Select'
import { Switch } from '@expcat/tigercat-vue/Switch'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { ColorPicker } from '@expcat/tigercat-vue/ColorPicker'
import { Collapse } from '@expcat/tigercat-vue/Collapse'
import { CollapsePanel } from '@expcat/tigercat-vue/CollapsePanel'
import { Skeleton } from '@expcat/tigercat-vue/Skeleton'
import PageHeader from '../components/PageHeader.vue'
import AppLogo from '../components/AppLogo.vue'
import { apiRequest, getAuthHeaders } from '../utils'
import { usePermission } from '../utils/permission'
import { SETTINGS_GROUP_LABELS, getColorPresets, getControl, getControlOptions, groupSettings } from '../utils/settings'
import type { SettingItem } from '../utils/types'
import { uploadMediaFile } from '../utils/media'
import { WATERMARK_SETTING_KEY, useWatermarkEnabled } from '../utils/watermark'

/* ── 状态 ────────────────────────────────────── */
const settings = ref<SettingItem[]>([])
const editValues = ref<Record<string, string>>({})
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const saveConfirmOpen = ref(false)
const logoUploading = ref(false)
const logoInputRef = ref<HTMLInputElement | null>(null)
let logoUploadController: AbortController | null = null
onBeforeUnmount(() => logoUploadController?.abort())
const openSettingGroups = ref<(string | number)[]>(Object.keys(SETTINGS_GROUP_LABELS))
const { has: hasPerm } = usePermission()
const { watermarkEnabled, setWatermarkEnabled } = useWatermarkEnabled()
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
const savedLogoUrl = computed(() => settings.value.find(item => item.key === 'site.logo')?.value || '')

/* ── API 操作 ────────────────────────────────── */
async function fetchSettings() {
  try {
    loading.value = true
    loadError.value = ''
    const res = await apiRequest<SettingItem[]>('/api/settings', {
      headers: getAuthHeaders(),
    })
    settings.value = res.data
    const values: Record<string, string> = {}
    for (const s of res.data) values[s.key] = s.value
    editValues.value = values
  } catch (e: any) {
    loadError.value = e.message || '加载设置失败'
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
    const res = await apiRequest<SettingItem[]>('/api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ settings: entries }),
    })
    const updated = settings.value.map(item => res.data.find(value => value.key === item.key) ?? item)
    settings.value = updated
    editValues.value = Object.fromEntries(updated.map(item => [item.key, item.value]))
    saveConfirmOpen.value = false
    Message.success({ content: '设置已保存', duration: 3000 })
  } catch (e: any) {
    Message.error({ content: e.message || '保存失败', duration: 3000 })
    return false
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

async function handleLogoUpload(file: File) {
  if (!canEdit.value || logoUploadController) return
  if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
    Message.warning({ content: '请选择不超过 2 MB 的图片', duration: 3000 })
    return
  }
  const controller = new AbortController()
  logoUploadController = controller
  logoUploading.value = true
  try {
    const media = await uploadMediaFile(file, 'logo', controller.signal)
    if (controller.signal.aborted) return
    editValues.value = { ...editValues.value, 'site.logo': media.url }
    Message.success({ content: 'Logo 已上传，请保存设置以持久化引用', duration: 3000 })
  } catch (e: any) {
    if (!controller.signal.aborted) Message.error({ content: e.message || 'Logo 上传失败', duration: 3000 })
  } finally {
    if (logoUploadController === controller) {
      logoUploadController = null
      if (!controller.signal.aborted) logoUploading.value = false
    }
  }
}

function cancelLogoUpload() {
  logoUploadController?.abort()
  logoUploadController = null
  logoUploading.value = false
  requestAnimationFrame(() => document.getElementById('logo-upload-select')?.focus())
}

function handleLogoInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) void handleLogoUpload(file)
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
watch(groups, (nextGroups) => {
  for (const [prefix] of nextGroups) {
    if (!openSettingGroups.value.includes(prefix)) {
      openSettingGroups.value = [...openSettingGroups.value, prefix]
    }
  }
})

watch(targetSettingKey, (key) => {
  if (!key) return
  const prefix = key.split('.')[0]
  if (!openSettingGroups.value.includes(prefix)) {
    openSettingGroups.value = [...openSettingGroups.value, prefix]
  }
})

watch([targetSettingKey, loading], scrollToTargetSetting)

function handleSettingGroupsChange(keys: (string | number)[]) {
  openSettingGroups.value = keys
}
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
      <div class="space-y-3">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="button" />
      </div>
    </Card>

    <Card v-else-if="loadError">
      <div role="alert" class="flex flex-wrap items-center justify-between gap-3">
        <span>{{ loadError }}</span>
        <Button variant="outline" @click="fetchSettings">重试加载设置</Button>
      </div>
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

            <div class="flex flex-wrap items-center gap-3">
              <Button id="logo-upload-select" variant="outline" :disabled="!canEdit || logoUploading || saving" @click="logoInputRef?.click()">
                {{ logoUploading ? '正在上传…' : '选择 Logo 图片' }}
              </Button>
              <input ref="logoInputRef" type="file" accept="image/*" class="hidden" @change="handleLogoInputChange" />
              <Button v-if="logoUploading" variant="outline" @click="cancelLogoUpload">取消上传</Button>
              <Text size="sm" color="secondary">图片不超过 2 MB</Text>
            </div>

            <div class="p2-muted-panel space-y-1 break-all px-4 py-3 text-sm">
              <p>当前表单值：{{ currentLogoUrl || '未设置' }}</p>
              <p>当前持久化值：{{ savedLogoUrl || '未设置' }}</p>
            </div>
          </div>

          <div class="p2-muted-panel flex items-center p-5 text-sm">
            Logo 媒体被设置引用后，文件管理页会阻止直接删除；恢复默认值并保存后会解除引用。
          </div>
        </div>
      </Card>

      <Card title="内容水印">
        <div
          :id="`setting-${WATERMARK_SETTING_KEY}`"
          data-testid="setting-theme-watermark"
          :class="[
            'flex flex-col gap-3 rounded-md p-2 sm:flex-row sm:items-center sm:justify-between',
            targetSettingKey === WATERMARK_SETTING_KEY ? 'ring-2 ring-(--tiger-color-primary,#2563eb)' : ''
          ]"
        >
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <Text size="sm" weight="medium">全局内容水印</Text>
              <Tag :variant="targetSettingKey === WATERMARK_SETTING_KEY ? 'warning' : 'primary'" size="sm">
                {{ WATERMARK_SETTING_KEY }}
              </Tag>
            </div>
            <Text size="sm" color="secondary">
              在内容区（含多标签条）叠加当前用户名与日期。立即生效，保存在本机；不影响内容页草稿水印演示。
            </Text>
          </div>
          <Switch
            aria-label="全局内容水印"
            :model-value="watermarkEnabled"
            data-testid="setting-theme-watermark-switch"
            @update:model-value="(val: boolean) => setWatermarkEnabled(val)"
          />
        </div>
      </Card>

      <Collapse
        :accordion="false"
        :active-key="openSettingGroups"
        @update:active-key="handleSettingGroupsChange"
      >
        <CollapsePanel
          v-for="[prefix, items] in groups"
          :key="prefix"
          :panel-key="prefix"
          :header="SETTINGS_GROUP_LABELS[prefix] ?? prefix"
        >
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
                :aria-label="item.description ?? item.key"
                :model-value="editValues[item.key] === 'true'"
                @update:model-value="(val: boolean) => (editValues[item.key] = String(val))"
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
        </CollapsePanel>
      </Collapse>

      <div v-if="canEdit" class="flex flex-col justify-end gap-3 sm:flex-row sm:flex-wrap">
        <Popconfirm
          title="恢复默认值"
          description="会将当前表单恢复为系统默认配置，提交后才会真正生效。"
          ok-text="恢复默认值"
          cancel-text="取消"
          placement="top"
          @confirm="handleRestoreDefaults"
        >
          <Button variant="outline" :disabled="!hasDefaultOverrides || saving || logoUploading">
            恢复默认值
          </Button>
        </Popconfirm>
        <Button variant="primary" :disabled="!hasChanges || saving || logoUploading" @click="saveConfirmOpen = true">
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
