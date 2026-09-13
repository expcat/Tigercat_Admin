import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { applyWorkflowFieldPermissions } from '@expcat/tigercat-core';
import { Button } from '@expcat/tigercat-react/Button';
import { Empty } from '@expcat/tigercat-react/Empty';
import { Form } from '@expcat/tigercat-react/Form';
import { FormItem } from '@expcat/tigercat-react/FormItem';
import { Message } from '@expcat/tigercat-react/Message';
import { Modal } from '@expcat/tigercat-react/Modal';
import { Radio } from '@expcat/tigercat-react/Radio';
import { RadioGroup } from '@expcat/tigercat-react/RadioGroup';
import { SchemaForm } from '@expcat/tigercat-react/SchemaForm';
import { TabPane } from '@expcat/tigercat-react/TabPane';
import { Tabs } from '@expcat/tigercat-react/Tabs';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { Textarea } from '@expcat/tigercat-react/Textarea';
import { WorkflowDetailShell } from '@expcat/tigercat-react/WorkflowDetailShell';
import { WorkflowViewer } from '@expcat/tigercat-react/WorkflowViewer';
import { WorkflowActionBar, WorkflowTimeline } from '@expcat/tigercat-react/WorkflowTimeline';
import type {
  FieldPermission,
  FormValues,
  WorkflowActionBarItem,
  WorkflowActionPayload,
  WorkflowAssigneePickerContext,
  WorkflowTask,
} from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { ApprovalActorSwitcher } from '../components/ApprovalActorSwitcher';
import { CheckCircleIcon } from '../components/Icons';
import { normalizeInput } from '../utils';
import { ApiError } from '../utils/request';
import {
  actionSuccessMessage,
  applyApprovalAction,
  APPROVAL_DEMO_ACTOR_EVENT,
  APPROVAL_DETAIL_SCHEMA,
  APPROVAL_STATUS_META,
  actorHasOpenTask,
  approvalButtonPolicy,
  approvalFieldMode,
  approvalFormModel,
  approvalIsStarter,
  approvalReturnTargets,
  approvalViewerRole,
  contactActorOf,
  currentApprovalStep,
  FALLBACK_APPROVAL_CONTACTS,
  fetchApproval,
  fetchApprovalContacts,
  getApprovalDemoActor,
  isApprovalTerminal,
  toWorkflowSteps,
  workflowActionToPayload,
} from '../utils/approvals';
import type { ApprovalAction, ApprovalContactUser, ApprovalDetail, ApprovalStatus } from '../utils/types';

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function ApprovalDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id ? decodeURIComponent(params.id) : '';
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [acting, setActing] = useState(false);
  const [activeTab, setActiveTab] = useState('progress');
  const [actorId, setActorId] = useState(getApprovalDemoActor);
  const [contacts, setContacts] = useState<ApprovalContactUser[]>(FALLBACK_APPROVAL_CONTACTS);
  const [formModel, setFormModel] = useState<FormValues>({});
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');

  const loadContacts = useCallback(async () => {
    try {
      const payload = await fetchApprovalContacts();
      if (payload.data.users?.length) setContacts(payload.data.users);
    } catch {
      setContacts(FALLBACK_APPROVAL_CONTACTS);
    }
  }, []);

  const loadDetail = useCallback(async () => {
    if (!id) {
      setMissing(true);
      setDetail(null);
      return;
    }
    setLoading(true);
    setMissing(false);
    try {
      const payload = await fetchApproval(id);
      setDetail(payload.data);
      setFormModel(approvalFormModel(payload.data));
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 404) {
        setMissing(true);
        setDetail(null);
      } else {
        Message.error({ content: readErrorMessage(error, '审批详情加载失败'), duration: 3000 });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setActiveTab('progress');
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    void loadContacts();
    const sync = () => {
      setActorId(getApprovalDemoActor());
      void loadDetail();
    };
    window.addEventListener(APPROVAL_DEMO_ACTOR_EVENT, sync);
    return () => window.removeEventListener(APPROVAL_DEMO_ACTOR_EVENT, sync);
  }, [loadContacts, loadDetail]);

  const statusMeta = detail
    ? (APPROVAL_STATUS_META[detail.status as ApprovalStatus] ?? APPROVAL_STATUS_META.pending)
    : APPROVAL_STATUS_META.pending;
  const steps = useMemo(() => toWorkflowSteps(detail), [detail]);
  const currentStep = currentApprovalStep(detail);
  const fieldMode = approvalFieldMode(detail, actorId);
  const formSchema = useMemo(
    () =>
      applyWorkflowFieldPermissions(
        APPROVAL_DETAIL_SCHEMA,
        currentStep?.fieldPermissions as Record<string, FieldPermission> | undefined,
        fieldMode,
      ),
    [currentStep?.fieldPermissions, fieldMode],
  );
  const actionsDisabled = acting || isApprovalTerminal(detail?.status);
  const viewerRole = approvalViewerRole(detail, actorId);
  const isStarter = approvalIsStarter(detail, actorId);
  const buttonPolicy = approvalButtonPolicy(detail);
  const returnTargets = approvalReturnTargets(detail);
  const currentSignMode =
    currentStep?.signMode === 'countersign' || currentStep?.signMode === 'orsign'
      ? currentStep.signMode
      : 'sequential';
  const pickerContacts = contacts.filter((user) => user.id !== actorId && user.username !== actorId);
  const canAct = actorHasOpenTask(detail, actorId) || (currentStep?.kind === 'start' && isStarter);

  const runAction = async (action: ApprovalAction, payload?: WorkflowActionPayload) => {
    if (!detail) return;
    setActing(true);
    try {
      const result = await applyApprovalAction(detail.id, workflowActionToPayload(action, payload, formModel));
      setDetail(result.data);
      setFormModel(approvalFormModel(result.data));
      Message.success({ content: actionSuccessMessage(action), duration: 2200 });
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '审批动作失败'), duration: 3000 });
    } finally {
      setActing(false);
    }
  };

  const handleWorkflowAction = (item: WorkflowActionBarItem, payload?: WorkflowActionPayload) => {
    if (item.action === 'comment' && !payload?.comment?.trim()) {
      setCommentDraft('');
      setCommentOpen(true);
      return;
    }
    void runAction(item.action as ApprovalAction, payload);
  };

  const confirmComment = async () => {
    const comment = commentDraft.trim();
    if (!comment) {
      Message.warning({ content: '评论内容不能为空', duration: 2000 });
      return;
    }
    await runAction('comment', { comment });
    setCommentOpen(false);
  };

  const renderAssigneePicker = (ctx: WorkflowAssigneePickerContext) => {
    const selected = ctx.value?.id ?? ctx.value?.name;
    return (
      <div className="space-y-1">
        <Text size="sm" weight="medium">
          {ctx.action === 'addsign' ? '加签给' : '转交给'}
        </Text>
        <RadioGroup
          size="sm"
          value={selected}
          aria-label={ctx.action === 'addsign' ? '加签对象' : '转交对象'}
          onChange={(value) => {
            const user = pickerContacts.find((item) => item.id === String(value) || item.username === String(value));
            ctx.onChange(user ? contactActorOf(user) : undefined);
          }}>
          {pickerContacts.map((user) => (
            <Radio key={user.id} value={user.id}>
              {user.name}（{user.username}）
            </Radio>
          ))}
        </RadioGroup>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <div className="shrink-0">
      <PageHeader
        title={detail?.title ?? '审批详情'}
        subtitle="查看申请内容、审批进度，并在底部完成同意、拒绝或其他操作。"
        icon={<CheckCircleIcon size={22} />}
        tags={[{ label: statusMeta.label, variant: statusMeta.variant }]}
      />
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => navigate('/approvals')}>
          返回列表
        </Button>
        {detail?.ticketId ? (
          <Button
            variant="ghost"
            onClick={() =>
              navigate(`/tickets?ticket=${encodeURIComponent(detail.ticketId ?? '')}`)
            }>
            打开关联工单 {detail.ticketId}
          </Button>
        ) : null}
        <ApprovalActorSwitcher />
      </div>

      {missing ? (
        <Empty description="没有找到该审批实例" />
      ) : loading && !detail ? (
        <Text color="secondary">正在加载审批详情…</Text>
      ) : detail ? (
        <WorkflowDetailShell
          ariaLabel="审批详情"
          className="min-h-0 flex-1"
          showActions
          header={
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Text weight="bold">{detail.id}</Text>
              <Tag size="sm" variant={statusMeta.variant}>
                {statusMeta.label}
              </Tag>
              <Text size="sm" color="secondary">
                当前步骤 {currentStep?.title ?? '—'}
              </Text>
              <Text size="sm" color="secondary">
                处理人 {detail.assignee}
              </Text>
              {!canAct && !actionsDisabled ? (
                <Text size="sm" color="secondary">
                  当前身份无待办任务
                </Text>
              ) : null}
            </div>
          }
          form={
            <>
              <Text weight="bold" className="mb-3 block">
                申请表单
              </Text>
              <SchemaForm
                schema={formSchema}
                value={formModel}
                showActions={false}
                labelWidth={96}
                className="max-sm:[&_.tiger-form-item--label-left]:flex-col max-sm:[&_.tiger-form-item__label]:!w-full max-sm:[&_.tiger-form-item__label]:!pt-0 max-sm:[&_.tiger-form-item__label]:!text-start"
                ariaLabel="申请表单"
                onChange={setFormModel}
              />
            </>
          }
          tabs={
            <Tabs activeKey={activeTab} onActiveKeyChange={(key) => setActiveTab(String(key))}>
              <TabPane tabKey="progress" label="审批进度">
                <div className="min-w-0 overflow-x-auto">
                  <WorkflowTimeline steps={steps} tasks={detail.tasks as WorkflowTask[] | undefined} />
                </div>
              </TabPane>
              <TabPane tabKey="structure" label="流程结构">
                <div className="min-w-0 overflow-x-auto">
                  <WorkflowViewer steps={steps} tasks={detail.tasks as WorkflowTask[] | undefined} />
                </div>
              </TabPane>
            </Tabs>
          }
          action={
            <>
              <WorkflowActionBar
                confirm
                buttonPolicy={buttonPolicy}
                returnTargets={returnTargets}
                addsignPositions={['before', 'after']}
                currentSignMode={currentSignMode}
                isStarter={isStarter}
                viewerRole={viewerRole}
                disabled={actionsDisabled}
                renderAssigneePicker={renderAssigneePicker}
                ariaLabel="审批操作"
                onAction={handleWorkflowAction}
              />
            </>
          }
        />
      ) : null}

      <Modal
        open={commentOpen}
        title="添加评论"
        onClose={() => setCommentOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCommentOpen(false)}>
              取消
            </Button>
            <Button loading={acting} onClick={() => void confirmComment()}>
              提交评论
            </Button>
          </div>
        }>
        <Form labelWidth={72}>
          <FormItem label="意见" required>
            <Textarea
              value={commentDraft}
              rows={3}
              placeholder="请输入审批意见"
              onChange={(value) => setCommentDraft(normalizeInput(value))}
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}

export default ApprovalDetailPage;
