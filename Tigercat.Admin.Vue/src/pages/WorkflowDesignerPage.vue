<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Text } from '@expcat/tigercat-vue/Text'
import { WorkflowDesigner } from '@expcat/tigercat-vue/WorkflowDesigner'
import { WorkflowViewer } from '@expcat/tigercat-vue/WorkflowViewer'
import type { WorkflowTimelineStep } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'

const DEFAULT_DESIGNER_STEPS: WorkflowTimelineStep[] = [
  { key: 'start', kind: 'start', title: '提交申请' },
  {
    key: 'manager',
    title: '主管会签',
    signMode: 'countersign',
    children: [
      { key: 'm1', title: '李四' },
      { key: 'm2', title: '钱七' },
    ],
  },
  { key: 'finance', title: '财务复核' },
  { key: 'done', title: '完成' },
]

function cloneDesignerSteps(): WorkflowTimelineStep[] {
  return structuredClone(DEFAULT_DESIGNER_STEPS)
}

function countSteps(list: WorkflowTimelineStep[]): number {
  return list.reduce((sum, step) => sum + 1 + countSteps(step.children ?? []), 0)
}

const steps = ref<WorkflowTimelineStep[]>(cloneDesignerSteps())
const stepCount = computed(() => countSteps(steps.value))

function resetDesigner() {
  steps.value = cloneDesignerSteps()
}
</script>

<template>
  <div class="min-w-0 space-y-4">
    <PageHeader
      icon="gitBranch"
      title="流程设计"
      subtitle="简单 JSON 树编辑器，复用 WorkflowTimelineStep。本页本地轻编辑，不接 Flowable / BPMN。"
      :tags="[
        { label: '演示', variant: 'primary' },
        { label: 'v2.4.0', variant: 'info' },
      ]"
    />

    <MutedPanel
      compact
      description="编辑结果只留在本页。右侧 WorkflowViewer 读同一份 steps，不是第二套流程模型。"
    />

    <div class="flex flex-wrap items-center gap-2">
      <Button variant="outline" @click="resetDesigner">恢复默认</Button>
      <Text size="sm" color="secondary">当前 {{ stepCount }} 个节点</Text>
    </div>

    <div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <Card class="min-w-0">
        <template #header><Text weight="bold">设计器</Text></template>
        <div class="min-w-0 overflow-x-auto">
          <WorkflowDesigner v-model="steps" />
        </div>
      </Card>
      <Card class="min-w-0">
        <template #header><Text weight="bold">预览</Text></template>
        <div class="min-w-0 overflow-x-auto">
          <WorkflowViewer :steps="steps" />
        </div>
      </Card>
    </div>
  </div>
</template>
