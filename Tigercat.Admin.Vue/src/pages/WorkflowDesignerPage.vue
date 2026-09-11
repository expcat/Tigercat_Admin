<script setup lang="ts">
import { computed, ref } from 'vue'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Button } from '@expcat/tigercat-vue/Button'
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
      subtitle="纵向摘要卡流程画布 + 右侧 Inspector。点选节点编辑审批人、按钮和表单权限。"
      :tags="[
        { label: '演示', variant: 'primary' },
        { label: 'v2.6.0', variant: 'info' },
      ]"
    />

    <MutedPanel
      compact
      description="左侧是纵向流程画布（轨道与插入点）。点选节点后右侧 Inspector 四 Tab 编辑；保存或发布前拦截阻塞项。"
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

    <div class="min-w-0 overflow-x-auto">
      <WorkflowDesigner v-model="steps" :schema="DESIGNER_FORM_SCHEMA" />
    </div>
    <details class="min-w-0 rounded-md border border-[var(--tiger-border,#e5e7eb)] px-3 py-2">
      <summary class="cursor-pointer text-sm font-medium">流程预览</summary>
      <div class="min-w-0 overflow-x-auto pt-3">
        <WorkflowViewer :steps="steps" />
      </div>
    </details>
  </div>
</template>
