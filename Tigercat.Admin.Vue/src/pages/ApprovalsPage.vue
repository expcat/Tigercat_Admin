<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@expcat/tigercat-vue/Button'
import { DataTableWithToolbar } from '@expcat/tigercat-vue/DataTableWithToolbar'
import { Form } from '@expcat/tigercat-vue/Form'
import { FormItem } from '@expcat/tigercat-vue/FormItem'
import { Input } from '@expcat/tigercat-vue/Input'
import { Message } from '@expcat/tigercat-vue/Message'
import { Modal } from '@expcat/tigercat-vue/Modal'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { Select } from '@expcat/tigercat-vue/Select'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Textarea } from '@expcat/tigercat-vue/Textarea'
import type { TableColumn } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import {
  APPROVAL_CATEGORY_OPTIONS,
  APPROVAL_LANES,
  APPROVAL_PAGE_SIZE,
  APPROVAL_STATUS_META,
  APPROVAL_TRANSFER_OPTIONS,
  createApproval,
  fetchApprovals,
  isApprovalLane,
} from '../utils/approvals'
import type { ApprovalLane, ApprovalListItem, ApprovalStatus } from '../utils/types'

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

const router = useRouter()
const lane = ref<ApprovalLane>('todo')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(APPROVAL_PAGE_SIZE)
const loading = ref(false)
const items = ref<ApprovalListItem[]>([])
const total = ref(0)
const createOpen = ref(false)
const creating = ref(false)
const createForm = ref({
  title: '',
  category: '工单',
  reason: '',
  assignee: 'admin',
  ticketId: '',
})

function openDetail(id: string) {
  void router.push(`/approvals/${encodeURIComponent(id)}`)
}

async function loadList() {
  loading.value = true
  try {
    const payload = await fetchApprovals({
      lane: lane.value,
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value,
    })
    items.value = payload.data.items ?? []
    total.value = payload.data.total ?? 0
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '审批列表加载失败'), duration: 3000 })
  } finally {
    loading.value = false
  }
}

watch([lane, keyword, page, pageSize], () => {
  void loadList()
}, { immediate: true })

function handleLaneChange(value: string | number) {
  const next = String(value)
  if (!isApprovalLane(next)) return
  lane.value = next
  page.value = 1
}

async function handleCreate() {
  const title = createForm.value.title.trim()
  if (!title) {
    Message.warning({ content: '请填写审批标题', duration: 2000 })
    return
  }
  creating.value = true
  try {
    const payload = await createApproval({
      title,
      category: createForm.value.category,
      reason: createForm.value.reason.trim() || undefined,
      assignee: createForm.value.assignee,
      ticketId: createForm.value.ticketId.trim() || undefined,
    })
    createOpen.value = false
    createForm.value = { title: '', category: '工单', reason: '', assignee: 'admin', ticketId: '' }
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
    render: (record) =>
      h(Button, { size: 'sm', variant: 'ghost', onClick: () => openDetail(record.id) }, () => '查看'),
  },
])

const tableToolbar = computed(() => ({
  searchMode: 'remote' as const,
  searchValue: keyword.value,
  searchPlaceholder: '搜索标题、单号或处理人',
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
      subtitle="待办 / 已办 / 抄送 / 我发起的。同意、驳回、转交写回 mock 实例，不接 Flowable。"
      :tags="[{ label: 'Mock 流转', variant: 'info' }]"
    />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Segmented :model-value="lane" :options="APPROVAL_LANES" @update:model-value="handleLaneChange" />
      <Button @click="createOpen = true">发起审批</Button>
    </div>

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
      v-model:open="createOpen"
      title="发起审批"
      show-default-footer
      :ok-text="creating ? '提交中…' : '提交'"
      cancel-text="取消"
      @ok="handleCreate"
    >
      <Form :label-width="96">
        <FormItem label="标题" required>
          <Input v-model="createForm.title" placeholder="例如：请假、报销或工单升级" />
        </FormItem>
        <FormItem label="类型">
          <Select v-model="createForm.category" :options="APPROVAL_CATEGORY_OPTIONS" />
        </FormItem>
        <FormItem label="处理人">
          <Select v-model="createForm.assignee" :options="APPROVAL_TRANSFER_OPTIONS" />
        </FormItem>
        <FormItem label="关联工单">
          <Input v-model="createForm.ticketId" placeholder="可选，如 TK-2048" />
        </FormItem>
        <FormItem label="说明">
          <Textarea v-model="createForm.reason" :rows="3" placeholder="申请原因" />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>
