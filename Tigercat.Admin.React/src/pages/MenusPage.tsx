import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Empty } from '@expcat/tigercat-react/Empty';
import { Form } from '@expcat/tigercat-react/Form';
import { FormItem } from '@expcat/tigercat-react/FormItem';
import { Input } from '@expcat/tigercat-react/Input';
import { Menu } from '@expcat/tigercat-react/Menu';
import { Message } from '@expcat/tigercat-react/Message';
import { Modal } from '@expcat/tigercat-react/Modal';
import { Popconfirm } from '@expcat/tigercat-react/Popconfirm';
import { Select } from '@expcat/tigercat-react/Select';
import { Switch } from '@expcat/tigercat-react/Switch';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { Tree } from '@expcat/tigercat-react/Tree';
import type { TreeNodeKey } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { PermissionGuard } from '../components/PermissionGuard';
import { MenuIcon } from '../components/Icons';
import { normalizeInput } from '../utils';
import { usePermission } from '../utils/permission';
import { resetShellMenuSchema } from '../utils/shell-navigation';
import type { MenuSchemaPayload, RoleItem } from '../utils/types';
import {
  collectDescendantKeys,
  createMenuNode,
  defaultCreateForm,
  deleteMenuNode,
  EMPTY_MENU_FORM,
  fetchMenuSchema,
  fetchRoleDetail,
  fetchRolesForPreview,
  findMenuNode,
  formFromNode,
  formToWrite,
  isMenuRootKey,
  MENU_ICON_OPTIONS,
  parentSelectOptions,
  previewMenuItems,
  previewRouteCount,
  schemaNodes,
  toMenuTreeData,
  updateMenuNode,
  type MenuNodeForm,
} from '../utils/menus';

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function MenusPage() {
  const { has: hasPerm } = usePermission();
  const canDelete = hasPerm('menu:delete');

  const [schema, setSchema] = useState<MenuSchemaPayload>({
    items: [],
    bottomItems: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增菜单节点');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formData, setFormData] = useState<MenuNodeForm>({ ...EMPTY_MENU_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [previewRoleId, setPreviewRoleId] = useState<number | null>(null);
  const [previewCodes, setPreviewCodes] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const treeData = useMemo(() => toMenuTreeData(schema), [schema]);
  const selectedKeys = selectedKey ? [selectedKey] : [];
  const selectedNode = useMemo(
    () =>
      selectedKey && !isMenuRootKey(selectedKey)
        ? findMenuNode(schemaNodes(schema), selectedKey)
        : undefined,
    [schema, selectedKey],
  );
  const canDeleteSelected = Boolean(
    canDelete
      && selectedNode
      && selectedNode.key !== 'home'
      && !(selectedNode.children && selectedNode.children.length > 0),
  );
  const parentOptions = useMemo(() => {
    const exclude = editingKey
      ? [
          editingKey,
          ...collectDescendantKeys(
            findMenuNode(schemaNodes(schema), editingKey) ?? { key: editingKey },
          ),
        ]
      : [];
    return parentSelectOptions(schema, exclude);
  }, [editingKey, schema]);
  const roleOptions = useMemo(
    () => roles.map((role) => ({ label: role.name, value: role.id })),
    [roles],
  );
  const previewItems = useMemo(
    () => previewMenuItems(schema.items, previewCodes),
    [previewCodes, schema.items],
  );
  const previewRouteTotal =
    previewRoleId == null ? 0 : previewRouteCount(schemaNodes(schema), previewCodes);

  const loadSchema = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMenuSchema();
      setSchema(res.data);
      setSelectedKey((current) => {
        if (!current || isMenuRootKey(current)) return current;
        return findMenuNode(schemaNodes(res.data), current) ? current : null;
      });
    } catch (error: unknown) {
      Message.error({
        content: readErrorMessage(error, '菜单 schema 加载失败'),
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    setPreviewError('');
    try {
      const res = await fetchRolesForPreview();
      setRoles(res.data.items);
    } catch (error: unknown) {
      setPreviewError(
        readErrorMessage(error, '角色列表加载失败，预览需要 role:view'),
      );
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadSchema(), loadRoles()]);
  }, [loadRoles, loadSchema]);

  const handleSelectedKeys = (keys: TreeNodeKey[]) => {
    setSelectedKey(keys.length ? String(keys[0]) : null);
  };

  const openCreate = () => {
    setModalTitle('新增菜单节点');
    setEditingKey(null);
    setFormData(defaultCreateForm(selectedKey));
    setModalVisible(true);
  };

  const openEdit = () => {
    if (!selectedNode) {
      Message.warning({ content: '请先选择要编辑的节点', duration: 2000 });
      return;
    }
    setModalTitle('编辑菜单节点');
    setEditingKey(selectedNode.key);
    setFormData(formFromNode(schema, selectedNode));
    setModalVisible(true);
  };

  const submitForm = async () => {
    if (!editingKey && !formData.key.trim()) {
      Message.warning({ content: '请输入菜单节点 key', duration: 2000 });
      return;
    }
    setSubmitting(true);
    try {
      if (editingKey) {
        await updateMenuNode(editingKey, formToWrite(formData, false));
        Message.success({ content: '菜单节点已更新', duration: 2000 });
      } else {
        await createMenuNode(formToWrite(formData, true));
        Message.success({ content: '菜单节点已创建', duration: 2000 });
      }
      setModalVisible(false);
      resetShellMenuSchema();
      await loadSchema();
    } catch (error: unknown) {
      Message.error({
        content: readErrorMessage(error, '保存失败'),
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNode) return;
    try {
      await deleteMenuNode(selectedNode.key);
      Message.success({ content: '菜单节点已删除', duration: 2000 });
      setSelectedKey(null);
      resetShellMenuSchema();
      await loadSchema();
    } catch (error: unknown) {
      Message.error({
        content: readErrorMessage(error, '删除失败'),
        duration: 3000,
      });
    }
  };

  const handlePreviewRoleChange = async (value: unknown) => {
    const id = typeof value === 'number' ? value : Number(value);
    const nextId = Number.isFinite(id) ? id : null;
    setPreviewRoleId(nextId);
    setPreviewCodes([]);
    if (!nextId) return;
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const res = await fetchRoleDetail(nextId);
      setPreviewCodes((res.data.permissions ?? []).map((item) => item.code));
    } catch (error: unknown) {
      setPreviewError(readErrorMessage(error, '角色权限加载失败'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const patchForm = (patch: Partial<MenuNodeForm>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="菜单管理"
        subtitle="维护侧栏 MenuSchema，并用角色权限预览过滤后的菜单。"
        icon={<MenuIcon size={24} />}
        tags={[{ label: '轻页', variant: 'info' }]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Text weight="medium">菜单树</Text>
            <div className="flex flex-wrap items-center gap-2">
              <PermissionGuard code="menu:create">
                <Button size="sm" onClick={openCreate}>
                  新增节点
                </Button>
              </PermissionGuard>
              <PermissionGuard code="menu:edit">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedNode}
                  onClick={openEdit}>
                  编辑
                </Button>
              </PermissionGuard>
              {canDelete ? (
                <Popconfirm
                  title="确认删除菜单节点"
                  description={`将删除「${selectedNode?.label || selectedNode?.key || ''}」，此操作不可撤销。`}
                  okText="删除"
                  cancelText="取消"
                  okType="danger"
                  disabled={!canDeleteSelected}
                  onConfirm={() => {
                    void handleDelete();
                  }}>
                  <Button
                    size="sm"
                    variant="outline"
                    danger
                    disabled={!canDeleteSelected}>
                    删除
                  </Button>
                </Popconfirm>
              ) : null}
            </div>
          </div>
          <Text size="sm" color="secondary" className="mb-3 block">
            选择节点后可新增子项、编辑或删除。仪表盘节点不可删除；有子节点时请先删子项。
          </Text>
          {loading ? (
            <div className="p2-text-secondary mb-3">菜单树加载中...</div>
          ) : null}
          <Tree
            treeData={treeData}
            selectedKeys={selectedKeys}
            defaultExpandAll
            blockNode
            searchable
            ariaLabel="菜单树"
            emptyText="暂无菜单节点"
            onSelectedKeysChange={handleSelectedKeys}
          />
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Text weight="medium">角色预览</Text>
            {previewRoleId != null ? (
              <Tag size="sm" variant="primary">
                {previewRouteTotal} 条路由记录
              </Tag>
            ) : null}
          </div>
          <Text size="sm" color="secondary" className="mb-3 block">
            使用 filterMenuByPermission 与 menuSchemaToMenuItems
            按角色权限过滤，不裁剪服务端 schema。
          </Text>
          <Select
            value={previewRoleId ?? undefined}
            options={roleOptions}
            placeholder="选择角色预览"
            disabled={Boolean(previewError) && roles.length === 0}
            className="mb-3"
            onChange={handlePreviewRoleChange}
          />
          {previewError ? (
            <Text size="sm" color="danger" className="mb-3 block">
              {previewError}
            </Text>
          ) : null}
          {!previewRoleId ? (
            <Empty description="选择一个角色，查看该角色侧栏会看到的菜单" />
          ) : previewLoading ? (
            <div className="p2-text-secondary py-8 text-center">预览加载中...</div>
          ) : previewItems.length === 0 ? (
            <Empty description="该角色过滤后没有可见菜单" />
          ) : (
            <Menu
              mode="inline"
              items={previewItems}
              selectedKeys={[]}
              aria-label="角色菜单预览"
            />
          )}
        </Card>
      </div>

      <Modal
        open={modalVisible}
        title={modalTitle}
        showDefaultFooter
        okText={submitting ? '保存中…' : '确定'}
        cancelText="取消"
        onOk={() => {
          void submitForm();
        }}
        onCancel={() => setModalVisible(false)}>
        <div className="p2-modal-scroll">
          <Form labelWidth={96}>
            <FormItem label="Key" required>
              <Input
                value={formData.key}
                placeholder="例如 reports"
                disabled={Boolean(editingKey)}
                onChange={(value) => patchForm({ key: normalizeInput(value) })}
              />
            </FormItem>
            <FormItem label="显示名">
              <Input
                value={formData.label}
                placeholder="请输入显示名"
                onChange={(value) => patchForm({ label: normalizeInput(value) })}
              />
            </FormItem>
            <FormItem label="图标">
              <Select
                value={formData.icon}
                options={MENU_ICON_OPTIONS}
                placeholder="选择图标"
                onChange={(value) => patchForm({ icon: String(value ?? 'menu') })}
              />
            </FormItem>
            <FormItem label="路径">
              <Input
                value={formData.path}
                placeholder="例如 /help"
                onChange={(value) => patchForm({ path: normalizeInput(value) })}
              />
            </FormItem>
            <FormItem label="权限码">
              <Input
                value={formData.permission}
                placeholder="例如 menu:view，可空"
                onChange={(value) =>
                  patchForm({ permission: normalizeInput(value) })
                }
              />
            </FormItem>
            <FormItem label="父节点">
              <Select
                value={formData.parentKey}
                options={parentOptions}
                placeholder="选择父节点"
                onChange={(value) =>
                  patchForm({ parentKey: String(value ?? '') })
                }
              />
            </FormItem>
            <FormItem label="iframe">
              <Input
                value={formData.iframeSrc}
                placeholder="可选 iframe 地址"
                onChange={(value) =>
                  patchForm({ iframeSrc: normalizeInput(value) })
                }
              />
            </FormItem>
            <FormItem label="隐藏菜单">
              <Switch
                checked={formData.hideInMenu}
                onChange={(checked) => patchForm({ hideInMenu: checked })}
              />
            </FormItem>
            <FormItem label="面包屑隐藏">
              <Switch
                checked={formData.hideInBreadcrumb}
                onChange={(checked) =>
                  patchForm({ hideInBreadcrumb: checked })
                }
              />
            </FormItem>
            <FormItem label="平铺子菜单">
              <Switch
                checked={formData.flatMenu}
                onChange={(checked) => patchForm({ flatMenu: checked })}
              />
            </FormItem>
          </Form>
        </div>
      </Modal>
    </div>
  );
}

export default MenusPage;
