import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Button } from '@expcat/tigercat-react/Button';
import { DataTableWithToolbar } from '@expcat/tigercat-react/DataTableWithToolbar';
import { Message } from '@expcat/tigercat-react/Message';
import { Modal } from '@expcat/tigercat-react/Modal';
import { SchemaForm } from '@expcat/tigercat-react/SchemaForm';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { Tag } from '@expcat/tigercat-react/Tag';
import type { FormHandle, FormValues, TableColumn } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { ApprovalActorSwitcher } from '../components/ApprovalActorSwitcher';
import { CheckCircleIcon } from '../components/Icons';
import {
  APPROVAL_CREATE_SCHEMA,
  APPROVAL_DEMO_ACTOR_EVENT,
  APPROVAL_LANES,
  APPROVAL_PAGE_SIZE,
  APPROVAL_STATUS_META,
  approvalCreateFromValues,
  createApproval,
  EMPTY_APPROVAL_CREATE,
  fetchApprovals,
  fetchApprovalContacts,
  isApprovalLane,
} from '../utils/approvals';
import type { ApprovalLane, ApprovalListItem, ApprovalStatus, ApprovalContactUser } from '../utils/types';

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function ApprovalsPage() {
  const navigate = useNavigate();
  const createFormRef = useRef<FormHandle>(null);
  const listController = useRef<AbortController | null>(null);
  const creatingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [contactsError, setContactsError] = useState('');
  const [contacts, setContacts] = useState<ApprovalContactUser[]>([]);
  const [lane, setLane] = useState<ApprovalLane>('todo');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APPROVAL_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApprovalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormValues>({ ...EMPTY_APPROVAL_CREATE });

  const createSchema = useMemo(() => ({
    ...APPROVAL_CREATE_SCHEMA,
    fields: APPROVAL_CREATE_SCHEMA.fields?.map((field) => field.name === 'assignee'
      ? { ...field, options: contacts.map((user) => ({ value: user.id, label: `${user.name}（${user.username}）` })) }
      : field),
  }), [contacts]);

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

  const loadList = useCallback(async () => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    setLoading(true);
    setErrorMessage('');
    setItems([]);
    setTotal(0);
    try {
      const payload = await fetchApprovals({ lane, keyword, page, pageSize }, controller.signal);
      if (controller.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(payload.data.total / pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setItems(payload.data.items ?? []);
      setTotal(payload.data.total ?? 0);
    } catch (error: unknown) {
      if (!controller.signal.aborted) setErrorMessage(readErrorMessage(error, '审批列表加载失败'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [keyword, lane, page, pageSize]);

  useEffect(() => {
    void loadList();
    return () => listController.current?.abort();
  }, [loadList]);

  useEffect(() => { void loadContacts(); }, [loadContacts]);
  useEffect(() => {
    const reload = () => { setPage(1); void loadList(); };
    window.addEventListener(APPROVAL_DEMO_ACTOR_EVENT, reload);
    return () => window.removeEventListener(APPROVAL_DEMO_ACTOR_EVENT, reload);
  }, [loadList]);

  const openDetail = (id: string) => {
    navigate(`/approvals/${encodeURIComponent(id)}`);
  };

  const handleCreate = async () => {
    if (creatingRef.current) return;
    const valid = await createFormRef.current?.validate();
    if (!valid || creatingRef.current) return;
    const body = approvalCreateFromValues(createForm);
    if (!body.title) {
      Message.warning({ content: '请填写审批标题', duration: 2000 });
      return;
    }
    if (!contacts.some((user) => user.id === body.assignee)) {
      Message.warning({ content: '请从通讯录选择处理人', duration: 2000 });
      return;
    }
    creatingRef.current = true;
    setCreating(true);
    try {
      const payload = await createApproval(body);
      setCreateOpen(false);
      setCreateForm({ ...EMPTY_APPROVAL_CREATE });
      createFormRef.current?.resetFields();
      Message.success({ content: '已发起审批', duration: 2000 });
      navigate(`/approvals/${encodeURIComponent(payload.data.id)}`);
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '发起审批失败'), duration: 3000 });
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const columns = useMemo<TableColumn<ApprovalListItem>[]>(
    () => [
      {
        key: 'id',
        title: '单号',
        width: 120,
        hideInCard: true,
        render: (record) => <span className="font-mono text-sm">{record.id}</span>,
      },
      {
        key: 'title',
        title: '标题',
        cardTitle: true,
        render: (record) => (
          <Button variant="link" className="h-auto px-0 py-0 text-left" onClick={() => openDetail(record.id)}>
            {record.title}
          </Button>
        ),
      },
      {
        key: 'category',
        title: '类型',
        width: 100,
        render: (record) => record.category,
      },
      {
        key: 'starter',
        title: '发起人',
        width: 120,
        render: (record) => record.starter,
      },
      {
        key: 'assignee',
        title: '处理人',
        width: 120,
        render: (record) => record.assignee,
      },
      {
        key: 'status',
        title: '状态',
        width: 110,
        render: (record) => {
          const meta = APPROVAL_STATUS_META[record.status as ApprovalStatus] ?? APPROVAL_STATUS_META.pending;
          return (
            <Tag variant={meta.variant} size="sm">
              {meta.label}
            </Tag>
          );
        },
      },
      {
        key: 'currentStepTitle',
        title: '当前步骤',
        width: 140,
        render: (record) => record.currentStepTitle ?? '—',
      },
      {
        key: 'updatedAt',
        title: '更新时间',
        width: 160,
        render: (record) => <span className="p2-text-secondary text-sm">{record.updatedAt}</span>,
      },
      {
        key: 'actions',
        title: '操作',
        width: 100,
        align: 'center',
        fixed: 'end',
        render: (record) => (
          <Button size="sm" variant="ghost" onClick={() => openDetail(record.id)}>
            查看
          </Button>
        ),
      },
    ],
    [],
  );

  const toolbar = useMemo(
    () => ({
      searchMode: 'remote' as const,
      searchValue: keyword,
      searchPlaceholder: '搜索标题或单号',
      onSearchChange: (value: string) => {
        setKeyword(value);
        setPage(1);
      },
      onSearch: (value: string) => {
        setKeyword(value);
        setPage(1);
      },
    }),
    [keyword],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="审批中心"
        subtitle="待办、已办、抄送与我发起的申请。可按身份切换当前处理人。"
        icon={<CheckCircleIcon size={22} />}
        tags={[{ label: 'Mock 流转', variant: 'info' }]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={lane}
          options={APPROVAL_LANES}
          onChange={(value) => {
            const next = String(value);
            if (!isApprovalLane(next)) return;
            setLane(next);
            setPage(1);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ApprovalActorSwitcher />
          <Button onClick={() => setCreateOpen(true)}>发起审批</Button>
        </div>
      </div>

      {errorMessage ? <div role="alert"><Alert type="error" title={errorMessage} /><Button variant="outline" onClick={() => void loadList()}>重试</Button></div> : null}
      <DataTableWithToolbar
        columns={columns as unknown as TableColumn<Record<string, unknown>>[]}
        dataSource={items as unknown as Record<string, unknown>[]}
        loading={loading}
        rowKey="id"
        hoverable
        striped
        responsiveMode="card"
        cardBreakpoint="md"
        emptyText="当前列表没有审批"
        pagination={{
          remote: true,
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: true,
        }}
        toolbar={toolbar}
        onPageChange={({ current, pageSize: nextSize }) => {
          if (nextSize !== pageSize) return;
          setPage(current);
        }}
        onPageSizeChange={({ pageSize: nextSize }) => {
          setPageSize(nextSize);
          setPage(1);
        }}
      />

      <Modal
        open={createOpen}
        title="发起审批"
        closable={!creating}
        maskClosable={!creating}
        keyboard={!creating}
        onClose={() => { if (!creating) setCreateOpen(false); }}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={creating} onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button loading={creating} onClick={() => void handleCreate()}>
              提交
            </Button>
          </div>
        }>
        {contactsError ? <div role="alert"><Alert type="error" title={contactsError} /><Button variant="outline" onClick={() => void loadContacts()}>重试通讯录</Button></div> : null}
        <SchemaForm
          disabled={creating}
          ref={createFormRef}
          schema={createSchema}
          value={createForm}
          showActions={false}
          labelPosition="top"
          ariaLabel="发起审批表单"
          onChange={setCreateForm}
        />
      </Modal>
    </div>
  );
}

export default ApprovalsPage;
