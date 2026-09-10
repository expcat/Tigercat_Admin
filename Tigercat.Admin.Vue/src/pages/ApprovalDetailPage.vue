<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { applyWorkflowFieldPermissions } from '@expcat/tigercat-core'
import { Button } from '@expcat/tigercat-vue/Button'
import { Empty } from '@expcat/tigercat-vue/Empty'
import { Form } from '@expcat/tigercat-vue/Form'
import { FormItem } from '@expcat/tigercat-vue/FormItem'
import { Message } from '@expcat/tigercat-vue/Message'
import { Modal } from '@expcat/tigercat-vue/Modal'
import { Radio } from '@expcat/tigercat-vue/Radio'
import { RadioGroup } from '@expcat/tigercat-vue/RadioGroup'
import { SchemaForm } from '@expcat/tigercat-vue/SchemaForm'
import { TabPane } from '@expcat/tigercat-vue/TabPane'
import { Tabs } from '@expcat/tigercat-vue/Tabs'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Textarea } from '@expcat/tigercat-vue/Textarea'
import { WorkflowDetailShell } from '@expcat/tigercat-vue/WorkflowDetailShell'
import { WorkflowViewer } from '@expcat/tigercat-vue/WorkflowViewer'
import { WorkflowActionBar, WorkflowTimeline } from '@expcat/tigercat-vue/WorkflowTimeline'
import type {
  FieldPermission,
  FormValues,
  WorkflowActionBarItem,
  WorkflowActionPayload,
  WorkflowAssigneePickerContext,
  WorkflowTask,
} from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import ApprovalActorSwitcher from '../components/ApprovalActorSwitcher.vue'
import { ApiError } from '../utils/request'
import {
  actionSuccessMessage,
  applyApprovalAction,
  APPROVAL_DEMO_ACTOR_EVENT,
  APPROVAL_DETAIL_SCHEMA,
  APPROVAL_STATUS_META,
  actorHasOpenTask,
  approvalButtonPolicy,
  approvalFieldMode,
  approvalFormModel,
  approvalIsStarter,
  approvalReturnTargets,
  approvalViewerRole,
  contactActorOf,
  currentApprovalStep,
  FALLBACK_APPROVAL_CONTACTS,
  fetchApproval,
  fetchApprovalContacts,
  getApprovalDemoActor,
  isApprovalTerminal,
  toWorkflowSteps,
  workflowActionToPayload,
} from '../utils/approvals'
import type { ApprovalAction, ApprovalContactUser, ApprovalDetail, ApprovalStatus } from '../utils/types'

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const missing = ref(false)
const detail = ref<ApprovalDetail | null>(null)
const acting = ref(false)
const activeTab = ref('progress')
const actorId = ref(getApprovalDemoActor())
const contacts = ref<ApprovalContactUser[]>(FALLBACK_APPROVAL_CONTACTS)
const formModel = ref<FormValues>({})
const commentOpen = ref(false)
const commentDraft = ref('')

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
const workflowTasks = computed(() => detail.value?.tasks as WorkflowTask[] | undefined)
const currentStep = computed(() => currentApprovalStep(detail.value))
const fieldMode = computed(() => approvalFieldMode(detail.value, actorId.value))
const formSchema = computed(() =>
  applyWorkflowFieldPermissions(
    APPROVAL_DETAIL_SCHEMA,
    currentStep.value?.fieldPermissions as Record<string, FieldPermission> | undefined,
    fieldMode.value,
  ),
)
const actionsDisabled = computed(() => acting.value || isApprovalTerminal(detail.value?.status))
const viewerRole = computed(() => approvalViewerRole(detail.value, actorId.value))
const isStarter = computed(() => approvalIsStarter(detail.value, actorId.value))
const buttonPolicy = computed(() => approvalButtonPolicy(detail.value))
const returnTargets = computed(() => approvalReturnTargets(detail.value))
const currentSignMode = computed(() =>
  currentStep.value?.signMode === 'countersign' || currentStep.value?.signMode === 'orsign'
    ? currentStep.value.signMode
    : 'sequential',
)
const pickerContacts = computed(() =>
  contacts.value.filter((user) => user.id !== actorId.value && user.username !== actorId.value),
)
const canAct = computed(() => actorHasOpenTask(detail.value, actorId.value) || (currentStep.value?.kind === 'start' && isStarter.value))

async function loadContacts() {
  try {
    const payload = await fetchApprovalContacts()
    if (payload.data.users?.length) contacts.value = payload.data.users
  } catch {
    contacts.value = FALLBACK_APPROVAL_CONTACTS
  }
}

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
    formModel.value = approvalFormModel(payload.data)
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

function syncActor() {
  actorId.value = getApprovalDemoActor()
  void loadDetail()
}

watch(id, () => {
  activeTab.value = 'progress'
  void loadDetail()
}, { immediate: true })

onMounted(() => {
  void loadContacts()
  window.addEventListener(APPROVAL_DEMO_ACTOR_EVENT, syncActor)
})

onUnmounted(() => {
  window.removeEventListener(APPROVAL_DEMO_ACTOR_EVENT, syncActor)
})

function handleTabChange(key: string | number) {
  activeTab.value = String(key)
}

function handleFormChange(values: FormValues) {
  formModel.value = values
}

async function runAction(action: ApprovalAction, payload?: WorkflowActionPayload) {
  if (!detail.value) return
  acting.value = true
  try {
    const body = workflowActionToPayload(action, payload, formModel.value)
    const result = await applyApprovalAction(detail.value.id, body)
    detail.value = result.data
    formModel.value = approvalFormModel(result.data)
    Message.success({ content: actionSuccessMessage(action), duration: 2200 })
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '审批动作失败'), duration: 3000 })
  } finally {
    acting.value = false
  }
}

function handleWorkflowAction(item: WorkflowActionBarItem, payload?: WorkflowActionPayload) {
  if (item.action === 'comment' && !payload?.comment?.trim()) {
    commentDraft.value = ''
    commentOpen.value = true
    return
  }
  void runAction(item.action as ApprovalAction, payload)
}

async function confirmComment() {
  const comment = commentDraft.value.trim()
  if (!comment) {
    Message.warning({ content: '评论内容不能为空', duration: 2000 })
    return
  }
  await runAction('comment', { comment })
  commentOpen.value = false
}

function renderAssigneePicker(ctx: WorkflowAssigneePickerContext) {
  const selected = ctx.value?.id ?? ctx.value?.name
  return h('div', { class: 'space-y-1' }, [
    h(Text, { size: 'sm', weight: 'medium' }, () => (ctx.action === 'addsign' ? '加签给' : '转交给')),
    h(
      RadioGroup,
      {
        size: 'sm',
        modelValue: selected,
        'aria-label': ctx.action === 'addsign' ? '加签对象' : '转交对象',
        'onUpdate:modelValue': (value: string | number) => {
          const user = pickerContacts.value.find((item) => item.id === String(value) || item.username === String(value))
          ctx.onChange(user ? contactActorOf(user) : undefined)
        },
      },
      {
        default: () =>
          pickerContacts.value.map((user) =>
            h(Radio, { key: user.id, value: user.id }, { default: () => `${user.name}（${user.username}）` }),
          ),
      },
    ),
  ])
}
</script>

<template>
  <div class="min-w-0 space-y-4">
    <PageHeader
      icon="checkCircle"
      :title="detail?.title ?? '审批详情'"
      subtitle="DetailShell：字段权限表单 + Timeline / Viewer + 全量 ActionBar。动作写回 mock 实例。"
      :tags="[{ label: statusMeta.label, variant: statusMeta.variant }]"
    />

    <div class="flex flex-wrap items-center gap-2">
      <Button variant="outline" @click="router.push('/approvals')">返回列表</Button>
      <Button v-if="detail?.ticketId" variant="ghost" @click="router.push('/tickets')">
        打开关联工单 {{ detail.ticketId }}
      </Button>
      <ApprovalActorSwitcher />
    </div>

    <Empty v-if="missing" description="没有找到该审批实例" />
    <Text v-else-if="loading && !detail" color="secondary">正在加载审批详情…</Text>
    <WorkflowDetailShell
      v-else-if="detail"
      aria-label="审批详情"
      class-name="h-[min(42rem,calc(100dvh-11rem))]"
      :show-actions="true"
    >
      <template #header>
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <Text weight="bold">{{ detail.id }}</Text>
          <Tag size="sm" :variant="statusMeta.variant">{{ statusMeta.label }}</Tag>
          <Text size="sm" color="secondary">当前步骤 {{ currentStep?.title ?? '—' }}</Text>
          <Text size="sm" color="secondary">处理人 {{ detail.assignee }}</Text>
          <Text v-if="!canAct && !actionsDisabled" size="sm" color="secondary">当前身份无待办任务</Text>
        </div>
      </template>
      <template #form>
        <Text weight="bold" class="mb-3 block">申请表单</Text>
        <SchemaForm
          :schema="formSchema"
          :model="formModel"
          :show-actions="false"
          :label-width="96"
          aria-label="申请表单"
          @update:model="handleFormChange"
        />
      </template>
      <template #tabs>
        <Tabs :active-key="activeTab" @update:active-key="handleTabChange">
          <TabPane tab-key="progress" label="审批进度">
            <div class="min-w-0 overflow-x-auto">
              <WorkflowTimeline :steps="steps" :tasks="workflowTasks" />
            </div>
          </TabPane>
          <TabPane tab-key="structure" label="流程结构">
            <div class="min-w-0 overflow-x-auto">
              <WorkflowViewer :steps="steps" :tasks="workflowTasks" />
            </div>
          </TabPane>
        </Tabs>
      </template>
      <template #action>
        <WorkflowActionBar
          confirm
          :button-policy="buttonPolicy"
          :return-targets="returnTargets"
          :addsign-positions="['before', 'after']"
          :current-sign-mode="currentSignMode"
          :is-starter="isStarter"
          :viewer-role="viewerRole"
          :disabled="actionsDisabled"
          :render-assignee-picker="renderAssigneePicker"
          aria-label="审批操作"
          @action="handleWorkflowAction"
        />
        <Text size="sm" color="secondary" class="mt-2 block">
          同意 / 拒绝 / 转交 / 加签 / 退回 / 撤回 / 评论会写回当前实例。金额仅财务节点可编。不接审批引擎。
        </Text>
      </template>
    </WorkflowDetailShell>

    <Modal
      v-model:open="commentOpen"
      title="添加评论"
      show-default-footer
      :ok-text="acting ? '提交中…' : '提交评论'"
      cancel-text="取消"
      @ok="confirmComment"
    >
      <Form :label-width="72">
        <FormItem label="意见" required>
          <Textarea v-model="commentDraft" :rows="3" placeholder="请输入审批意见" />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>
