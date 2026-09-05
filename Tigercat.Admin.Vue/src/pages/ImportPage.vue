<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Message } from '@expcat/tigercat-vue/Message'
import { Text } from '@expcat/tigercat-vue/Text'
import { FormWizard } from '@expcat/tigercat-vue/FormWizard'
import { Transfer } from '@expcat/tigercat-vue/Transfer'
import { Upload } from '@expcat/tigercat-vue/Upload'
import { Cascader } from '@expcat/tigercat-vue/Cascader'
import { Slider } from '@expcat/tigercat-vue/Slider'
import { RadioGroup } from '@expcat/tigercat-vue/RadioGroup'
import { Radio } from '@expcat/tigercat-vue/Radio'
import { Progress } from '@expcat/tigercat-vue/Progress'
import { Result } from '@expcat/tigercat-vue/Result'
import { Descriptions } from '@expcat/tigercat-vue/Descriptions'
import type {
  WizardStep,
  TransferItem,
  CascaderOption,
  CascaderModelValue,
  DescriptionsItem,
  UploadFile,
} from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'
import Icon from '../components/Icon.vue'
import { ApiError } from '../utils/request'
import {
  clearLastImportJobId,
  createImportJob,
  fetchImportJob,
  readLastImportJobId,
  writeLastImportJobId,
  type ImportConflict,
  type ImportJob,
  type ImportMode,
} from '../utils/import-jobs'

const STEPS: WizardStep[] = [
  { title: '选择数据源', description: '上传文件与模式' },
  { title: '字段映射', description: '源字段 → 目标字段' },
  { title: '参数配置', description: '批量与冲突策略' },
  { title: '确认并导入', description: '核对并执行' },
]

const SOURCE_FIELDS: TransferItem[] = [
  { key: 'name', label: '姓名' },
  { key: 'email', label: '邮箱' },
  { key: 'phone', label: '手机号' },
  { key: 'dept', label: '部门' },
  { key: 'title', label: '职位' },
  { key: 'joinedAt', label: '入职日期' },
  { key: 'note', label: '备注' },
]

const TARGET_OPTIONS: CascaderOption[] = [
  {
    value: 'hr',
    label: '人力资源',
    children: [
      { value: 'employees', label: '员工表' },
      { value: 'departments', label: '部门表' },
    ],
  },
  {
    value: 'crm',
    label: '客户管理',
    children: [
      { value: 'customers', label: '客户表' },
      { value: 'contacts', label: '联系人表' },
    ],
  },
]

const MODE_LABELS: Record<string, string> = {
  append: '追加',
  overwrite: '覆盖',
  upsert: '更新插入',
}
const CONFLICT_LABELS: Record<string, string> = {
  skip: '跳过',
  overwrite: '覆盖',
  error: '报错中止',
}

const current = ref(0)
const files = ref<UploadFile[]>([])
const mode = ref<ImportMode>('append')
const mappedKeys = ref<(string | number)[]>(['name', 'email', 'dept'])
const target = ref<CascaderModelValue>(['hr', 'employees'])
const batchSize = ref(1000)
const conflict = ref<ImportConflict>('skip')

const importing = ref(false)
const importProgress = ref(0)
const done = ref(false)
const resultMessage = ref('')
const restoring = ref(false)
let pollCancelled = false

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const targetText = computed(() => {
  if (!target.value?.length) return '未选择'
  const labels: string[] = []
  let level = TARGET_OPTIONS
  for (const v of target.value) {
    const found = level.find((o) => o.value === v)
    if (!found) break
    labels.push(found.label)
    level = found.children ?? []
  }
  return labels.join(' / ')
})

const summary = computed<DescriptionsItem[]>(() => [
  { label: '数据源', content: files.value.length ? files.value.map((f) => f.name).join('、') : '示例数据（未选择文件）' },
  { label: '导入模式', content: MODE_LABELS[mode.value] },
  { label: '目标数据表', content: targetText.value },
  { label: '映射字段', content: `${mappedKeys.value.length} 个` },
  { label: '批量大小', content: `${batchSize.value} 条 / 批` },
  { label: '冲突策略', content: CONFLICT_LABELS[conflict.value] },
])

function applyCompleted(job: ImportJob) {
  importProgress.value = job.progress
  resultMessage.value = job.result?.message ?? '导入完成'
  importing.value = false
  restoring.value = false
  done.value = true
}

async function pollImportJob(id: string) {
  while (!pollCancelled) {
    const payload = await fetchImportJob(id)
    const job = payload.data
    importProgress.value = job.progress
    if (job.status === 'completed') {
      applyCompleted(job)
      return
    }
    if (job.status === 'failed') {
      importing.value = false
      restoring.value = false
      Message.error({ content: job.result?.message || '导入失败', duration: 3000 })
      return
    }
    await new Promise((resolve) => window.setTimeout(resolve, 250))
  }
}

async function restoreLastImportJob() {
  const lastId = readLastImportJobId()
  if (!lastId) return
  restoring.value = true
  importing.value = true
  importProgress.value = 0
  try {
    const payload = await fetchImportJob(lastId)
    const job = payload.data
    if (job.status === 'completed') {
      applyCompleted(job)
      return
    }
    await pollImportJob(lastId)
  } catch (error: unknown) {
    importing.value = false
    restoring.value = false
    if (error instanceof ApiError && error.status === 404) {
      clearLastImportJobId()
      return
    }
    Message.error({ content: readErrorMessage(error, '导入任务恢复失败'), duration: 3000 })
  }
}

async function handleFinish() {
  if (!mappedKeys.value.length) {
    Message.warning({ content: '请至少映射一个字段', duration: 2200 })
    current.value = 1
    return
  }
  if (!target.value?.length) {
    Message.warning({ content: '请选择目标数据表', duration: 2200 })
    current.value = 0
    return
  }
  importing.value = true
  importProgress.value = 0
  done.value = false
  resultMessage.value = ''
  try {
    const created = await createImportJob({
      source: files.value.length ? files.value.map((f) => f.name).join('、') : '示例数据（未选择文件）',
      target: target.value.map((item) => String(item)),
      mappings: mappedKeys.value.map((item) => String(item)),
      mode: mode.value,
      conflict: conflict.value,
      batchSize: batchSize.value,
    })
    writeLastImportJobId(created.data.id)
    importProgress.value = created.data.progress
    await pollImportJob(created.data.id)
  } catch (error: unknown) {
    importing.value = false
    Message.error({ content: readErrorMessage(error, '创建导入任务失败'), duration: 3000 })
  }
}

function restart() {
  done.value = false
  importing.value = false
  restoring.value = false
  importProgress.value = 0
  resultMessage.value = ''
  current.value = 0
  clearLastImportJobId()
}

onMounted(() => {
  pollCancelled = false
  void restoreLastImportJob()
})

onBeforeUnmount(() => {
  pollCancelled = true
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="upload"
      title="数据导入"
      subtitle="分步导入向导：选择数据源、映射字段、配置参数并执行导入"
      :tags="[
        { label: '运维', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
      ]"
    />

    <Card v-if="done">
      <Result
        status="success"
        title="导入完成"
        :sub-title="resultMessage"
      >
        <div class="flex justify-center gap-2">
          <Button variant="outline" @click="restart">再次导入</Button>
          <Button @click="restart">返回列表</Button>
        </div>
      </Result>
    </Card>

    <Card v-else-if="importing">
      <div class="space-y-4 py-6">
        <div class="flex items-center gap-2">
          <Icon name="upload" :size="18" />
          <Text weight="bold">正在导入…</Text>
        </div>
        <Progress :percentage="importProgress" status="normal" />
        <MutedPanel
          compact
          :description="restoring ? '正在从上次导入任务恢复进度…' : '导入任务已提交，正在轮询进度直到完成。'"
        />
      </div>
    </Card>

    <Card v-else>
      <FormWizard
        :steps="STEPS"
        v-model:current="current"
        next-text="下一步"
        prev-text="上一步"
        finish-text="开始导入"
        @finish="handleFinish"
      >
        <template #default="{ index }">
          <div class="pt-4">
            <div v-if="index === 0" class="space-y-4">
              <div>
                <Text weight="medium" class="mb-1 block">上传文件（CSV / Excel）</Text>
                <Upload
                  v-model:file-list="files"
                  :auto-upload="false"
                  accept=".csv,.xlsx,.xls"
                  drag
                >
                  <div class="p-4 text-center text-sm text-(--tiger-text-secondary,#64748b)">
                    点击或拖拽文件到此处（演示，不会真正上传）
                  </div>
                </Upload>
              </div>
              <div>
                <Text weight="medium" class="mb-1 block">导入模式</Text>
                <RadioGroup v-model="mode">
                  <Radio value="append">追加</Radio>
                  <Radio value="overwrite">覆盖</Radio>
                  <Radio value="upsert">更新插入</Radio>
                </RadioGroup>
              </div>
              <div>
                <Text weight="medium" class="mb-1 block">目标数据表</Text>
                <Cascader v-model="target" :options="TARGET_OPTIONS" placeholder="选择目标数据表" />
              </div>
            </div>

            <div v-else-if="index === 1" class="space-y-3">
              <Text weight="medium" class="block">选择需要导入的源字段（右侧为目标字段）</Text>
              <Transfer
                v-model="mappedKeys"
                :data-source="SOURCE_FIELDS"
                source-title="源字段"
                target-title="目标字段"
                searchable
              />
              <MutedPanel compact description="将左侧源字段移动到右侧即建立映射；未映射字段将被忽略。" />
            </div>

            <div v-else-if="index === 2" class="space-y-5">
              <div>
                <Text weight="medium" class="mb-2 block">批量大小：{{ batchSize }} 条 / 批</Text>
                <Slider v-model="batchSize" :min="100" :max="5000" :step="100" />
              </div>
              <div>
                <Text weight="medium" class="mb-1 block">冲突策略</Text>
                <RadioGroup v-model="conflict">
                  <Radio value="skip">跳过</Radio>
                  <Radio value="overwrite">覆盖</Radio>
                  <Radio value="error">报错中止</Radio>
                </RadioGroup>
              </div>
            </div>

            <div v-else class="space-y-3">
              <Text weight="medium" class="block">请核对导入配置</Text>
              <Descriptions :items="summary" :column="1" bordered colon />
              <MutedPanel compact description="点击「开始导入」会创建导入任务并轮询状态，完成后展示结果页。" />
            </div>
          </div>
        </template>
      </FormWizard>
    </Card>
  </div>
</template>
