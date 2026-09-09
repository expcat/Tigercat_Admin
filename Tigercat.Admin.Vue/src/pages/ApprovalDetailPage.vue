<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Descriptions } from '@expcat/tigercat-vue/Descriptions'
import { Empty } from '@expcat/tigercat-vue/Empty'
import { Form } from '@expcat/tigercat-vue/Form'
import { FormItem } from '@expcat/tigercat-vue/FormItem'
import { Message } from '@expcat/tigercat-vue/Message'
import { Modal } from '@expcat/tigercat-vue/Modal'
import { Select } from '@expcat/tigercat-vue/Select'
import { Text } from '@expcat/tigercat-vue/Text'
import { Textarea } from '@expcat/tigercat-vue/Textarea'
import { WorkflowViewer } from '@expcat/tigercat-vue/WorkflowViewer'
import { WorkflowActionBar, WorkflowTimeline } from '@expcat/tigercat-vue/WorkflowTimeline'
import type { DescriptionsItem, WorkflowActionBarItem } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import { ApiError } from '../utils/request'
import {
  actionSuccessMessage,
  applyApprovalAction,
  APPROVAL_STATUS_META,
  APPROVAL_TRANSFER_OPTIONS,
  APPROVAL_WORKFLOW_ACTIONS,
  fetchApproval,
  isApprovalTerminal,
  toWorkflowSteps,
} from '../utils/approvals'
import type { ApprovalAction, ApprovalDetail, ApprovalStatus } from '../utils/types'

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const missing = ref(false)
const detail = ref<ApprovalDetail | null>(null)
const acting = ref(false)
const transferOpen = ref(false)
const transferTo = ref('demo')
const transferComment = ref('')

const id = computed(() => {
  const raw = route.params.id
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ? decodeURIComponent(String(value)) : ''
})

const statusMeta = computed(() => {
  const status = detail.value?.status as ApprovalStatus | undefined
  return status ? APPROVAL_STATUS_META[status] ?? APPROVAL_STATUS_META.pending : APPROVAL_STATUS_META.pending
})

const steps = computed(() => toWorkflowSteps(detail.value))
const descriptions = computed<DescriptionsItem[]>(() =>
  (detail.value?.formFields ?? []).map((field) => ({
    label: field.label,
    content: field.value,
  })),
)
const actionsDisabled = computed(() => acting.value || isApprovalTerminal(detail.value?.status))

async function loadDetail() {
  if (!id.value) {
    missing.value = true
    detail.value = null
    return
  }
  loading.value = true
  missing.value = false
  try {
    const payload = await fetchApproval(id.value)
    detail.value = payload.data
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      missing.value = true
      detail.value = null
    } else {
      Message.error({ content: readErrorMessage(error, '审批详情加载失败'), duration: 3000 })
    }
  } finally {
    loading.value = false
  }
}

watch(id, () => {
  void loadDetail()
}, { immediate: true })

async function runAction(action: ApprovalAction, extra?: { comment?: string; transferTo?: string }) {
  if (!detail.value) return
  acting.value = true
  try {
    const payload = await applyApprovalAction(detail.value.id, {
      action,
      comment: extra?.comment,
      transferTo: extra?.transferTo,
    })
    detail.value = payload.data
    Message.success({ content: actionSuccessMessage(action), duration: 2200 })
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '审批动作失败'), duration: 3000 })
  } finally {
    acting.value = false
  }
}

function handleWorkflowAction(item: WorkflowActionBarItem) {
  if (item.action === 'transfer') {
    transferTo.value = detail.value?.assignee === 'admin' ? 'demo' : 'admin'
    transferComment.value = ''
    transferOpen.value = true
    return
  }
  if (item.action === 'approve' || item.action === 'reject') {
    void runAction(item.action)
  }
}

async function confirmTransfer() {
  const target = transferTo.value.trim()
  if (!target) {
    Message.warning({ content: '请选择转交对象', duration: 2000 })
    return
  }
  await runAction('transfer', {
    transferTo: target,
    comment: transferComment.value.trim() || undefined,
  })
  transferOpen.value = false
}
</script>

<template>
  <div class="space-y-4">
    <PageHeader
      icon="checkCircle"
      :title="detail?.title ?? '审批详情'"
      subtitle="表单 + WorkflowViewer / WorkflowTimeline + ActionBar。动作写回 mock 实例。"
      :tags="[{ label: statusMeta.label, variant: statusMeta.variant }]"
    />

    <div class="flex flex-wrap gap-2">
      <Button variant="outline" @click="router.push('/approvals')">返回列表</Button>
      <Button v-if="detail?.ticketId" variant="ghost" @click="router.push('/tickets')">
        打开关联工单 {{ detail.ticketId }}
      </Button>
    </div>

    <Empty v-if="missing" description="没有找到该审批实例" />
    <Text v-else-if="loading && !detail" color="secondary">正在加载审批详情…</Text>
    <div v-else-if="detail" class="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div class="space-y-4">
        <Card>
          <template #header><Text weight="bold">申请表单</Text></template>
          <Descriptions :items="descriptions" :column="1" />
        </Card>
        <Card>
          <template #header><Text weight="bold">审批操作</Text></template>
          <WorkflowActionBar
            :items="APPROVAL_WORKFLOW_ACTIONS"
            confirm
            :disabled="actionsDisabled"
            aria-label="审批操作"
            @action="handleWorkflowAction"
          />
          <Text size="sm" color="secondary" class="mt-2 block">
            通过 / 驳回 / 转交会写回当前实例；关联工单时同步工单状态。不接审批引擎。
          </Text>
        </Card>
      </div>
      <div class="space-y-4">
        <Card>
          <template #header><Text weight="bold">审批树</Text></template>
          <WorkflowViewer :steps="steps" />
        </Card>
        <Card>
          <template #header><Text weight="bold">审批时间线</Text></template>
          <WorkflowTimeline :steps="steps" />
        </Card>
      </div>
    </div>

    <Modal
      v-model:open="transferOpen"
      title="转交审批"
      show-default-footer
      :ok-text="acting ? '提交中…' : '确认转交'"
      cancel-text="取消"
      @ok="confirmTransfer"
    >
      <Form :label-width="96">
        <FormItem label="转交给" required>
          <Select v-model="transferTo" :options="APPROVAL_TRANSFER_OPTIONS" />
        </FormItem>
        <FormItem label="说明">
          <Textarea v-model="transferComment" :rows="3" placeholder="可选转交意见" />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>
