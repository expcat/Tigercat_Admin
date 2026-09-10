<script setup lang="ts">
import { computed, ref } from 'vue'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Message } from '@expcat/tigercat-vue/Message'
import { Text } from '@expcat/tigercat-vue/Text'
import { WorkflowDesigner } from '@expcat/tigercat-vue/WorkflowDesigner'
import { WorkflowViewer } from '@expcat/tigercat-vue/WorkflowViewer'
import type { WorkflowTimelineStep } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'
import {
  cloneDesignerDemoSteps,
  countWorkflowSteps,
  DESIGNER_FORM_SCHEMA,
  DESIGNER_PUBLISH_BLOCKED,
  DESIGNER_PUBLISH_OK,
  DESIGNER_SAVE_OK,
  designerBlockingIssues,
  designerIssueText,
  persistDesignerDraft,
} from '../utils/workflow-designer'

const steps = ref<WorkflowTimelineStep[]>(cloneDesignerDemoSteps())
const stepCount = computed(() => countWorkflowSteps(steps.value))
const blockingIssues = computed(() => designerBlockingIssues(steps.value))
const issueMessages = computed(() => blockingIssues.value.map(designerIssueText))

function resetDesigner() {
  steps.value = cloneDesignerDemoSteps()
}

function saveDraft() {
  persistDesignerDraft(steps.value)
  Message.success({ content: DESIGNER_SAVE_OK, duration: 2500 })
}

function publishDesigner() {
  if (blockingIssues.value.length > 0) {
    Message.error({ content: DESIGNER_PUBLISH_BLOCKED, duration: 3000 })
    return
  }
  persistDesignerDraft(steps.value)
  Message.success({ content: DESIGNER_PUBLISH_OK, duration: 2500 })
}
</script>

<template>
  <div class="min-w-0 space-y-4">
    <PageHeader
      icon="gitBranch"
      title="流程设计"
      subtitle="画布摘要卡 + 右侧 Inspector（审批人 / 操作按钮 / 表单权限 / 高级）。发布前走库校验。不接 Flowable / BPMN。"
      :tags="[
        { label: '演示', variant: 'primary' },
        { label: 'v2.5.0', variant: 'info' },
      ]"
    />

    <MutedPanel
      compact
      description="请假/采购种子：条件分支 + 会签 + 抄送 + 金额仅财务可编。点选节点打开 Inspector 四 Tab；保存/发布拦阻塞项。预览 Viewer 读同一份 steps。"
    />

    <div class="flex flex-wrap items-center gap-2">
      <Button variant="outline" @click="resetDesigner">恢复默认</Button>
      <Button variant="outline" @click="saveDraft">保存草稿</Button>
      <Button @click="publishDesigner">发布</Button>
      <Text size="sm" color="secondary">当前 {{ stepCount }} 个节点</Text>
    </div>

    <Alert
      v-if="issueMessages.length"
      type="error"
      :title="DESIGNER_PUBLISH_BLOCKED"
      :description="issueMessages.join('；')"
    />

    <div class="grid min-w-0 gap-4">
      <Card class="min-w-0">
        <template #header><Text weight="bold">设计器</Text></template>
        <div class="min-w-0 overflow-x-auto">
          <WorkflowDesigner v-model="steps" :schema="DESIGNER_FORM_SCHEMA" />
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
