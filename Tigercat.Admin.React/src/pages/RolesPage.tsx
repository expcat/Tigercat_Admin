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
import { ShieldIcon, UserPlusIcon } from '../components/Icons';
import {
  apiRequest,
  SESSION_KEY,
  safeParse,
  normalizeInput,
  debounce,
} from '../utils';
import { usePermission } from '../utils/permission';
import type { Session, PermissionInfo } from '../utils/types';

// ---- Types ----
interface RoleUserInfo {
  id: number;
  username: string;
  displayName: string | null;
}

interface RoleItem {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  permissions: PermissionInfo[];
  users: RoleUserInfo[];
}

interface PagedResult {
  items: RoleItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface MessageResult {
  message?: string;
}

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

function getAuthHeaders(): HeadersInit {
  const session = safeParse<Session>(localStorage.getItem(SESSION_KEY));
  if (!session?.token) return {};
  return { Authorization: `Bearer ${session.token}` };
}

/**
 * Build select-compatible options from a flat permission list.
 */
function buildPermissionOptions(
  permissions: PermissionInfo[],
): { label: string; value: number }[] {
  return permissions.map((p) => ({
    label: p.description ? `${p.code}（${p.description}）` : p.code,
    value: p.id,
  }));
}

function RolesPage() {
  const { has: hasPerm } = usePermission();

  // ---- State ----
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

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
  const [permEditingRole, setPermEditingRole] = useState<RoleItem | null>(null);
  const [permSelectedIds, setPermSelectedIds] = useState<number[]>([]);

  // All available permissions for select
  const [allPermissions, setAllPermissions] = useState<PermissionInfo[]>([]);

  // Refs to track current query state (avoids stale closures)
  const currentPageRef = useRef(currentPage);
  const pageSizeRef = useRef(pageSize);
  const keywordRef = useRef(keyword);

  // ---- Permission checks ----
  const canEdit = hasPerm('role:edit');
  const canDelete = hasPerm('role:delete');

  // ---- API calls ----
  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPageRef.current),
        pageSize: String(pageSizeRef.current),
      });
      if (keywordRef.current.trim()) {
        params.set('keyword', keywordRef.current.trim());
      }
      const res = await apiRequest<PagedResult>(`/api/roles?${params}`, {
        headers: getAuthHeaders(),
      });
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
      const res = await apiRequest<PermissionInfo[]>(
        '/api/roles/permissions',
        { headers: getAuthHeaders() },
      );
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
    setPermEditingRole(role);
    setPermSelectedIds(role.permissions.map((p) => p.id));
    setPermModalVisible(true);
  };

  const handlePermSubmit = async () => {
    if (!permEditingRole) return;
    try {
      await apiRequest(`/api/roles/${permEditingRole.id}/permissions`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ permissionIds: permSelectedIds }),
      });
      Message.success({ content: '权限配置已保存', duration: 3000 });
      setPermModalVisible(false);
      setPermEditingRole(null);
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
        currentPageRef.current = 1;
        setCurrentPage(1);
        loadRoles();
      }, 300),
    [loadRoles],
  );

  const handleSearch = (val: string) => {
    const normalized = normalizeInput(val);
    keywordRef.current = normalized;
    setKeyword(normalized);
    debouncedLoad();
  };

  // ---- Table columns ----
  const permissionOptions = useMemo(
    () => buildPermissionOptions(allPermissions),
    [allPermissions],
  );

  const columns = useMemo<TableColumn<RoleItem>[]>(() => {
    const cols: TableColumn<RoleItem>[] = [
      { key: 'id', title: 'ID', width: 70, align: 'center' },
      { key: 'name', title: '角色名称', width: 150 },
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
            {record.permissions.length}
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
            {record.users.length}
          </Tag>
        ),
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
    if (page.pageSize !== pageSizeRef.current) {
      pageSizeRef.current = page.pageSize;
      currentPageRef.current = 1;
      setPageSize(page.pageSize);
      setCurrentPage(1);
    } else {
      currentPageRef.current = page.current;
      setCurrentPage(page.current);
    }
    loadRoles();
  };

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
          rowKey="id"
          hoverable
          striped
          emptyText="暂无角色数据"
          onPageChange={handlePageChange}
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
        title={`权限配置 — ${permEditingRole?.name ?? ''}`}
        okText="保存"
        cancelText="取消"
        onOk={handlePermSubmit}
        onCancel={() => setPermModalVisible(false)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            为角色 <span className="font-semibold text-slate-700">{permEditingRole?.name}</span> 配置权限，勾选的权限将在保存后立即生效。
          </p>
          <Select
            value={permSelectedIds}
            options={permissionOptions}
            placeholder="请选择权限（可多选）"
            multiple
            onChange={(val) => setPermSelectedIds((val as number[]) ?? [])}
          />
          {permSelectedIds.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {permSelectedIds.map((pid) => {
                const perm = allPermissions.find((p) => p.id === pid);
                return perm ? (
                  <Tag key={perm.id} color="blue" size="sm">
                    {perm.code}
                  </Tag>
                ) : null;
              })}
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
