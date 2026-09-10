import { useMemo, useState } from 'react';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
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
        subtitle="配置审批节点、审批人、按钮和表单权限。发布前会校验阻塞项。"
        tags={[
          { label: '演示', variant: 'primary' },
          { label: 'v2.5.2', variant: 'info' },
        ]}
      />

      <MutedPanel
        compact
        description="点选节点可编辑审批人、操作按钮、表单权限。保存草稿或发布前会拦截阻塞项。"
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

      <div className="grid min-w-0 gap-4">
        <Card header={<Text weight="bold">设计器</Text>} className="min-w-0">
          <div className="min-w-0 overflow-x-auto">
            <WorkflowDesigner value={steps} schema={DESIGNER_FORM_SCHEMA} onChange={setSteps} />
          </div>
        </Card>
        <Card header={<Text weight="bold">预览</Text>} className="min-w-0">
          <div className="min-w-0 overflow-x-auto">
            <WorkflowViewer steps={steps} />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default WorkflowDesignerPage;
