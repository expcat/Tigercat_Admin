<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Affix } from '@expcat/tigercat-vue/Affix'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Descriptions } from '@expcat/tigercat-vue/Descriptions'
import { Empty } from '@expcat/tigercat-vue/Empty'
import { Form } from '@expcat/tigercat-vue/Form'
import { FormItem } from '@expcat/tigercat-vue/FormItem'
import { Message } from '@expcat/tigercat-vue/Message'
import { Modal } from '@expcat/tigercat-vue/Modal'
import { Select } from '@expcat/tigercat-vue/Select'
import { TabPane } from '@expcat/tigercat-vue/TabPane'
import { Tabs } from '@expcat/tigercat-vue/Tabs'
import { Text } from '@expcat/tigercat-vue/Text'
import { Textarea } from '@expcat/tigercat-vue/Textarea'
import { WorkflowViewer } from '@expcat/tigercat-vue/WorkflowViewer'
import { WorkflowActionBar, WorkflowTimeline } from '@expcat/tigercat-vue/WorkflowTimeline'
import type { DescriptionsItem, WorkflowActionBarItem, WorkflowActionPayload } from '@expcat/tigercat-core'
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
const activeTab = ref('progress')

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
  activeTab.value = 'progress'
  void loadDetail()
}, { immediate: true })

function handleTabChange(key: string | number) {
  activeTab.value = String(key)
}

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

function handleWorkflowAction(item: WorkflowActionBarItem, payload?: WorkflowActionPayload) {
  if (item.action === 'transfer') {
    transferTo.value = detail.value?.assignee === 'admin' ? 'demo' : 'admin'
    transferComment.value = ''
    transferOpen.value = true
    return
  }
  if (item.action === 'approve' || item.action === 'reject') {
    const comment = payload?.comment?.trim()
    void runAction(item.action, { comment: comment || undefined })
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
  <div class="min-w-0 space-y-4">
    <PageHeader
      icon="checkCircle"
      :title="detail?.title ?? '审批详情'"
      subtitle="表单 + 审批进度 Timeline / 流程结构 Viewer + 底栏 ActionBar。动作写回 mock 实例。"
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
    <div v-else-if="detail" class="min-w-0 space-y-4">
      <Card class="min-w-0">
        <template #header><Text weight="bold">申请表单</Text></template>
        <Descriptions :items="descriptions" :column="1" />
      </Card>
      <Card class="min-w-0">
        <Tabs :active-key="activeTab" @update:active-key="handleTabChange">
          <TabPane tab-key="progress" label="审批进度">
            <div class="min-w-0 overflow-x-auto">
              <WorkflowTimeline :steps="steps" />
            </div>
          </TabPane>
          <TabPane tab-key="structure" label="流程结构">
            <div class="min-w-0 overflow-x-auto">
              <WorkflowViewer :steps="steps" />
            </div>
          </TabPane>
        </Tabs>
      </Card>
      <Affix target="#main-content-scroll" :offset-bottom="0" :z-index="20">
        <Card class="min-w-0">
          <div class="min-w-0">
            <WorkflowActionBar
              :items="APPROVAL_WORKFLOW_ACTIONS"
              confirm
              :disabled="actionsDisabled"
              aria-label="审批操作"
              @action="handleWorkflowAction"
            />
          </div>
          <Text size="sm" color="secondary" class="mt-2 block">
            同意 / 拒绝 / 转交会写回当前实例；关联工单时同步工单状态。不接审批引擎。
          </Text>
        </Card>
      </Affix>
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
