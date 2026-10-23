<script setup lang="ts">
import type { ProjectRecord, ProjectStatusFilter } from '../utils/types'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Avatar } from '@expcat/tigercat-vue/Avatar'
import { AvatarGroup } from '@expcat/tigercat-vue/AvatarGroup'
import { Card } from '@expcat/tigercat-vue/Card'
import { Input } from '@expcat/tigercat-vue/Input'
import { Button } from '@expcat/tigercat-vue/Button'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Statistic } from '@expcat/tigercat-vue/Statistic'
import { Progress } from '@expcat/tigercat-vue/Progress'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { Pagination } from '@expcat/tigercat-vue/Pagination'
import { Empty } from '@expcat/tigercat-vue/Empty'
import { Row } from '@expcat/tigercat-vue/Row'
import { Col } from '@expcat/tigercat-vue/Col'
import PageHeader from '../components/PageHeader.vue'
import MetricGrid from '../components/MetricGrid.vue'
import MetricCard from '../components/MetricCard.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
import Icon from '../components/Icon.vue'
import {
  fetchProjects,
  getProjectProgressStatus,
  PROJECT_PAGE_SIZE,
  PROJECT_STATUS_FILTERS,
  PROJECT_STATUS_META,
} from '../utils/projects'

const router = useRouter()
const route = useRoute()
const keyword = computed(() => typeof route.query.keyword === 'string' ? route.query.keyword : '')
const statusFilter = computed<ProjectStatusFilter>(() => PROJECT_STATUS_FILTERS.some(item => item.value === route.query.status) ? route.query.status as ProjectStatusFilter : 'all')
const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isSafeInteger(value) && value > 0 ? value : 1
})
const loadError = ref('')
const statsError = ref('')
const statsTotal = ref<number | null>(null)
let listRequest: AbortController | null = null
let statsRequest: AbortController | null = null
function updateQuery(patch: Record<string, string>) {
  const next = { ...route.query }
  Object.entries(patch).forEach(([key, value]) => {
    if (!value || value === 'all' || (key === 'page' && value === '1')) delete next[key]
    else next[key] = value
  })
  void router.replace({ query: next })
}
const loading = ref(true)
const projects = ref<ProjectRecord[]>([])
const total = ref(0)
const statsProjects = ref<ProjectRecord[]>([])

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const activeCount = computed(
  () => statsProjects.value.filter((item) => item.status === 'active').length,
)
const doneCount = computed(
  () => statsProjects.value.filter((item) => item.status === 'done').length,
)
const avgProgress = computed(() => {
  if (statsProjects.value.length === 0) {
    return 0
  }
  return Math.round(
    statsProjects.value.reduce((sum, item) => sum + item.progress, 0) / statsProjects.value.length,
  )
})

async function loadProjects() {
  listRequest?.abort()
  const controller = new AbortController()
  listRequest = controller
  loading.value = true
  loadError.value = ''
  projects.value = []
  total.value = 0
  try {
    const payload = await fetchProjects({
      page: page.value,
      pageSize: PROJECT_PAGE_SIZE,
      status: statusFilter.value,
      keyword: keyword.value,
    }, controller.signal)
    if (controller.signal.aborted) return
    const lastPage = Math.max(1, Math.ceil(payload.data.total / PROJECT_PAGE_SIZE))
    if (page.value > lastPage) { updateQuery({ page: String(lastPage) }); return }
    projects.value = payload.data.items ?? []
    total.value = payload.data.total ?? 0
  } catch (error: unknown) {
    if (!controller.signal.aborted) loadError.value = readErrorMessage(error, '项目列表加载失败')
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

async function loadStats() {
  statsRequest?.abort()
  const controller = new AbortController()
  statsRequest = controller
  statsError.value = ''
  statsTotal.value = null
  try {
    const payload = await fetchProjects({ page: 1, pageSize: 200 }, controller.signal)
    if (controller.signal.aborted) return
    statsProjects.value = payload.data.items ?? []
    statsTotal.value = payload.data.total
  } catch {
    if (!controller.signal.aborted) {
      statsProjects.value = []
      statsError.value = '项目统计加载失败'
    }
  }
}

watch([keyword, statusFilter, page], () => void loadProjects(), { immediate: true })
onMounted(() => void loadStats())
onBeforeUnmount(() => { listRequest?.abort(); statsRequest?.abort() })

function retryProjects() { void loadProjects(); void loadStats() }
function handleStatusChange(value: string | number) { updateQuery({ status: String(value), page: '1' }) }
function handlePageChange(value: number) { updateQuery({ page: String(value) }) }
function openProject(id: string) {
  void router.push({ name: 'projects-detail', params: { id }, query: route.query })
}

function statusMeta(project: ProjectRecord) {
  return PROJECT_STATUS_META[project.status]
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="package"
      title="项目列表"
      subtitle="卡片网格浏览项目，点击进入动态路由详情，演示列表到详情模板"
      :tags="[
        { label: '项目', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
      ]"
    />

    <MetricGrid :columns="4">
      <MetricCard title="项目总数" :value="statsTotal ?? '—'" description="接口返回的全部项目总数">
        <template #icon><Icon name="package" :size="20" /></template>
      </MetricCard>
      <MetricCard title="进行中" :value="statsTotal === null ? '—' : activeCount" :description="`已加载 ${statsProjects.length} 条中的进行中数量`">
        <template #icon><Icon name="trendingUp" :size="20" /></template>
      </MetricCard>
      <MetricCard title="已完成" :value="statsTotal === null ? '—' : doneCount" :description="`已加载 ${statsProjects.length} 条中的已完成数量`">
        <template #icon><Icon name="checkCircle" :size="20" /></template>
      </MetricCard>
      <MetricCard title="平均进度" :value="statsTotal === null ? '—' : avgProgress" :description="`已加载 ${statsProjects.length} 条的进度均值（最多 200 条）`">
        <template #icon><Icon name="clock" :size="20" /></template>
      </MetricCard>
    </MetricGrid>

    <div v-if="statsError" role="alert" class="flex flex-wrap items-center gap-3"><Text color="danger">{{ statsError }}</Text><Button variant="outline" @click="retryProjects">重试项目统计</Button></div>

    <PageActionPanel
      title="筛选项目"
      description="按名称、负责人和编号搜索，再用状态分段过滤；分页仅作用于当前筛选结果。"
    >
      <template #actions>
        <Input
          :model-value="keyword"
          @update:model-value="(value) => updateQuery({ keyword: String(value), page: '1' })"
          placeholder="搜索名称 / 负责人 / 编号"
          clearable
          class="w-full sm:w-64"
        />
        <Segmented
          size="sm"
          aria-label="项目状态"
          :model-value="statusFilter"
          :options="PROJECT_STATUS_FILTERS"
          @update:model-value="handleStatusChange"
        />
      </template>
    </PageActionPanel>

    <Card v-if="loadError"><div role="alert" class="space-y-3"><Text color="danger">{{ loadError }}</Text><Button variant="outline" @click="retryProjects">重试项目列表</Button></div></Card>
    <Row
      v-else-if="projects.length"
      data-testid="projects-grid"
      :gutter="[16, 16]"
    >
      <Col
        v-for="project in projects"
        :key="project.id"
        :span="{ xs: 24, md: 12, xl: 8 }"
      >
      <Card
        hoverable
        class="cursor-pointer"
        :data-testid="`project-card-${project.id}`"
        @click="openProject(project.id)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <Text weight="bold" class="block truncate">{{ project.name }}</Text>
            <Text size="sm" color="secondary" class="mt-1 block">
              {{ project.id }} · {{ project.owner }}
            </Text>
          </div>
          <Tag :variant="statusMeta(project).variant" size="sm">
            {{ statusMeta(project).label }}
          </Tag>
        </div>
        <Text size="sm" color="secondary" class="mt-3 block">
          {{ project.summary }}
        </Text>
        <div class="mt-4">
          <Statistic title="进度" :value="project.progress" suffix="%" />
          <div class="mt-2">
            <Progress
              :percentage="project.progress"
              :status="getProjectProgressStatus(project)"
              size="sm"
            />
          </div>
        </div>
        <div class="mt-4 flex items-center justify-between gap-3">
          <AvatarGroup :max="4" size="sm">
            <Avatar
              v-for="member in project.members"
              :key="member.id"
              size="sm"
              :bg-color="member.color"
              text-color="#ffffff"
            >
              {{ member.name.slice(0, 1) }}
            </Avatar>
          </AvatarGroup>
          <Text size="sm" color="secondary">{{ project.members.length }} 人</Text>
        </div>
        <template #footer>
          <div class="flex justify-end">
            <Text size="sm" color="primary">查看详情 →</Text>
          </div>
        </template>
      </Card>
      </Col>
    </Row>
    <Card v-else>
      <Empty
        :description="loading ? '正在加载项目…' : '没有符合条件的项目，试试调整搜索或状态筛选。'"
      />
    </Card>

    <div v-if="total" class="flex justify-end">
      <Pagination
        :current="page"
        :total="total"
        :page-size="PROJECT_PAGE_SIZE"
        @update:current="handlePageChange"
      />
    </div>
  </div>
</template>
