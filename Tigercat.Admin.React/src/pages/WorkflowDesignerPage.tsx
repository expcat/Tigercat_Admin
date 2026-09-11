import { useMemo, useState } from 'react';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Button } from '@expcat/tigercat-react/Button';
import { Message } from '@expcat/tigercat-react/Message';
import { Text } from '@expcat/tigercat-react/Text';
import { WorkflowDesigner } from '@expcat/tigercat-react/WorkflowDesigner';
import { WorkflowViewer } from '@expcat/tigercat-react/WorkflowViewer';
import type { WorkflowTimelineStep } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';
import { GitBranchIcon } from '../components/Icons';
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
} from '../utils/workflow-designer';

function WorkflowDesignerPage() {
  const [steps, setSteps] = useState<WorkflowTimelineStep[]>(() => cloneDesignerDemoSteps());
  const stepCount = useMemo(() => countWorkflowSteps(steps), [steps]);
  const blockingIssues = useMemo(() => designerBlockingIssues(steps), [steps]);
  const issueMessages = useMemo(() => blockingIssues.map(designerIssueText), [blockingIssues]);

  function saveDraft() {
    persistDesignerDraft(steps);
    Message.success({ content: DESIGNER_SAVE_OK, duration: 2500 });
  }

  function publishDesigner() {
    if (blockingIssues.length > 0) {
      Message.error({ content: DESIGNER_PUBLISH_BLOCKED, duration: 3000 });
      return;
    }
    persistDesignerDraft(steps);
    Message.success({ content: DESIGNER_PUBLISH_OK, duration: 2500 });
  }

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        icon={<GitBranchIcon size={22} />}
        title="流程设计"
        subtitle="纵向摘要卡流程画布 + 右侧 Inspector。点选节点编辑审批人、按钮和表单权限。"
        tags={[
          { label: '演示', variant: 'primary' },
          { label: 'v2.6.0', variant: 'info' },
        ]}
      />

      <MutedPanel
        compact
        description="左侧是纵向流程画布（轨道与插入点）。点选节点后右侧 Inspector 四 Tab 编辑；保存或发布前拦截阻塞项。"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setSteps(cloneDesignerDemoSteps())}>
          恢复默认
        </Button>
        <Button variant="outline" onClick={saveDraft}>
          保存草稿
        </Button>
        <Button onClick={publishDesigner}>发布</Button>
        <Text size="sm" color="secondary">
          当前 {stepCount} 个节点
        </Text>
      </div>

      {issueMessages.length > 0 ? (
        <Alert type="error" title={DESIGNER_PUBLISH_BLOCKED} description={issueMessages.join('；')} />
      ) : null}

      <div className="min-w-0 overflow-x-auto">
        <WorkflowDesigner value={steps} schema={DESIGNER_FORM_SCHEMA} onChange={setSteps} />
      </div>
      <details className="min-w-0 rounded-md border border-[var(--tiger-border,#e5e7eb)] px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">流程预览</summary>
        <div className="min-w-0 overflow-x-auto pt-3">
          <WorkflowViewer steps={steps} />
        </div>
      </details>
    </div>
  );
}

export default WorkflowDesignerPage;
