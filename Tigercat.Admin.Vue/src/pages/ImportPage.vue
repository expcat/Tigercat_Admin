<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { FormWizard } from '@expcat/tigercat-vue/FormWizard'
import { Select } from '@expcat/tigercat-vue/Select'
import { Table } from '@expcat/tigercat-vue/Table'
import { Text } from '@expcat/tigercat-vue/Text'
import PageHeader from '../components/PageHeader.vue'
import { usePermission } from '../utils/permission'
import { createImportJob, EMPTY_IMPORT_MAPPINGS, IMPORT_FIELDS, IMPORT_ROW_COLUMNS, IMPORT_STEPS, previewUserImport,
  readImportFile, readLastImportJobId, writeLastImportJobId } from '../utils/import-jobs'
import type { ImportFile, ImportMappings, ImportPreview } from '../utils/types'

const router = useRouter()
const { has } = usePermission()
const canCreate = computed(() => has('user:create'))
const current = ref(0)
const narrowSteps = ref(false)
const file = ref<ImportFile | null>(null)
const preview = ref<ImportPreview | null>(null)
const mappings = ref<ImportMappings>({ ...EMPTY_IMPORT_MAPPINGS })
const busy = ref(false)
const error = ref('')
const lastId = readLastImportJobId()
const fileInput = ref<HTMLInputElement | null>(null)
const stepHeading = ref<HTMLHeadingElement | null>(null)
const mapped = computed(() => mappings.value.username !== null && mappings.value.password !== null)
const columnOptions = computed(() => [{ value: '', label: '不映射' }, ...(preview.value?.headers.map((header, index) => ({ value: index, label: `${index + 1}. ${header}` })) ?? [])])
let request: AbortController | null = null
let stepsQuery: MediaQueryList | null = null
const syncSteps = () => { narrowSteps.value = stepsQuery?.matches ?? false }
onMounted(() => { stepsQuery = window.matchMedia('(max-width: 639px)'); syncSteps(); stepsQuery.addEventListener('change', syncSteps) })
onBeforeUnmount(() => { stepsQuery?.removeEventListener('change', syncSteps); request?.abort() })
async function changeStep(value: number) { current.value = value; await nextTick(); stepHeading.value?.focus() }
async function selectFile(selected?: File) {
  if (!selected) return
  request?.abort(); const controller = new AbortController(); request = controller
  busy.value = true; error.value = ''; file.value = null; preview.value = null
  try {
    const content = await readImportFile(selected)
    if (controller.signal.aborted) return
    file.value = content
    const { data } = await previewUserImport(content, undefined, controller.signal)
    if (!controller.signal.aborted) { preview.value = data; mappings.value = data.mappings }
  } catch (failure) { if (!controller.signal.aborted) error.value = failure instanceof Error ? failure.message : 'CSV 读取失败' }
  finally { if (!controller.signal.aborted) busy.value = false }
}
function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0]; input.value = ''; void selectFile(selected)
}
function updateMapping(key: keyof ImportMappings, value: unknown) {
  mappings.value = { ...mappings.value, [key]: value === '' || value === null ? null : Number(value) }; error.value = ''
}
async function handleNext() {
  if (busy.value || !file.value || !preview.value) return
  if (current.value === 0) { void changeStep(1); return }
  if (!mapped.value) { error.value = '请映射用户名和密码必填列'; return }
  const controller = new AbortController(); request = controller; busy.value = true; error.value = ''
  try {
    const { data } = await previewUserImport(file.value, mappings.value, controller.signal)
    if (!controller.signal.aborted) { preview.value = data; await changeStep(2) }
  } catch (failure) { if (!controller.signal.aborted) error.value = failure instanceof Error ? failure.message : '预览校验失败' }
  finally { if (!controller.signal.aborted) busy.value = false }
}
async function handleFinish() {
  if (busy.value || !file.value || !mapped.value) return
  const controller = new AbortController(); request = controller; busy.value = true; error.value = ''
  try {
    const { data } = await createImportJob(file.value, mappings.value, controller.signal)
    if (controller.signal.aborted) return
    writeLastImportJobId(data.id); file.value = null; await router.push(`/import/${encodeURIComponent(data.id)}`)
  } catch (failure) { if (!controller.signal.aborted) error.value = failure instanceof Error ? failure.message : '创建导入任务失败' }
  finally { if (!controller.signal.aborted) busy.value = false }
}
async function cancelImport() {
  request?.abort(); busy.value = false; file.value = null; preview.value = null; mappings.value = { ...EMPTY_IMPORT_MAPPINGS }; current.value = 0; error.value = ''
  await nextTick(); if (fileInput.value) { fileInput.value.value = ''; fileInput.value.focus() }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader icon="upload" title="数据导入" subtitle="读取用户 CSV、映射字段、校验并实际创建用户" :tags="[{ label: '用户 CSV', variant: 'primary' }]" />
    <Alert v-if="!canCreate" type="warning" title="无权导入用户" description="需要 user:create 权限。" />
    <template v-else>
      <Button v-if="lastId" variant="outline" @click="router.push(`/import/${encodeURIComponent(lastId)}`)">查看最近导入结果</Button>
      <Card>
        <Alert v-if="error" type="error" title="导入未提交" :description="error" />
        <fieldset :disabled="busy" class="min-w-0">
          <FormWizard :steps="IMPORT_STEPS" :current="current" :orientation="narrowSteps ? 'vertical' : 'horizontal'" :show-actions="false">
            <template #default>
              <div class="space-y-4 pt-4">
                <h2 ref="stepHeading" tabindex="-1" class="text-base font-medium">{{ IMPORT_STEPS[current].title }}</h2>
                <template v-if="current === 0">
                  <label class="block space-y-2"><span>选择 UTF-8 CSV 文件</span><input ref="fileInput" type="file" accept=".csv,text/csv" class="block max-w-full text-sm" :disabled="busy" @change="onFileChange" /></label>
                  <Text class="block" color="secondary">最多 1 MiB / 1000 行。首行为列名；支持 BOM、引号、逗号和字段内换行。</Text>
                  <Text class="block">目标：用户。追加创建，重复用户名跳过；新用户默认启用。</Text>
                  <Text class="block" color="secondary">支持 username、password、displayName、roleIds（多个角色 ID 用分号分隔）。状态与头像不参与导入。</Text>
                  <Text v-if="file" class="block break-all">已读取：{{ file.source }}{{ preview ? `，${preview.total} 行` : '' }}</Text>
                </template>
                <template v-else-if="current === 1">
                  <Text class="block" color="secondary">选择每个用户字段对应的 CSV 列。未映射列会忽略，密码仅用于校验和创建。</Text>
                  <div class="grid gap-4 sm:grid-cols-2">
                    <label v-for="field in IMPORT_FIELDS" :key="field.key" class="block min-w-0 space-y-1"><span>{{ field.label }}</span>
                      <Select :model-value="mappings[field.key] ?? ''" :aria-label="field.label" :options="columnOptions" @update:model-value="updateMapping(field.key, $event)" />
                    </label>
                  </div>
                </template>
                <template v-else-if="preview">
                  <Text class="block break-all">{{ file?.source }} · 共 {{ preview.total }} 行</Text>
                  <Alert :type="preview.failed ? 'warning' : 'info'" :title="`校验通过 ${preview.valid}，跳过 ${preview.skipped}，失败 ${preview.failed}`" :description="`${preview.passwordHint}。合法行会创建用户；错误行不会阻止其他行处理，提交时重新校验。`" />
                  <Table :columns="IMPORT_ROW_COLUMNS" :data-source="preview.rows" row-key="rowNumber" responsive-mode="card" card-breakpoint="md" :pagination="{ pageSize: 10 }" />
                  <Text class="block" color="secondary">预览和结果均不显示密码。导入后可下载失败行，密码列会清空，需要重新填写。</Text>
                </template>
              </div>
            </template>
          </FormWizard>
        </fieldset>
        <div class="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" :disabled="busy" @click="cancelImport">取消导入</Button>
          <Button v-if="current > 0" variant="outline" :disabled="busy" @click="error = ''; changeStep(current - 1)">上一步</Button>
          <Button v-if="current < 2" :disabled="busy || !preview || current === 1 && !mapped" @click="handleNext">{{ busy ? '正在读取…' : current === 1 ? '校验并预览' : '下一步' }}</Button>
          <Button v-else :loading="busy" :disabled="busy || !preview?.total" @click="handleFinish">开始导入</Button>
        </div>
      </Card>
    </template>
  </div>
</template>
