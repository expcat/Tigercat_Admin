import type { FieldPermission, WorkflowDesignerIssue, WorkflowTimelineStep } from '@expcat/tigercat-core';
import {
  createFullWorkflowButtonPolicy,
  validateWorkflowDesigner,
  workflowDesignerBlockingIssues,
  workflowDesignerIssueMessage,
} from '@expcat/tigercat-core';
import { APPROVAL_DETAIL_SCHEMA } from './approvals';

export const DESIGNER_STORAGE_KEY = 'tigercat-admin:workflow-designer-draft';
export const DESIGNER_PUBLISH_BLOCKED = '存在阻塞项，无法发布';
export const DESIGNER_PUBLISH_OK = '已发布（演示，不写回引擎）';
export const DESIGNER_SAVE_OK = '已保存草稿（本机，不写回引擎）';

export const DESIGNER_VALIDATION_LABELS = {
  validationMissingStart: '请添加发起节点',
  validationMissingEnd: '请添加结束节点',
  validationEmptyApprovers: '该审批节点没有审批人',
  validationMissingBranches: '该条件节点没有分支',
  validationButtonsAllDisabled: '所有操作按钮均已关闭',
};

const readonlyFields: Record<string, FieldPermission> = {
  title: 'readonly',
  category: 'readonly',
  starter: 'readonly',
  amount: 'readonly',
  ticketId: 'readonly',
  reason: 'readonly',
};

const initiateFields: Record<string, FieldPermission> = {
  title: 'editable',
  category: 'editable',
  starter: 'readonly',
  amount: 'editable',
  ticketId: 'editable',
  reason: 'editable',
};

const financeFields: Record<string, FieldPermission> = {
  ...readonlyFields,
  amount: 'editable',
  ticketId: 'hidden',
};

function demoButtons() {
  return createFullWorkflowButtonPolicy();
}

/** 请假/采购演示树：条件分支 + 会签 + 抄送 + 金额仅财务可编。 */
const DEFAULT_DESIGNER_STEPS: WorkflowTimelineStep[] = [
  {
    key: 'start',
    kind: 'start',
    title: '提交申请',
    fieldPermissions: initiateFields,
  },
  {
    key: 'manager',
    kind: 'approve',
    title: '主管会签',
    signMode: 'countersign',
    actors: [
      { id: 'li', name: '李四' },
      { id: 'qian', name: '钱七' },
    ],
    approverPolicy: {
      type: 'fixed',
      actors: [
        { id: 'li', name: '李四' },
        { id: 'qian', name: '钱七' },
      ],
    },
    buttonPolicy: demoButtons(),
    fieldPermissions: readonlyFields,
  },
  {
    key: 'amount-gate',
    kind: 'condition',
    title: '金额大于 1000',
    children: [
      {
        key: 'finance',
        kind: 'approve',
        title: '财务会签',
        signMode: 'countersign',
        expression: 'amount > 1000',
        actors: [
          { id: 'chen', name: '陈财务' },
          { id: 'zhao', name: '赵主管' },
        ],
        approverPolicy: { type: 'group', key: 'finance' },
        buttonPolicy: demoButtons(),
        fieldPermissions: financeFields,
      },
      {
        key: 'skip-finance',
        kind: 'approve',
        title: '无需财务',
        expression: 'amount <= 1000',
        actors: [{ id: 'self', name: '发起人' }],
        approverPolicy: { type: 'self' },
        buttonPolicy: demoButtons(),
        fieldPermissions: readonlyFields,
      },
    ],
  },
  {
    key: 'cc-hr',
    kind: 'cc',
    title: '抄送人事',
    actors: [{ id: 'fang', name: '方人事' }],
    approverPolicy: { type: 'role', key: 'hr' },
  },
  {
    key: 'end',
    kind: 'end',
    title: '完成',
  },
];

export const DESIGNER_FORM_SCHEMA = APPROVAL_DETAIL_SCHEMA;

export function cloneDesignerDemoSteps(): WorkflowTimelineStep[] {
  return structuredClone(DEFAULT_DESIGNER_STEPS);
}

export function countWorkflowSteps(steps: WorkflowTimelineStep[]): number {
  return steps.reduce((sum, step) => sum + 1 + countWorkflowSteps(step.children ?? []), 0);
}

export function designerIssues(steps: WorkflowTimelineStep[]): WorkflowDesignerIssue[] {
  return validateWorkflowDesigner(steps);
}

export function designerBlockingIssues(steps: WorkflowTimelineStep[]): WorkflowDesignerIssue[] {
  return workflowDesignerBlockingIssues(designerIssues(steps));
}

export function designerIssueText(issue: WorkflowDesignerIssue): string {
  return workflowDesignerIssueMessage(issue, DESIGNER_VALIDATION_LABELS);
}

export function persistDesignerDraft(steps: WorkflowTimelineStep[]) {
  try {
    localStorage.setItem(DESIGNER_STORAGE_KEY, JSON.stringify(steps));
  } catch {
    /* ignore quota / private mode */
  }
}
