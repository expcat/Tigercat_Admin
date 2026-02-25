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
  Checkbox,
  Tag,
  Message,
  Popover,
} from '@expcat/tigercat-react';
import type { TableColumn, SortState } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { PermissionGuard } from '../components/PermissionGuard';
import { ShieldIcon, UserPlusIcon, SettingsIcon } from '../components/Icons';
import { apiRequest, normalizeInput, debounce, getAuthHeaders } from '../utils';
import { usePermission } from '../utils/permission';
import type {
  PermissionInfo,
  RoleUserInfo,
  RoleItem,
  MessageResult,
} from '../utils/types';
import {
  GROUP_LABELS,
  buildPermissionGroups,
  toggleGroupPerms,
  isGroupAllChecked,
  isGroupPartialChecked,
} from '../utils/permission-helpers';

type RoleFormData = {
  name: string;
  description: string;
  permissionIds: number[];
};

const INITIAL_FORM: RoleFormData = {
  name: '',
  description: '',
  permissionIds: [],
};

function RolesPage() {
  const { has: hasPerm } = usePermission();

  // ---- State ----
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Sort state (controlled)
  const [sortState, setSortState] = useState<SortState>({ key: null, direction: null });

  // Column visibility
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // Modal state — create / edit
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增角色');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({ ...INITIAL_FORM });

  // Delete state
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleItem | null>(null);

  // Permission configuration modal
  const [permModalVisible, setPermModalVisible] = useState(false);
  const [permConfigRole, setPermConfigRole] = useState<RoleItem | null>(null);
  const [permConfigIds, setPermConfigIds] = useState<number[]>([]);

  // All available permissions for select
  const [allPermissions, setAllPermissions] = useState<PermissionInfo[]>([]);

  // Ref to track current query state (avoids stale closures)
  const queryRef = useRef({
    page: currentPage,
    pageSize,
    keyword,
    sortState: { key: null, direction: null } as SortState,
  });

  // ---- Permission checks ----
  const canEdit = hasPerm('role:edit');
  const canDelete = hasPerm('role:delete');

  // ---- API calls ----
  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { page, pageSize: ps, keyword: kw, sortState: ss } = queryRef.current;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(ps),
      });
      if (kw.trim()) {
        params.set('keyword', kw.trim());
      }
      if (ss.key && ss.direction) {
        params.set('sortBy', ss.key);
        params.set('sortOrder', ss.direction);
      }
      const res = await apiRequest<PagedResult<RoleItem>>(
        `/api/roles?${params}`,
        {
          headers: getAuthHeaders(),
        },
      );
      setRoles(res.data.items);
      setTotal(res.data.total);
    } catch (e: any) {
      Message.error({
        content: e.message || '加载角色列表失败',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    try {
      const res = await apiRequest<PermissionInfo[]>('/api/roles/permissions', {
        headers: getAuthHeaders(),
      });
      setAllPermissions(res.data ?? []);
    } catch {
      setAllPermissions([]);
    }
  }, []);

  useEffect(() => {
    loadRoles();
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Form submit (create / update) ----
  const handleSubmit = async () => {
    if (!modalVisible) return;

    if (!formData.name.trim()) {
      Message.error({ content: '请输入角色名称', duration: 3000 });
      return;
    }
    if (formData.name.trim().length < 2 || formData.name.trim().length > 50) {
      Message.error({
        content: '角色名称长度需在 2-50 个字符之间',
        duration: 3000,
      });
      return;
    }
    if (formData.description && formData.description.length > 200) {
      Message.error({ content: '描述长度不能超过 200 字符', duration: 3000 });
      return;
    }

    try {
      if (editingId) {
        await apiRequest(`/api/roles/${editingId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description || null,
            permissionIds: formData.permissionIds,
          }),
        });
        Message.success({ content: '角色更新成功', duration: 3000 });
      } else {
        await apiRequest('/api/roles', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description || null,
            permissionIds: formData.permissionIds,
          }),
        });
        Message.success({ content: '角色创建成功', duration: 3000 });
      }
      setModalVisible(false);
      loadRoles();
    } catch (e: any) {
      Message.error({ content: e.message || '操作失败', duration: 3000 });
    }
  };

  // ---- Delete ----
  const handleDelete = (role: RoleItem) => {
    setDeletingRole(role);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!deletingRole) return;
    try {
      await apiRequest<MessageResult>(`/api/roles/${deletingRole.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      Message.success({ content: '删除成功', duration: 3000 });
      setDeleteConfirmVisible(false);
      setDeletingRole(null);
      loadRoles();
    } catch (e: any) {
      Message.error({ content: e.message || '删除失败', duration: 3000 });
    }
  };

  // ---- Permission configuration ----
  const openPermModal = (role: RoleItem) => {
    setPermConfigRole(role);
    setPermConfigIds(role.permissions.map((p) => p.id));
    setPermModalVisible(true);
  };

  const handlePermSubmit = async () => {
    if (!permConfigRole) return;
    try {
      await apiRequest(`/api/roles/${permConfigRole.id}/permissions`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ permissionIds: permConfigIds }),
      });
      Message.success({ content: '权限配置已保存', duration: 3000 });
      setPermModalVisible(false);
      setPermConfigRole(null);
      loadRoles();
    } catch (e: any) {
      Message.error({
        content: e.message || '权限配置失败',
        duration: 3000,
      });
    }
  };

  // ---- Modal helpers ----
  const openCreateModal = () => {
    setEditingId(null);
    setModalTitle('新增角色');
    setFormData({ ...INITIAL_FORM });
    setModalVisible(true);
  };

  const openEditModal = (role: RoleItem) => {
    setEditingId(role.id);
    setModalTitle('编辑角色');
    setFormData({
      name: role.name,
      description: role.description || '',
      permissionIds: role.permissions.map((p) => p.id),
    });
    setModalVisible(true);
  };

  // ---- Search with debounce ----
  const debouncedLoad = useMemo(
    () =>
      debounce(() => {
        queryRef.current.page = 1;
        setCurrentPage(1);
        loadRoles();
      }, 300),
    [loadRoles],
  );

  const handleSearch = (val: string) => {
    const normalized = normalizeInput(val);
    queryRef.current.keyword = normalized;
    setKeyword(normalized);
    debouncedLoad();
  };

  // ---- Column visibility ----
  const ALL_COLUMN_KEYS = useMemo(
    () => ['id', 'name', 'description', 'permissions', 'users', 'createdAt', 'actions'] as const,
    [],
  );

  const columnLabels: Record<string, string> = useMemo(
    () => ({
      id: 'ID',
      name: '角色名称',
      description: '描述',
      permissions: '权限数',
      users: '关联用户',
      createdAt: '创建时间',
      actions: '操作',
    }),
    [],
  );

  const toggleColumn = useCallback((key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // ---- Table columns ----
  const permissionOptions = useMemo(
    () =>
      allPermissions.map((p) => ({
        label: p.description ? `${p.code}(${p.description})` : p.code,
        value: p.id,
      })),
    [allPermissions],
  );

  const columns = useMemo<TableColumn<RoleItem>[]>(() => {
    const cols: TableColumn<RoleItem>[] = [
      { key: 'id', title: 'ID', width: 70, align: 'center', sortable: true },
      { key: 'name', title: '角色名称', width: 150, sortable: true },
      {
        key: 'description',
        title: '描述',
        width: 200,
        render: (record) => (
          <span className="text-sm text-slate-600">
            {record.description || '-'}
          </span>
        ),
      },
      {
        key: 'permissions',
        title: '权限数',
        width: 100,
        align: 'center',
        render: (record) => (
          <Tag color="blue" size="sm">
            {record.permissions.length} 项
          </Tag>
        ),
      },
      {
        key: 'users',
        title: '关联用户',
        width: 100,
        align: 'center',
        render: (record) => (
          <Tag color="purple" size="sm">
            {record.users.length} 人
          </Tag>
        ),
      },
      {
        key: 'createdAt',
        title: '创建时间',
        width: 180,
        sortable: true,
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
        width: 220,
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
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                color="primary"
                onClick={() => openPermModal(record)}>
                权限
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

    // Filter out hidden columns
    return cols.filter((c) => !hiddenColumns.has(c.key));
  }, [canEdit, canDelete, hiddenColumns]);

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
    loadRoles();
  };

  // ---- Sort ----
  const handleSortChange = useCallback(
    (next: SortState) => {
      setSortState(next);
      queryRef.current.sortState = next;
      queryRef.current.page = 1;
      setCurrentPage(1);
      loadRoles();
    },
    [loadRoles],
  );

  // ---- Form field helpers ----
  const setField = <K extends keyof RoleFormData>(
    field: K,
    value: RoleFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="角色管理"
        subtitle="维护平台角色与权限配置"
        icon={<ShieldIcon size={24} />}
        tags={[
          { label: '权限中心', color: 'blue' },
          { label: '已启用', color: 'green' },
        ]}
      />

      {/* Toolbar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              value={keyword}
              placeholder="搜索角色名称或描述..."
              onChange={(val) => handleSearch(normalizeInput(val))}
              className="w-64"
            />
            <Popover
              trigger="click"
              placement="bottom-end"
              width={180}
              contentContent={
                <div className="space-y-2">
                  {ALL_COLUMN_KEYS.filter((k) => k !== 'actions' || canEdit || canDelete).map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-800">
                      <Checkbox
                        checked={!hiddenColumns.has(key)}
                        onChange={() => toggleColumn(key)}
                      />
                      <span>{columnLabels[key] || key}</span>
                    </label>
                  ))}
                </div>
              }>
              <Button variant="outline" size="sm">
                <span className="flex items-center gap-1">
                  <SettingsIcon size={14} />
                  列显隐
                </span>
              </Button>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGuard code="role:create">
              <Button color="primary" onClick={openCreateModal}>
                <span className="flex items-center gap-1">
                  <UserPlusIcon size={16} />
                  新增角色
                </span>
              </Button>
            </PermissionGuard>
          </div>
        </div>
      </Card>

      {/* Roles Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={roles}
          loading={loading}
          pagination={paginationConfig}
          sort={sortState}
          columnLockable
          rowKey="id"
          hoverable
          striped
          emptyText="暂无角色数据"
          onPageChange={handlePageChange}
          onSortChange={handleSortChange}
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
          <FormItem label="角色名称" name="name">
            <Input
              value={formData.name}
              placeholder="请输入角色名称"
              onChange={(val) => setField('name', normalizeInput(val))}
            />
          </FormItem>
          <FormItem label="描述" name="description">
            <Input
              value={formData.description}
              placeholder="请输入角色描述（选填）"
              onChange={(val) => setField('description', normalizeInput(val))}
            />
          </FormItem>
          <FormItem label="权限" name="permissionIds">
            <Select
              value={formData.permissionIds}
              options={permissionOptions}
              placeholder="请选择权限（可多选）"
              multiple
              onChange={(val) =>
                setField('permissionIds', (val as number[]) ?? [])
              }
            />
          </FormItem>
        </Form>
      </Modal>

      {/* Permission Configuration Modal */}
      <Modal
        open={permModalVisible}
        title={`权限配置 — ${permConfigRole?.name ?? ''}`}
        okText="保存"
        cancelText="取消"
        onOk={handlePermSubmit}
        onCancel={() => setPermModalVisible(false)}>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(buildPermissionGroups(allPermissions)).map(
            ([group, perms]) => (
              <div
                key={group}
                className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={isGroupAllChecked(perms, permConfigIds)}
                    indeterminate={isGroupPartialChecked(perms, permConfigIds)}
                    onChange={() =>
                      setPermConfigIds(toggleGroupPerms(perms, permConfigIds))
                    }
                  />
                  <span className="font-medium text-slate-700 text-sm">
                    {GROUP_LABELS[group] || group}
                  </span>
                  <Tag color="blue" size="sm">
                    {perms.filter((p) => permConfigIds.includes(p.id)).length} /{' '}
                    {perms.length}
                  </Tag>
                </div>
                <div className="grid grid-cols-2 gap-2 ml-6">
                  {perms.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-800">
                      <Checkbox
                        checked={permConfigIds.includes(perm.id)}
                        onChange={(checked) => {
                          if (checked) {
                            setPermConfigIds([...permConfigIds, perm.id]);
                          } else {
                            setPermConfigIds(
                              permConfigIds.filter((id) => id !== perm.id),
                            );
                          }
                        }}
                      />
                      <span>{perm.description || perm.code}</span>
                      <span className="text-xs text-slate-400">
                        ({perm.code})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ),
          )}
          {allPermissions.length === 0 && (
            <div className="text-center text-slate-400 py-4">
              暂无可配置的权限
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteConfirmVisible}
        title="确认删除"
        okText="确认删除"
        cancelText="取消"
        onOk={confirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        role="alertdialog"
        aria-label={`确认删除角色 ${deletingRole?.name ?? ''}`}>
        <p className="text-slate-600">
          确定要删除角色
          <span className="font-semibold text-slate-800">
            {' '}
            {deletingRole?.name}{' '}
          </span>
          吗？此操作不可撤销。
        </p>
      </Modal>
    </div>
  );
}

export default RolesPage;
