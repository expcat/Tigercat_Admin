<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Avatar } from '@expcat/tigercat-vue/Avatar'
import { AvatarGroup } from '@expcat/tigercat-vue/AvatarGroup'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Input } from '@expcat/tigercat-vue/Input'
import { Message } from '@expcat/tigercat-vue/Message'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Statistic } from '@expcat/tigercat-vue/Statistic'
import { Progress } from '@expcat/tigercat-vue/Progress'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { Pagination } from '@expcat/tigercat-vue/Pagination'
import { Empty } from '@expcat/tigercat-vue/Empty'
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
  type ProjectRecord,
  type ProjectStatusFilter,
} from '../utils/projects'

const router = useRouter()
const keyword = ref('')
const statusFilter = ref<ProjectStatusFilter>('all')
const page = ref(1)
const loading = ref(false)
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
  loading.value = true
  try {
    const payload = await fetchProjects({
      page: page.value,
      pageSize: PROJECT_PAGE_SIZE,
      status: statusFilter.value,
      keyword: keyword.value,
    })
    projects.value = payload.data.items ?? []
    total.value = payload.data.total ?? 0
  } catch (error: unknown) {
    Message.error({ content: readErrorMessage(error, '项目列表加载失败'), duration: 3000 })
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const payload = await fetchProjects({ page: 1, pageSize: 200 })
    statsProjects.value = payload.data.items ?? []
  } catch {
    statsProjects.value = []
  }
}

watch(keyword, () => {
  page.value = 1
})

watch(
  [keyword, statusFilter, page],
  () => {
    void loadProjects()
  },
  { immediate: true },
)

onMounted(() => {
  void loadStats()
})

function handleStatusChange(value: string | number) {
  const next = String(value)
  if (
    next === 'all' ||
    next === 'planning' ||
    next === 'active' ||
    next === 'paused' ||
    next === 'done'
  ) {
    statusFilter.value = next
    page.value = 1
  }
}

function handlePageChange(value: number) {
  page.value = value
}

function openProject(id: string) {
  router.push({ name: 'projects-detail', params: { id } })
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
      <MetricCard title="项目总数" :value="statsProjects.length" description="全部项目">
        <template #icon><Icon name="package" :size="20" /></template>
      </MetricCard>
      <MetricCard title="进行中" :value="activeCount" description="当前推进中的项目">
        <template #icon><Icon name="trendingUp" :size="20" /></template>
      </MetricCard>
      <MetricCard title="已完成" :value="doneCount" description="已发布归档">
        <template #icon><Icon name="checkCircle" :size="20" /></template>
      </MetricCard>
      <MetricCard title="平均进度" :value="avgProgress" description="全部项目进度均值">
        <template #icon><Icon name="clock" :size="20" /></template>
      </MetricCard>
    </MetricGrid>

    <PageActionPanel
      title="筛选项目"
      description="按名称、负责人和编号搜索，再用状态分段过滤；分页仅作用于当前筛选结果。"
    >
      <template #actions>
        <Input
          v-model="keyword"
          placeholder="搜索名称 / 负责人 / 编号"
          clearable
          class="w-full sm:w-64"
        />
        <Segmented
          :model-value="statusFilter"
          :options="PROJECT_STATUS_FILTERS"
          @update:model-value="handleStatusChange"
        />
      </template>
    </PageActionPanel>

    <div
      v-if="projects.length"
      data-testid="projects-grid"
      class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <Card
        v-for="project in projects"
        :key="project.id"
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
            <Button
              size="sm"
              variant="outline"
              @click.stop="openProject(project.id)"
            >
              查看详情
            </Button>
          </div>
        </template>
      </Card>
    </div>
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
