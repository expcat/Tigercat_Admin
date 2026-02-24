import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Modal,
  Form,
  FormItem,
  Select,
  Tag,
  Message,
} from '@expcat/tigercat-react';
import type { TableColumn } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { PermissionGuard } from '../components/PermissionGuard';
import { UsersIcon, UserPlusIcon } from '../components/Icons';
import { apiRequest, normalizeInput, debounce, getAuthHeaders } from '../utils';
import { usePermission } from '../utils/permission';
import type {
  RoleInfo,
  UserItem,
  PagedResult,
  MessageResult,
} from '../utils/types';

type UserFormData = {
  username: string;
  password: string;
  displayName: string;
  status: number;
  roleIds: number[];
};

const INITIAL_FORM: UserFormData = {
  username: '',
  password: '',
  displayName: '',
  status: 0,
  roleIds: [],
};

function UsersPage() {
  const { has: hasPerm } = usePermission();

  // ---- State ----
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增用户');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ ...INITIAL_FORM });

  // Delete state
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [batchDeleteConfirmVisible, setBatchDeleteConfirmVisible] =
    useState(false);

  // All roles for select
  const [allRoles, setAllRoles] = useState<RoleInfo[]>([]);

  // Ref to track current query state (avoids stale closures)
  const queryRef = useRef({ page: currentPage, pageSize, keyword });

  // ---- Permission checks ----
  const canEdit = hasPerm('user:edit');
  const canDelete = hasPerm('user:delete');

  // ---- API calls ----
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { page, pageSize: ps, keyword: kw } = queryRef.current;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(ps),
      });
      if (kw.trim()) {
        params.set('keyword', kw.trim());
      }
      const res = await apiRequest<PagedResult<UserItem>>(
        `/api/users?${params}`,
        {
          headers: getAuthHeaders(),
        },
      );
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch (e: any) {
      Message.error({
        content: e.message || '加载用户列表失败',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      const res = await apiRequest<{ items: RoleInfo[] }>(
        '/api/roles?pageSize=100',
        { headers: getAuthHeaders() },
      );
      setAllRoles(res.data.items.map((r: any) => ({ id: r.id, name: r.name })));
    } catch {
      setAllRoles([]);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Form submit (create / update) ----
  const handleSubmit = async () => {
    if (!modalVisible) return;

    // Validation
    if (!editingId) {
      if (!formData.username.trim()) {
        Message.error({ content: '请输入用户名', duration: 3000 });
        return;
      }
      if (!formData.password) {
        Message.error({ content: '请输入密码', duration: 3000 });
        return;
      }
      if (formData.password.length < 6) {
        Message.error({ content: '密码长度不能少于 6 位', duration: 3000 });
        return;
      }
    }

    try {
      if (editingId) {
        const body: Record<string, any> = {
          displayName: formData.displayName || null,
          status: formData.status,
          roleIds: formData.roleIds,
        };
        if (formData.password) {
          body.password = formData.password;
        }
        await apiRequest(`/api/users/${editingId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        Message.success({ content: '用户更新成功', duration: 3000 });
      } else {
        await apiRequest('/api/users', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            username: formData.username.trim(),
            password: formData.password,
            displayName: formData.displayName || null,
            roleIds: formData.roleIds,
          }),
        });
        Message.success({ content: '用户创建成功', duration: 3000 });
      }
      setModalVisible(false);
      loadUsers();
    } catch (e: any) {
      Message.error({ content: e.message || '操作失败', duration: 3000 });
    }
  };

  // ---- Delete ----
  const handleDelete = (user: UserItem) => {
    setDeletingUser(user);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    const userId = deletingUser.id;
    try {
      await apiRequest(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      Message.success({ content: '删除成功', duration: 3000 });
      setDeleteConfirmVisible(false);
      setDeletingUser(null);
      setSelectedRowKeys((prev) => prev.filter((k) => k !== userId));
      loadUsers();
    } catch (e: any) {
      Message.error({ content: e.message || '删除失败', duration: 3000 });
    }
  };

  // ---- Batch delete ----
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      Message.error({ content: '请选择要删除的用户', duration: 3000 });
      return;
    }
    setBatchDeleteConfirmVisible(true);
  };

  const confirmBatchDelete = async () => {
    try {
      const res = await apiRequest<MessageResult>('/api/users/batch-delete', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: selectedRowKeys }),
      });
      Message.success({
        content: res.data.message || '批量删除成功',
        duration: 3000,
      });
      setBatchDeleteConfirmVisible(false);
      setSelectedRowKeys([]);
      loadUsers();
    } catch (e: any) {
      Message.error({ content: e.message || '批量删除失败', duration: 3000 });
    }
  };

  // ---- Modal helpers ----
  const openCreateModal = () => {
    setEditingId(null);
    setModalTitle('新增用户');
    setFormData({ ...INITIAL_FORM });
    setModalVisible(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingId(user.id);
    setModalTitle('编辑用户');
    setFormData({
      username: user.username,
      password: '',
      displayName: user.displayName || '',
      status: user.status,
      roleIds: user.roles.map((r) => r.id),
    });
    setModalVisible(true);
  };

  // ---- Search with debounce ----
  const debouncedLoad = useMemo(
    () =>
      debounce(() => {
        queryRef.current.page = 1;
        setCurrentPage(1);
        loadUsers();
      }, 300),
    [loadUsers],
  );

  const handleSearch = (val: string) => {
    const normalized = normalizeInput(val);
    queryRef.current.keyword = normalized;
    setKeyword(normalized);
    debouncedLoad();
  };

  // ---- Table columns ----
  const columns = useMemo<TableColumn<UserItem>[]>(() => {
    const cols: TableColumn<UserItem>[] = [
      { key: 'id', title: 'ID', width: 70, align: 'center' },
      { key: 'username', title: '用户名', width: 150 },
      { key: 'displayName', title: '显示名', width: 150 },
      {
        key: 'status',
        title: '状态',
        width: 100,
        align: 'center',
        render: (record) => (
          <Tag color={record.status === 0 ? 'green' : 'red'} size="sm">
            {record.status === 0 ? '正常' : '禁用'}
          </Tag>
        ),
      },
      {
        key: 'roles',
        title: '角色',
        width: 200,
        render: (record) => {
          const roles = record.roles;
          if (!roles || roles.length === 0)
            return <span className="text-slate-400 text-sm">无角色</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((r) => (
                <Tag key={r.id} color="blue" size="sm">
                  {r.name}
                </Tag>
              ))}
            </div>
          );
        },
      },
      {
        key: 'createdAt',
        title: '创建时间',
        width: 180,
        render: (record) => (
          <span className="text-sm text-slate-600">
            {new Date(record.createdAt).toLocaleString('zh-CN')}
          </span>
        ),
      },
    ];

    if (canEdit || canDelete) {
      cols.push({
        key: 'actions',
        title: '操作',
        width: 160,
        align: 'center',
        fixed: 'right',
        render: (record) => (
          <div className="flex items-center justify-center gap-1">
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openEditModal(record)}>
                编辑
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                color="danger"
                onClick={() => handleDelete(record)}>
                删除
              </Button>
            )}
          </div>
        ),
      });
    }

    return cols;
  }, [canEdit, canDelete]);

  // ---- Pagination ----
  const paginationConfig = useMemo(
    () => ({
      current: currentPage,
      pageSize,
      total,
      showSizeChanger: true,
      showTotal: true,
      pageSizeOptions: [10, 20, 50],
    }),
    [currentPage, pageSize, total],
  );

  const handlePageChange = (page: { current: number; pageSize: number }) => {
    if (page.pageSize !== queryRef.current.pageSize) {
      queryRef.current.pageSize = page.pageSize;
      queryRef.current.page = 1;
      setPageSize(page.pageSize);
      setCurrentPage(1);
    } else {
      queryRef.current.page = page.current;
      setCurrentPage(page.current);
    }
    loadUsers();
  };

  // ---- Selection ----
  const handleSelectionChange = (keys: (string | number)[]) => {
    setSelectedRowKeys(keys as number[]);
  };

  // ---- Role select options ----
  const roleOptions = useMemo(
    () => allRoles.map((r) => ({ label: r.name, value: r.id })),
    [allRoles],
  );

  // ---- Form field helpers ----
  const setField = <K extends keyof UserFormData>(
    field: K,
    value: UserFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户管理"
        subtitle="管理平台用户账号、角色与权限"
        icon={<UsersIcon size={24} />}
        tags={[
          { label: '核心模块', color: 'blue' },
          { label: '运行中', color: 'green' },
        ]}
      />

      {/* Toolbar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              value={keyword}
              placeholder="搜索用户名或显示名..."
              onChange={(val) => handleSearch(normalizeInput(val))}
              className="w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <PermissionGuard code="user:delete">
              {selectedRowKeys.length > 0 && (
                <Button
                  color="danger"
                  variant="outline"
                  size="sm"
                  onClick={handleBatchDelete}>
                  批量删除 ({selectedRowKeys.length})
                </Button>
              )}
            </PermissionGuard>
            <PermissionGuard code="user:create">
              <Button color="primary" onClick={openCreateModal}>
                <span className="flex items-center gap-1">
                  <UserPlusIcon size={16} />
                  新增用户
                </span>
              </Button>
            </PermissionGuard>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          pagination={paginationConfig}
          rowSelection={{
            selectedRowKeys,
          }}
          rowKey="id"
          hoverable
          striped
          emptyText="暂无用户数据"
          onPageChange={handlePageChange}
          onSelectionChange={handleSelectionChange}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalVisible}
        title={modalTitle}
        okText="确定"
        cancelText="取消"
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}>
        <Form model={formData} labelWidth={88}>
          <FormItem label="用户名" name="username">
            <Input
              value={formData.username}
              placeholder="请输入用户名"
              disabled={!!editingId}
              onChange={(val) => setField('username', normalizeInput(val))}
            />
          </FormItem>
          <FormItem label="密码" name="password">
            <Input
              value={formData.password}
              type="password"
              placeholder={editingId ? '留空则不修改密码' : '请输入密码'}
              onChange={(val) => setField('password', normalizeInput(val))}
            />
          </FormItem>
          <FormItem label="显示名称" name="displayName">
            <Input
              value={formData.displayName}
              placeholder="请输入显示名称（选填）"
              onChange={(val) => setField('displayName', normalizeInput(val))}
            />
          </FormItem>
          {editingId && (
            <FormItem label="状态" name="status">
              <Select
                value={formData.status}
                options={[
                  { label: '正常', value: 0 },
                  { label: '禁用', value: 1 },
                ]}
                placeholder="请选择状态"
                onChange={(val) => setField('status', (val as number) ?? 0)}
              />
            </FormItem>
          )}
          <FormItem label="角色" name="roleIds">
            <Select
              value={formData.roleIds}
              options={roleOptions}
              placeholder="请选择角色（可多选）"
              multiple
              onChange={(val) => setField('roleIds', (val as number[]) ?? [])}
            />
          </FormItem>
        </Form>
      </Modal>

      {/* Single Delete Confirm */}
      <Modal
        open={deleteConfirmVisible}
        title="确认删除"
        okText="确认删除"
        cancelText="取消"
        onOk={confirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        role="alertdialog"
        aria-label={`确认删除用户 ${deletingUser?.username ?? ''}`}>
        <p className="text-slate-600">
          确定要删除用户
          <span className="font-semibold text-slate-800">
            {' '}
            {deletingUser?.username}{' '}
          </span>
          吗？此操作不可撤销。
        </p>
      </Modal>

      {/* Batch Delete Confirm */}
      <Modal
        open={batchDeleteConfirmVisible}
        title="确认批量删除"
        okText="确认删除"
        cancelText="取消"
        onOk={confirmBatchDelete}
        onCancel={() => setBatchDeleteConfirmVisible(false)}
        role="alertdialog"
        aria-label={`确认批量删除 ${selectedRowKeys.length} 个用户`}>
        <p className="text-slate-600">
          确定要删除选中的
          <span className="font-semibold text-slate-800">
            {' '}
            {selectedRowKeys.length}{' '}
          </span>
          个用户吗？此操作不可撤销。
        </p>
      </Modal>
    </div>
  );
}

export default UsersPage;
