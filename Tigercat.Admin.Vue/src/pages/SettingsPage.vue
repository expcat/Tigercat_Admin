<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Card, Button, ColorPicker, Input, InputNumber, Modal, Popconfirm, Select, Segmented, Switch, Message, Text, Tag } from '@expcat/tigercat-vue'
import PageHeader from '../components/PageHeader.vue'
import { apiRequest, getAuthHeaders } from '../utils'
import { usePermission } from '../utils/permission'
import { SETTINGS_GROUP_LABELS, getColorPresets, getControl, getControlOptions, groupSettings } from '../utils/settings'
import type { SettingItem } from '../utils/types'

/* ── 状态 ────────────────────────────────────── */
const settings = ref<SettingItem[]>([])
const editValues = ref<Record<string, string>>({})
const loading = ref(true)
const saving = ref(false)
const saveConfirmOpen = ref(false)
const { has: hasPerm } = usePermission()
const canEdit = computed(() => hasPerm('setting:edit'))
const groups = computed(() => groupSettings(settings.value))
const changedSettings = computed(() =>
  settings.value.filter(s => editValues.value[s.key] !== s.value)
)
const hasChanges = computed(() => changedSettings.value.length > 0)
const hasDefaultOverrides = computed(() =>
  settings.value.some(s => editValues.value[s.key] !== s.defaultValue)
)

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

onMounted(fetchSettings)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="系统设置"
      subtitle="管理系统基础配置与安全策略"
      icon="settings"
      :tags="[{ label: '配置中心', color: 'blue' }]"
    />

    <Card v-if="loading">
      <Text color="secondary">加载中…</Text>
    </Card>

    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card v-for="[prefix, items] in groups" :key="prefix" :title="SETTINGS_GROUP_LABELS[prefix] ?? prefix">
          <div class="space-y-4">
            <div v-for="item in items" :key="item.key" class="space-y-1">
              <div class="flex items-center gap-2">
                <Text size="sm" weight="medium">{{ item.description ?? item.key }}</Text>
                <Tag color="blue" size="sm">{{ item.key }}</Tag>
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

      <div v-if="canEdit" class="flex flex-wrap justify-end gap-3">
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
        :open="saveConfirmOpen"
        title="确认保存设置"
        :ok-text="saving ? '保存中…' : '确认保存'"
        cancel-text="取消"
        @ok="handleSave"
        @cancel="saveConfirmOpen = false"
        @update:open="saveConfirmOpen = $event"
      >
        <div class="space-y-4">
          <Text>
            将提交 {{ changedSettings.length }} 项设置变更。保存后会立即影响当前系统配置。
          </Text>
          <div class="flex flex-wrap gap-2">
            <Tag v-for="item in changedSettings" :key="item.key" color="blue" size="sm">
              {{ item.key }}
            </Tag>
          </div>
        </div>
      </Modal>
    </template>
  </div>
</template>
