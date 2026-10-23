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
import { AssigneePicker } from '@expcat/tigercat-vue/AssigneePicker'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { SchemaForm } from '@expcat/tigercat-vue/SchemaForm'
import { TabPane } from '@expcat/tigercat-vue/TabPane'
import { Tabs } from '@expcat/tigercat-vue/Tabs'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Textarea } from '@expcat/tigercat-vue/Textarea'
import { WorkflowDetailShell } from '@expcat/tigercat-vue/WorkflowDetailShell'
import { WorkflowViewer } from '../utils/lazyTigercat'
import { WorkflowActionBar, WorkflowTimeline } from '@expcat/tigercat-vue/WorkflowTimeline'
import type {
  FieldPermission,
  FormHandle,
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
  fetchApproval,
  fetchApprovalContacts,
  getApprovalDemoActor,
  isApprovalTerminal,
  toWorkflowSteps,
  workflowActionToPayload,
} from '../utils/approvals'
import type { ApprovalAction, ApprovalActionPayload, ApprovalContactUser, ApprovalDetail, ApprovalStatus } from '../utils/types'

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

const route = useRoute()
const router = useRouter()
let detailController: AbortController | null = null
let actionLocked = false
const detailFormRef = ref<FormHandle | null>(null)
const errorMessage = ref('')
const actionError = ref('')
const contactsError = ref('')
const failedAction = ref<ApprovalActionPayload | null>(null)
const loading = ref(false)
const missing = ref(false)
const detail = ref<ApprovalDetail | null>(null)
const acting = ref(false)
const activeTab = ref('progress')
const actorId = ref(getApprovalDemoActor())
const contacts = ref<ApprovalContactUser[]>([])
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
  contactsError.value = ''
  try {
    const payload = await fetchApprovalContacts()
    contacts.value = payload.data.users ?? []
  } catch (error) {
    contacts.value = []
    contactsError.value = readErrorMessage(error, '通讯录加载失败')
  }
}

async function loadDetail() {
  detailController?.abort()
  const controller = new AbortController()
  detailController = controller
  detail.value = null
  formModel.value = {}
  commentOpen.value = false
  commentDraft.value = ''
  failedAction.value = null
  actionError.value = ''
  errorMessage.value = ''
  missing.value = !id.value
  if (!id.value) return
  loading.value = true
  try {
    const payload = await fetchApproval(id.value, controller.signal)
    if (controller.signal.aborted) return
    detail.value = payload.data
    formModel.value = approvalFormModel(payload.data)
  } catch (error: unknown) {
    if (controller.signal.aborted) return
    if (error instanceof ApiError && error.status === 404) missing.value = true
    else errorMessage.value = error instanceof ApiError && error.status === 403
      ? '当前账号无权查看该审批' : readErrorMessage(error, '审批详情加载失败')
  } finally {
    if (!controller.signal.aborted) loading.value = false
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
  detailController?.abort()
  window.removeEventListener(APPROVAL_DEMO_ACTOR_EVENT, syncActor)
})

function handleTabChange(key: string | number) {
  activeTab.value = String(key)
}

function handleFormChange(values: FormValues) {
  formModel.value = values
}

async function runAction(body: ApprovalActionPayload): Promise<boolean> {
  if (!detail.value || actionLocked || loading.value || isApprovalTerminal(detail.value.status)) return false
  if (!['comment', 'cancel', 'withdraw'].includes(body.action) && !canAct.value) return false
  if (['cancel', 'withdraw'].includes(body.action) && !isStarter.value) return false
  if ((body.comment?.length ?? 0) > 500) {
    Message.warning({ content: '审批意见最多 500 字', duration: 2000 })
    return false
  }
  actionLocked = true
  const controller = detailController
  try {
    if (!await detailFormRef.value?.validate()) return false
    if (controller !== detailController || controller?.signal.aborted) return false
    acting.value = true
    actionError.value = ''
    const result = await applyApprovalAction(detail.value.id, { ...body, formValues: formModel.value })
    if (controller !== detailController || controller?.signal.aborted) return false
    detail.value = result.data
    formModel.value = approvalFormModel(result.data)
    failedAction.value = null
    Message.success({ content: actionSuccessMessage(body.action), duration: 2200 })
    return true
  } catch (error: unknown) {
    if (controller !== detailController || controller?.signal.aborted) return false
    failedAction.value = body
    actionError.value = readErrorMessage(error, '审批动作失败')
    return false
  } finally {
    actionLocked = false
    acting.value = false
  }
}

function handleWorkflowAction(item: WorkflowActionBarItem, payload?: WorkflowActionPayload) {
  if (acting.value) return
  if (item.action === 'comment' && !payload?.comment?.trim()) {
    commentOpen.value = true
    return
  }
  void runAction(workflowActionToPayload(item.action as ApprovalAction, payload))
}

async function confirmComment() {
  const comment = commentDraft.value.trim()
  if (!comment) {
    Message.warning({ content: '评论内容不能为空', duration: 2000 })
    return
  }
  if (await runAction({ action: 'comment', comment })) {
    commentOpen.value = false
    commentDraft.value = ''
  }
}

function renderAssigneePicker(ctx: WorkflowAssigneePickerContext) {
  return h('div', { class: 'space-y-1' }, [
    h(Text, { size: 'sm', weight: 'medium' }, () => ctx.action === 'addsign' ? '加签给（每次一人）' : '转交给'),
    h(AssigneePicker, {
      options: pickerContacts.value.map((user) => ({ id: user.id, name: `${user.name}（${user.username}）`, department: user.deptName })),
      selectedIds: ctx.value?.id ? [String(ctx.value.id)] : [],
      locale: 'zh-CN',
      onChange: (ids: string[]) => {
        const user = pickerContacts.value.find((item) => item.id === ids[ids.length - 1])
        ctx.onChange(user ? contactActorOf(user) : undefined)
      },
    }),
  ])
}
</script>

<template>
  <div class="flex h-full min-h-0 min-w-0 flex-col gap-4">
    <div class="shrink-0">
      <PageHeader
        icon="checkCircle"
        :title="detail?.title ?? '审批详情'"
        subtitle="查看申请内容、审批进度，并在底部完成同意、拒绝或其他操作。"
        :tags="detail ? [{ label: statusMeta.label, variant: statusMeta.variant }] : []"
      />
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-2">
      <Button variant="outline" @click="router.push('/approvals')">返回列表</Button>
      <Button
        v-if="detail?.ticketId"
        variant="ghost"
        @click="router.push({ path: '/tickets', query: { ticket: detail.ticketId } })"
      >
        打开关联工单 {{ detail.ticketId }}
      </Button>
      <ApprovalActorSwitcher />
    </div>

    <div v-if="contactsError" role="alert"><Alert type="error" :title="contactsError" /><Button variant="outline" @click="loadContacts">重试通讯录</Button></div>
    <div v-if="actionError" role="alert"><Alert type="error" title="审批动作尚未保存" :description="actionError" /><Button v-if="failedAction" :disabled="acting" @click="runAction(failedAction)">重试审批动作</Button></div>
    <div v-if="errorMessage" role="alert"><Alert type="error" :title="errorMessage" /><Button variant="outline" @click="loadDetail">重试</Button></div>
    <Empty v-else-if="missing" description="没有找到该审批实例" />
    <Text v-else-if="loading && !detail" color="secondary">正在加载审批详情…</Text>
    <WorkflowDetailShell
      v-else-if="detail"
      aria-label="审批详情"
      class-name="min-h-[32rem] flex-1 md:min-h-0"
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
          ref="detailFormRef"
          :disabled="acting"
          :schema="formSchema"
          :model-value="formModel"
          :show-actions="false"
          label-position="top"
          aria-label="申请表单"
          @update:model-value="handleFormChange"
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
      </template>
    </WorkflowDetailShell>

    <Modal
      :open="commentOpen"
      :closable="!acting"
      :mask-closable="!acting"
      :keyboard="!acting"
      @close="!acting && (commentOpen = false)"
      title="添加评论"
    >
      <template #footer>
        <Button variant="outline" :disabled="acting" @click="commentOpen = false">取消</Button>
        <Button :loading="acting" @click="confirmComment">提交评论</Button>
      </template>
      <div v-if="actionError && failedAction?.action === 'comment'" role="alert"><Alert type="error" title="评论尚未保存" :description="actionError" /></div>
      <Form :label-width="72">
        <FormItem label="意见" required>
          <Textarea v-model="commentDraft" :disabled="acting" aria-label="评论意见" :rows="3" placeholder="请输入审批意见" />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>
