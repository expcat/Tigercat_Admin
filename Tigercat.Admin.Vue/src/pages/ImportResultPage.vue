<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Progress } from '@expcat/tigercat-vue/Progress'
import { Table } from '@expcat/tigercat-vue/Table'
import { Text } from '@expcat/tigercat-vue/Text'
import PageHeader from '../components/PageHeader.vue'
import { usePermission } from '../utils/permission'
import { ApiError } from '../utils/request'
import { downloadFailedRows, fetchImportJob, IMPORT_ROW_COLUMNS } from '../utils/import-jobs'
import type { ImportJob } from '../utils/types'

const route = useRoute()
const router = useRouter()
const { has } = usePermission()
const canCreate = computed(() => has('user:create'))
const job = ref<ImportJob | null>(null)
const error = ref('')
const status = ref(0)
const loading = ref(true)
let controller: AbortController | null = null
let timer: number | undefined
function loadResult() {
  controller?.abort(); window.clearTimeout(timer)
  const current = new AbortController(); controller = current
  job.value = null; error.value = ''; status.value = 0; loading.value = true
  if (!canCreate.value) { loading.value = false; return }
  const id = String(route.params.id ?? '')
  const load = async () => {
    try {
      const { data } = await fetchImportJob(id, current.signal)
      if (current.signal.aborted) return
      job.value = data; error.value = ''; loading.value = false
      if (data.status === 'pending' || data.status === 'running') timer = window.setTimeout(() => void load(), 500)
    } catch (failure) {
      if (current.signal.aborted) return
      status.value = failure instanceof ApiError ? failure.status : 0
      if (status.value === 403 || status.value === 404) job.value = null
      error.value = failure instanceof Error ? failure.message : '导入结果加载失败'; loading.value = false
    }
  }
  void load()
}
watch([() => route.params.id, canCreate], loadResult, { immediate: true })
onBeforeUnmount(() => { controller?.abort(); window.clearTimeout(timer) })
</script>

<template>
  <div class="space-y-6">
    <PageHeader icon="upload" title="导入结果" subtitle="按实际处理行数查看用户创建结果；刷新可恢复进度" :tags="[{ label: '用户 CSV', variant: 'primary' }]" />
    <div class="flex flex-wrap gap-2">
      <Button variant="outline" @click="router.push('/import')">返回数据导入</Button>
      <Button v-if="has('user:view')" variant="outline" @click="router.push('/users')">查看用户管理</Button>
    </div>
    <Alert v-if="!canCreate" type="warning" title="无权查看导入结果" description="需要 user:create 权限。" />
    <Card v-else-if="loading"><Text>正在加载导入结果…</Text></Card>
    <template v-else>
      <Alert v-if="error" type="error" :title="status === 404 ? '导入任务不存在' : status === 403 ? '无权查看导入结果' : '导入结果加载失败'" :description="error">
        <template v-if="status !== 404" #action><Button @click="loadResult">重试</Button></template>
      </Alert>
      <template v-if="job">
        <Card>
          <div class="space-y-4">
            <Text class="block break-all" weight="medium">{{ job.source }} · {{ job.id }}</Text>
            <Text class="block" aria-live="polite">{{ job.status === 'completed' ? '导入完成' : job.status === 'failed' ? '导入已中断' : '正在导入…' }} · 已处理 {{ job.processed }}/{{ job.total }} 行</Text>
            <Progress :percentage="job.progress" :status="job.status === 'failed' ? 'exception' : job.status === 'completed' ? 'success' : 'normal'" />
            <Alert :type="job.status === 'failed' ? 'error' : job.result.failed ? 'warning' : 'info'" :title="job.result.message" :description="job.status === 'failed' ? '已完成结果已保留。重新选择原 CSV 后再次导入，已有用户名将跳过。' : '追加创建用户，重复用户名跳过；错误行不会阻止其他行处理。'" />
            <Text class="block" color="secondary">失败行下载的密码列已清空，请重新填写后导入。未处理行需使用原文件重新导入。</Text>
            <Button variant="outline" :disabled="!job.rows.some(row => row.status === 'failed')" @click="downloadFailedRows(job)">下载失败行</Button>
          </div>
        </Card>
        <Card>
          <template #header><Text weight="medium">逐行结果（{{ job.total }} 行）</Text></template>
          <Table :key="String(route.params.id)" :columns="IMPORT_ROW_COLUMNS" :data-source="job.rows" row-key="rowNumber" responsive-mode="card" card-breakpoint="md" :pagination="{ pageSize: 10 }" />
        </Card>
      </template>
    </template>
  </div>
</template>
