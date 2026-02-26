<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import type { Ref } from 'vue'
import { Card, Button, Input, Message, Text, Tag } from '@expcat/tigercat-vue'
import PageHeader from '../components/PageHeader.vue'
import { apiRequest } from '../utils'
import type { SettingItem, Session } from '../utils/types'

const GROUP_LABELS: Record<string, string> = {
  site: '站点设置',
  auth: '认证安全',
}

const session = inject<Ref<Session | null>>('session')!
const authHeaders = computed(() =>
  session.value?.token ? { Authorization: `Bearer ${session.value.token}` } : {}
)

const settings = ref<SettingItem[]>([])
const editValues = ref<Record<string, string>>({})
const loading = ref(true)
const saving = ref(false)

const groups = computed(() => {
  const map: Record<string, SettingItem[]> = {}
  for (const item of settings.value) {
    const prefix = item.key.split('.')[0] || 'other'
    ;(map[prefix] ??= []).push(item)
  }
  return Object.entries(map)
})

const hasChanges = computed(() =>
  settings.value.some(s => editValues.value[s.key] !== s.value)
)

async function fetchSettings() {
  try {
    loading.value = true
    const res = await apiRequest<SettingItem[]>('/api/settings', {
      headers: authHeaders.value,
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
  const entries = settings.value
    .filter(s => editValues.value[s.key] !== s.value)
    .map(s => ({ key: s.key, value: editValues.value[s.key] ?? s.value }))
  if (entries.length === 0) return

  try {
    saving.value = true
    await apiRequest<SettingItem[]>('/api/settings', {
      method: 'PUT',
      headers: authHeaders.value,
      body: JSON.stringify({ settings: entries }),
    })
    Message.success({ content: '设置已保存', duration: 3000 })
    await fetchSettings()
  } catch (e: any) {
    Message.error({ content: e.message || '保存失败', duration: 3000 })
  } finally {
    saving.value = false
  }
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
        <Card v-for="[prefix, items] in groups" :key="prefix" :title="GROUP_LABELS[prefix] ?? prefix">
          <div class="space-y-4">
            <div v-for="item in items" :key="item.key" class="space-y-1">
              <div class="flex items-center gap-2">
                <Text size="sm" weight="medium">{{ item.description ?? item.key }}</Text>
                <Tag color="blue" size="sm">{{ item.key }}</Tag>
              </div>
              <Input
                :model-value="editValues[item.key] ?? ''"
                @update:model-value="(val: string) => (editValues[item.key] = val)"
                :placeholder="`输入 ${item.key} 的值`"
              />
            </div>
          </div>
        </Card>
      </div>

      <div class="flex justify-end">
        <Button color="primary" :disabled="!hasChanges || saving" @click="handleSave">
          {{ saving ? '保存中…' : '保存修改' }}
        </Button>
      </div>
    </template>
  </div>
</template>
