<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Button } from '@expcat/tigercat-vue/Button'
import { DataTableWithToolbar } from '@expcat/tigercat-vue/DataTableWithToolbar'
import { Message } from '@expcat/tigercat-vue/Message'
import { Modal } from '@expcat/tigercat-vue/Modal'
import { SchemaForm } from '@expcat/tigercat-vue/SchemaForm'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { Tag } from '@expcat/tigercat-vue/Tag'
import type { FormHandle, FormValues, TableColumn } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import ApprovalActorSwitcher from '../components/ApprovalActorSwitcher.vue'
import {
  APPROVAL_CREATE_SCHEMA,
  APPROVAL_DEMO_ACTOR_EVENT,
  APPROVAL_LANES,
  APPROVAL_PAGE_SIZE,
  APPROVAL_STATUS_META,
  approvalCreateFromValues,
  createApproval,
  EMPTY_APPROVAL_CREATE,
  fetchApprovals,
  fetchApprovalContacts,
  isApprovalLane,
} from '../utils/approvals'
import type { ApprovalLane, ApprovalListItem, ApprovalStatus, ApprovalContactUser } from '../utils/types'

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

const router = useRouter()
let listController: AbortController | null = null
const errorMessage = ref('')
const contactsError = ref('')
const contacts = ref<ApprovalContactUser[]>([])
const createSchema = computed(() => ({
  ...APPROVAL_CREATE_SCHEMA,
  fields: APPROVAL_CREATE_SCHEMA.fields?.map((field) => field.name === 'assignee'
    ? { ...field, options: contacts.value.map((user) => ({ value: user.id, label: `${user.name}（${user.username}）` })) }
    : field),
}))
const lane = ref<ApprovalLane>('todo')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(APPROVAL_PAGE_SIZE)
const loading = ref(false)
const items = ref<ApprovalListItem[]>([])
const total = ref(0)
const createOpen = ref(false)
const creating = ref(false)
const createFormRef = ref<FormHandle | null>(null)
const createForm = ref<FormValues>({ ...EMPTY_APPROVAL_CREATE })

function openDetail(id: string) {
  void router.push(`/approvals/${encodeURIComponent(id)}`)
}

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

async function loadList() {
  listController?.abort()
  const controller = new AbortController()
  listController = controller
  loading.value = true
  errorMessage.value = ''
  items.value = []
  total.value = 0
  try {
    const payload = await fetchApprovals({ lane: lane.value, keyword: keyword.value, page: page.value, pageSize: pageSize.value }, controller.signal)
    if (controller.signal.aborted) return
    const lastPage = Math.max(1, Math.ceil(payload.data.total / pageSize.value))
    if (page.value > lastPage) { page.value = lastPage; return }
    items.value = payload.data.items ?? []
    total.value = payload.data.total ?? 0
  } catch (error: unknown) {
    if (!controller.signal.aborted) errorMessage.value = readErrorMessage(error, '审批列表加载失败')
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

function reloadActor() {
  page.value = 1
  void loadList()
}

watch([lane, keyword, page, pageSize], () => {
  void loadList()
}, { immediate: true })

onMounted(() => {
  void loadContacts()
  window.addEventListener(APPROVAL_DEMO_ACTOR_EVENT, reloadActor)
})

onUnmounted(() => {
  listController?.abort()
  window.removeEventListener(APPROVAL_DEMO_ACTOR_EVENT, reloadActor)
})

function handleCreateModelChange(values: FormValues) {
  createForm.value = values
}

function handleLaneChange(value: string | number) {
  const next = String(value)
  if (!isApprovalLane(next)) return
  lane.value = next
  page.value = 1
}

async function handleCreate() {
  if (creating.value) return
  const valid = await createFormRef.value?.validate()
  if (!valid || creating.value) return
  const body = approvalCreateFromValues(createForm.value)
  if (!body.title) {
    Message.warning({ content: '请填写审批标题', duration: 2000 })
    return
  }
  if (!contacts.value.some((user) => user.id === body.assignee)) {
    Message.warning({ content: '请从通讯录选择处理人', duration: 2000 })
    return
  }
  creating.value = true
  try {
    const payload = await createApproval(body)
    createOpen.value = false
    createForm.value = { ...EMPTY_APPROVAL_CREATE }
    createFormRef.value?.resetFields()
    Message.success({ content: '已发起审批', duration: 2000 })
    await router.push(`/approvals/${encodeURIComponent(payload.data.id)}`)
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '发起审批失败'), duration: 3000 })
  } finally {
    creating.value = false
  }
}

const columns = computed<TableColumn<ApprovalListItem>[]>(() => [
  {
    key: 'id',
    title: '单号',
    width: 120,
    hideInCard: true,
    render: (record) => h('span', { class: 'font-mono text-sm' }, record.id),
  },
  {
    key: 'title',
    title: '标题',
    cardTitle: true,
    render: (record) =>
      h(
        Button,
        { variant: 'link', class: 'h-auto px-0 py-0 text-left', onClick: () => openDetail(record.id) },
        () => record.title,
      ),
  },
  { key: 'category', title: '类型', width: 100, render: (record) => record.category },
  { key: 'starter', title: '发起人', width: 120, render: (record) => record.starter },
  { key: 'assignee', title: '处理人', width: 120, render: (record) => record.assignee },
  {
    key: 'status',
    title: '状态',
    width: 110,
    render: (record) => {
      const meta = APPROVAL_STATUS_META[record.status as ApprovalStatus] ?? APPROVAL_STATUS_META.pending
      return h(Tag, { variant: meta.variant, size: 'sm' }, () => meta.label)
    },
  },
  {
    key: 'currentStepTitle',
    title: '当前步骤',
    width: 140,
    render: (record) => record.currentStepTitle ?? '—',
  },
  {
    key: 'updatedAt',
    title: '更新时间',
    width: 160,
    render: (record) => h('span', { class: 'p2-text-secondary text-sm' }, record.updatedAt),
  },
  {
    key: 'actions',
    title: '操作',
    width: 100,
    align: 'center',
    fixed: 'end',
    render: (record) =>
      h(Button, { size: 'sm', variant: 'ghost', onClick: () => openDetail(record.id) }, () => '查看'),
  },
])

const tableToolbar = computed(() => ({
  searchMode: 'remote' as const,
  searchValue: keyword.value,
  searchPlaceholder: '搜索标题或单号',
  onSearchChange: (value: string) => {
    keyword.value = value
    page.value = 1
  },
  onSearch: (value: string) => {
    keyword.value = value
    page.value = 1
  },
}))

const paginationConfig = computed(() => ({
  remote: true,
  current: page.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: true,
}))

function handlePageChange(next: { current: number; pageSize: number }) {
  if (next.pageSize !== pageSize.value) return
  page.value = next.current
}

function handlePageSizeChange(next: { current: number; pageSize: number }) {
  pageSize.value = next.pageSize
  page.value = 1
}
</script>

<template>
  <div class="space-y-4">
    <PageHeader
      icon="checkCircle"
      title="审批中心"
      subtitle="待办、已办、抄送与我发起的申请。可按身份切换当前处理人。"
      :tags="[{ label: 'Mock 流转', variant: 'info' }]"
    />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Segmented :model-value="lane" :options="APPROVAL_LANES" @update:model-value="handleLaneChange" />
      <div class="flex flex-wrap items-center gap-2">
        <ApprovalActorSwitcher />
        <Button @click="createOpen = true">发起审批</Button>
      </div>
    </div>

    <div v-if="errorMessage" role="alert"><Alert type="error" :title="errorMessage" /><Button variant="outline" @click="loadList">重试</Button></div>
    <DataTableWithToolbar
      :columns="columns as any"
      :data-source="items as any"
      :loading="loading"
      row-key="id"
      hoverable
      striped
      responsive-mode="card"
      card-breakpoint="md"
      empty-text="当前列表没有审批"
      :pagination="paginationConfig"
      :toolbar="tableToolbar"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    />

    <Modal
      :open="createOpen"
      :closable="!creating"
      :mask-closable="!creating"
      :keyboard="!creating"
      @close="!creating && (createOpen = false)"
      title="发起审批"
    >
      <template #footer>
        <Button variant="outline" :disabled="creating" @click="createOpen = false">取消</Button>
        <Button :loading="creating" @click="handleCreate">提交</Button>
      </template>
      <div v-if="contactsError" role="alert"><Alert type="error" :title="contactsError" /><Button variant="outline" @click="loadContacts">重试通讯录</Button></div>
      <SchemaForm
        ref="createFormRef"
        :schema="createSchema"
        :disabled="creating"
        :model-value="createForm"
        :show-actions="false"
        label-position="top"
        aria-label="发起审批表单"
        @update:model-value="handleCreateModelChange"
      />
    </Modal>
  </div>
</template>
