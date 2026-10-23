import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { applyWorkflowFieldPermissions } from '@expcat/tigercat-core';
import { Button } from '@expcat/tigercat-react/Button';
import { Empty } from '@expcat/tigercat-react/Empty';
import { Form } from '@expcat/tigercat-react/Form';
import { FormItem } from '@expcat/tigercat-react/FormItem';
import { Message } from '@expcat/tigercat-react/Message';
import { Modal } from '@expcat/tigercat-react/Modal';
import { AssigneePicker } from '@expcat/tigercat-react/AssigneePicker';
import { Alert } from '@expcat/tigercat-react/Alert';
import { SchemaForm } from '@expcat/tigercat-react/SchemaForm';
import { TabPane } from '@expcat/tigercat-react/TabPane';
import { Tabs } from '@expcat/tigercat-react/Tabs';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { Textarea } from '@expcat/tigercat-react/Textarea';
import { WorkflowDetailShell } from '@expcat/tigercat-react/WorkflowDetailShell';
import { WorkflowViewer } from '../utils/lazyTigercat';
import { WorkflowActionBar, WorkflowTimeline } from '@expcat/tigercat-react/WorkflowTimeline';
import type {
  FieldPermission,
  FormHandle,
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
  fetchApproval,
  fetchApprovalContacts,
  getApprovalDemoActor,
  isApprovalTerminal,
  toWorkflowSteps,
  workflowActionToPayload,
} from '../utils/approvals';
import type { ApprovalAction, ApprovalActionPayload, ApprovalContactUser, ApprovalDetail, ApprovalStatus } from '../utils/types';

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function ApprovalDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id ? decodeURIComponent(params.id) : '';
  const detailController = useRef<AbortController | null>(null);
  const actingRef = useRef(false);
  const detailFormRef = useRef<FormHandle>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [failedAction, setFailedAction] = useState<ApprovalActionPayload | null>(null);
  const [contactsError, setContactsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [acting, setActing] = useState(false);
  const [activeTab, setActiveTab] = useState('progress');
  const [actorId, setActorId] = useState(getApprovalDemoActor);
  const [contacts, setContacts] = useState<ApprovalContactUser[]>([]);
  const [formModel, setFormModel] = useState<FormValues>({});
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');

  const loadContacts = useCallback(async () => {
    setContactsError('');
    try {
      const payload = await fetchApprovalContacts();
      setContacts(payload.data.users ?? []);
    } catch (error) {
      setContacts([]);
      setContactsError(readErrorMessage(error, '通讯录加载失败'));
    }
  }, []);

  const loadDetail = useCallback(async () => {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setDetail(null);
    setFormModel({});
    setCommentOpen(false);
    setCommentDraft('');
    setFailedAction(null);
    setActionError('');
    setErrorMessage('');
    setMissing(!id);
    if (!id) return;
    setLoading(true);
    try {
      const payload = await fetchApproval(id, controller.signal);
      if (controller.signal.aborted) return;
      setDetail(payload.data);
      setFormModel(approvalFormModel(payload.data));
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 404) setMissing(true);
      else setErrorMessage(error instanceof ApiError && error.status === 403
        ? '当前账号无权查看该审批' : readErrorMessage(error, '审批详情加载失败'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setActiveTab('progress');
    void loadDetail();
    return () => detailController.current?.abort();
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

  const runAction = async (body: ApprovalActionPayload): Promise<boolean> => {
    if (!detail || actingRef.current || loading || isApprovalTerminal(detail.status)) return false;
    if (body.action !== 'comment' && body.action !== 'cancel' && body.action !== 'withdraw' && !canAct) return false;
    if ((body.action === 'cancel' || body.action === 'withdraw') && !isStarter) return false;
    if ((body.comment?.length ?? 0) > 500) {
      Message.warning({ content: '审批意见最多 500 字', duration: 2000 });
      return false;
    }
    actingRef.current = true;
    const controller = detailController.current;
    try {
      if (!await detailFormRef.current?.validate()) return false;
      if (controller !== detailController.current || controller?.signal.aborted) return false;
      setActing(true);
      setActionError('');
      const result = await applyApprovalAction(detail.id, { ...body, formValues: formModel });
      if (controller !== detailController.current || controller?.signal.aborted) return false;
      setDetail(result.data);
      setFormModel(approvalFormModel(result.data));
      setFailedAction(null);
      Message.success({ content: actionSuccessMessage(body.action), duration: 2200 });
      return true;
    } catch (error: unknown) {
      if (controller !== detailController.current || controller?.signal.aborted) return false;
      setFailedAction(body);
      setActionError(readErrorMessage(error, '审批动作失败'));
      return false;
    } finally {
      actingRef.current = false;
      setActing(false);
    }
  };

  const handleWorkflowAction = (item: WorkflowActionBarItem, payload?: WorkflowActionPayload) => {
    if (actingRef.current) return;
    if (item.action === 'comment' && !payload?.comment?.trim()) {
      setCommentOpen(true);
      return;
    }
    void runAction(workflowActionToPayload(item.action as ApprovalAction, payload));
  };

  const confirmComment = async () => {
    const comment = commentDraft.trim();
    if (!comment) {
      Message.warning({ content: '评论内容不能为空', duration: 2000 });
      return;
    }
    if (await runAction({ action: 'comment', comment })) {
      setCommentOpen(false);
      setCommentDraft('');
    }
  };

  const renderAssigneePicker = (ctx: WorkflowAssigneePickerContext) => (
    <div className="space-y-1">
      <Text size="sm" weight="medium">{ctx.action === 'addsign' ? '加签给（每次一人）' : '转交给'}</Text>
      <AssigneePicker
        options={pickerContacts.map((user) => ({ id: user.id, name: `${user.name}（${user.username}）`, department: user.deptName }))}
        selectedIds={ctx.value?.id ? [String(ctx.value.id)] : []}
        locale="zh-CN"
        onChange={(ids) => {
          const user = pickerContacts.find((item) => item.id === ids[ids.length - 1]);
          ctx.onChange(user ? contactActorOf(user) : undefined);
        }}
      />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <div className="shrink-0">
        <PageHeader
          title={detail?.title ?? '审批详情'}
          subtitle="查看申请内容、审批进度，并在底部完成同意、拒绝或其他操作。"
          icon={<CheckCircleIcon size={22} />}
          tags={detail ? [{ label: statusMeta.label, variant: statusMeta.variant }] : []}
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

      {contactsError ? <div role="alert"><Alert type="error" title={contactsError} /><Button variant="outline" onClick={() => void loadContacts()}>重试通讯录</Button></div> : null}
      {actionError ? <div role="alert"><Alert type="error" title="审批动作尚未保存" description={actionError} />{failedAction && <Button disabled={acting} onClick={() => void runAction(failedAction)}>重试审批动作</Button>}</div> : null}
      {errorMessage ? <div role="alert"><Alert type="error" title={errorMessage} /><Button variant="outline" onClick={() => void loadDetail()}>重试</Button></div> : missing ? (
        <Empty description="没有找到该审批实例" />
      ) : loading && !detail ? (
        <Text color="secondary">正在加载审批详情…</Text>
      ) : detail ? (
        <WorkflowDetailShell
          ariaLabel="审批详情"
          className="min-h-[32rem] flex-1 md:min-h-0"
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
                ref={detailFormRef}
                disabled={acting}
                schema={formSchema}
                value={formModel}
                showActions={false}
                labelPosition="top"
                ariaLabel="申请表单"
                onChange={setFormModel}
              />
            </>
          }
          tabs={
            <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(String(key))}>
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
        closable={!acting}
        maskClosable={!acting}
        keyboard={!acting}
        onClose={() => { if (!acting) setCommentOpen(false); }}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={acting} onClick={() => setCommentOpen(false)}>
              取消
            </Button>
            <Button loading={acting} onClick={() => void confirmComment()}>
              提交评论
            </Button>
          </div>
        }>
        {actionError && failedAction?.action === 'comment' ? <div role="alert"><Alert type="error" title="评论尚未保存" description={actionError} /></div> : null}
        <Form labelWidth={72}>
          <FormItem label="意见" required>
            <Textarea
              value={commentDraft}
              rows={3}
              disabled={acting}
              aria-label="评论意见"
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
