<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Avatar, AvatarGroup, Button, Card, Tag, Text } from '@expcat/tigercat-vue'
import { Descriptions } from '@expcat/tigercat-vue/Descriptions'
import { Progress } from '@expcat/tigercat-vue/Progress'
import { Steps, StepsItem } from '@expcat/tigercat-vue/Steps'
import { Tabs } from '@expcat/tigercat-vue/Tabs'
import { TabPane } from '@expcat/tigercat-vue/TabPane'
import { Anchor, AnchorLink } from '@expcat/tigercat-vue/Anchor'
import { Timeline } from '@expcat/tigercat-vue/Timeline'
import { CommentThread } from '@expcat/tigercat-vue/CommentThread'
import { Empty } from '@expcat/tigercat-vue/Empty'
import type { DescriptionsItem } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MetricGrid from '../components/MetricGrid.vue'
import MetricCard from '../components/MetricCard.vue'
import MutedPanel from '../components/MutedPanel.vue'
import PageActionPanel from '../components/PageActionPanel.vue'
import ChartEmptyState from '../components/ChartEmptyState.vue'
import Icon from '../components/Icon.vue'
import {
  getProjectById,
  getProjectProgressStatus,
  getProjectRemainDays,
  PROJECT_DETAIL_TABS,
  PROJECT_MILESTONES,
  PROJECT_STATUS_META,
  readProjectId,
  type ProjectDetailTab,
} from '../utils/projects'

const route = useRoute()
const router = useRouter()
const activeTab = ref<ProjectDetailTab>('overview')

const id = computed(() => readProjectId(route.params.id))
const project = computed(() => getProjectById(id.value))
const status = computed(() =>
  project.value ? PROJECT_STATUS_META[project.value.status] : null,
)
const remainDays = computed(() =>
  project.value ? getProjectRemainDays(project.value) : 0,
)

const overviewItems = computed<DescriptionsItem[]>(() => {
  const current = project.value
  if (!current || !status.value) {
    return []
  }
  return [
    { label: '项目编号', content: current.id },
    { label: '负责人', content: current.owner },
    { label: '所属部门', content: current.department },
    { label: '状态', content: status.value.label },
    { label: '开始日期', content: current.startAt },
    { label: '计划完成', content: current.endAt },
    { label: '预算', content: `${current.budget} 万` },
    { label: '成员人数', content: `${current.members.length} 人` },
  ]
})

watch(id, () => {
  activeTab.value = 'overview'
})

function goBackToList() {
  router.push({ name: 'projects' })
}

function handleTabChange(key: string | number) {
  const next = String(key)
  if (next === 'overview' || next === 'members' || next === 'activity') {
    activeTab.value = next
  }
}

function tabFromHref(href: string): ProjectDetailTab {
  if (href.includes('members')) {
    return 'members'
  }
  if (href.includes('activity')) {
    return 'activity'
  }
  return 'overview'
}

function handleAnchorClick(_event: Event, href: string) {
  activeTab.value = tabFromHref(href)
}

function getScrollContainer(): HTMLElement | Window {
  return document.getElementById('main-content-scroll') ?? window
}
</script>

<template>
  <div v-if="!project" class="space-y-6">
    <PageHeader
      icon="package"
      title="未找到项目"
      :subtitle="id ? `没有编号为 ${id} 的项目` : '缺少项目编号'"
      :tags="[
        { label: '项目', variant: 'primary' },
        { label: '未找到', variant: 'warning' },
      ]"
    />
    <PageActionPanel
      title="返回列表"
      description="详情页不在侧栏菜单中，列表菜单项会继续保持高亮。"
    >
      <template #actions>
        <Button variant="outline" @click="goBackToList">返回项目列表</Button>
      </template>
    </PageActionPanel>
    <Card>
      <Empty description="该项目不存在或已被移除，请从项目列表重新进入。" />
    </Card>
  </div>

  <div v-else class="space-y-6">
    <PageHeader
      icon="package"
      :title="project.name"
      :subtitle="project.summary"
      :tags="[
        { label: status?.label ?? '未知', variant: status?.variant ?? 'default' },
        { label: project.department, variant: 'info' },
      ]"
    />

    <PageActionPanel
      title="项目详情"
      description="标准列表到详情模板：概要、里程碑、成员与讨论均使用页面内演示数据。"
    >
      <template #actions>
        <Button variant="outline" @click="goBackToList">返回项目列表</Button>
      </template>
    </PageActionPanel>

    <MetricGrid :columns="4">
      <MetricCard
        title="当前进度"
        :value="project.progress"
        :description="`${status?.label ?? ''} · ${PROJECT_MILESTONES[project.milestone]}`"
      >
        <template #icon><Icon name="zap" :size="20" /></template>
      </MetricCard>
      <MetricCard
        title="成员"
        :value="project.members.length"
        :description="`负责人 ${project.owner}`"
      >
        <template #icon><Icon name="users" :size="20" /></template>
      </MetricCard>
      <MetricCard title="预算" :value="project.budget" description="万元">
        <template #icon><Icon name="package" :size="20" /></template>
      </MetricCard>
      <MetricCard
        title="剩余天数"
        :value="remainDays"
        :description="`计划 ${project.endAt}`"
      >
        <template #icon><Icon name="clock" :size="20" /></template>
      </MetricCard>
    </MetricGrid>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div class="min-w-0 space-y-4">
        <Tabs :active-key="activeTab" @update:active-key="handleTabChange">
          <TabPane tab-key="overview" label="概览">
            <div id="project-overview" class="space-y-4">
              <Card>
                <template #header><Text weight="bold">项目概要</Text></template>
                <Descriptions
                  :items="overviewItems"
                  :column="{ xs: 1, sm: 2 }"
                  bordered
                  colon
                />
              </Card>
              <Card>
                <template #header><Text weight="bold">里程碑</Text></template>
                <Steps :current="project.milestone" size="small">
                  <StepsItem
                    v-for="(label, index) in PROJECT_MILESTONES"
                    :key="label"
                    :title="label"
                    :description="index === project.milestone ? '当前阶段' : ''"
                  />
                </Steps>
                <div class="mt-4">
                  <Progress
                    :percentage="project.progress"
                    :status="getProjectProgressStatus(project)"
                  />
                </div>
              </Card>
            </div>
          </TabPane>
          <TabPane tab-key="members" label="成员">
            <div id="project-members" class="space-y-4">
              <Card>
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <AvatarGroup :max="6" size="md">
                    <Avatar
                      v-for="member in project.members"
                      :key="member.id"
                      size="md"
                      :bg-color="member.color"
                      text-color="#ffffff"
                    >
                      {{ member.name.slice(0, 1) }}
                    </Avatar>
                  </AvatarGroup>
                  <Text size="sm" color="secondary">
                    共 {{ project.members.length }} 名成员
                  </Text>
                </div>
              </Card>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card v-for="member in project.members" :key="member.id">
                  <div class="flex items-center gap-3">
                    <Avatar size="lg" :bg-color="member.color" text-color="#ffffff">
                      {{ member.name.slice(0, 1) }}
                    </Avatar>
                    <div class="min-w-0">
                      <Text weight="bold">{{ member.name }}</Text>
                      <div class="mt-1 flex items-center gap-2">
                        <Tag variant="info" size="sm">{{ member.role }}</Tag>
                        <Tag v-if="member.name === project.owner" variant="primary" size="sm">
                          负责人
                        </Tag>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabPane>
          <TabPane tab-key="activity" label="动态">
            <div id="project-activity" class="space-y-4">
              <Card>
                <template #header><Text weight="bold">项目动态</Text></template>
                <Timeline v-if="project.activities.length" :items="project.activities" />
                <ChartEmptyState v-else description="暂无项目动态" height-class="h-36" />
              </Card>
              <Card>
                <template #header><Text weight="bold">讨论</Text></template>
                <CommentThread
                  v-if="project.comments.length"
                  :nodes="project.comments"
                  :show-reply="false"
                  :show-like="false"
                  :show-more="false"
                  empty-text="暂无讨论"
                />
                <MutedPanel
                  v-else
                  compact
                  description="还没有讨论，可在后续迭代接入回复。"
                />
              </Card>
            </div>
          </TabPane>
        </Tabs>
      </div>

      <div class="hidden lg:block">
        <Card>
          <template #header><Text weight="bold">页内导航</Text></template>
          <Anchor
            :affix="false"
            :get-container="getScrollContainer"
            :offset-top="16"
            @click="handleAnchorClick"
          >
            <AnchorLink
              v-for="item in PROJECT_DETAIL_TABS"
              :key="item.key"
              :href="item.href"
              :title="item.label"
            />
          </Anchor>
          <MutedPanel
            compact
            class="mt-3"
            description="点击目录切换概览、成员或动态，并滚动到对应区块。"
          />
        </Card>
      </div>
    </div>
  </div>
</template>
