import { useMemo } from 'react';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Message } from '@expcat/tigercat-react/Message';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { PageHeader } from '../components/PageHeader';
import { MutedPanel } from '../components/PageFragments';
import { PermissionGuard } from '../components/PermissionGuard';
import { LockIcon } from '../components/Icons';
import { usePermission } from '../utils/permission';

const DEMO_ACTIONS = [
  { code: 'user:create', label: '新增用户' },
  { code: 'user:delete', label: '删除用户' },
  { code: 'role:create', label: '新增角色' },
  { code: 'menu:create', label: '新建菜单' },
  { code: 'setting:edit', label: '保存设置' },
  { code: 'media:delete', label: '删除文件' },
  { code: 'notification:create', label: '创建通知' },
] as const;

const MISSING_CODE = 'demo:forbidden';

function handleDemoAction(label: string) {
  Message.info({ content: `已触发「${label}」（演示，无写操作）`, duration: 2000 });
}

function PermissionDemoPage() {
  const { codes, loaded, has, hasAny } = usePermission();
  const codeList = useMemo(() => [...codes].sort(), [codes]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<LockIcon size={24} />}
        title="按钮权限"
        subtitle="用现有 PermissionGuard / usePermission 按权限码隐藏按钮，不新增 Tigercat 权限组件"
        tags={[
          { label: '演示', variant: 'primary' },
          { label: '现有 helpers', variant: 'info' },
        ]}
      />

      <MutedPanel
        compact
        description="无权限时按钮不渲染。换只读账号或去掉对应权限码后刷新，入口会消失。点击只 toast，不写数据。"
      />

      <Card header={<Text weight="bold">当前会话权限码</Text>}>
        {!loaded ? (
          <MutedPanel compact description="正在加载权限…" />
        ) : codeList.length ? (
          <div className="flex flex-wrap gap-2">
            {codeList.map((code) => (
              <Tag key={code} variant="info" size="sm">
                {code}
              </Tag>
            ))}
          </div>
        ) : (
          <MutedPanel compact description="当前会话没有权限码。" />
        )}
      </Card>

      <Card header={<Text weight="bold">单码隐藏（PermissionGuard）</Text>}>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {DEMO_ACTIONS.map((item) => (
            <PermissionGuard key={item.code} code={item.code}>
              <Button variant="outline" onClick={() => handleDemoAction(item.label)}>
                {item.label}
                <span className="ml-1 text-xs opacity-70">{item.code}</span>
              </Button>
            </PermissionGuard>
          ))}
        </div>
        <Text size="sm" color="secondary" className="mt-3 block">
          有权限的按钮会显示；缺码的入口由 PermissionGuard 去掉。
        </Text>
      </Card>

      <Card header={<Text weight="bold">缺权 fallback</Text>}>
        <PermissionGuard
          code={MISSING_CODE}
          fallback={
            <Text size="sm" color="secondary">
              已隐藏（缺 {MISSING_CODE}）
            </Text>
          }>
          <Button onClick={() => handleDemoAction('禁止操作')}>禁止操作</Button>
        </PermissionGuard>
      </Card>

      <Card header={<Text weight="bold">任意 / 全部匹配</Text>}>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <PermissionGuard code={['user:view', 'role:view']} mode="any">
            <Button variant="outline" onClick={() => handleDemoAction('查看用户或角色')}>
              查看用户或角色
              <span className="ml-1 text-xs opacity-70">any</span>
            </Button>
          </PermissionGuard>
          <PermissionGuard code={['user:create', 'role:create']} mode="all">
            <Button variant="outline" onClick={() => handleDemoAction('创建用户且角色')}>
              创建用户且角色
              <span className="ml-1 text-xs opacity-70">all</span>
            </Button>
          </PermissionGuard>
        </div>
        <Text size="sm" color="secondary" className="mt-3 block">
          any：{hasAny('user:view', 'role:view') ? '通过' : '未通过'}（user:view 或 role:view）。all：
          {has('user:create', 'role:create') ? '通过' : '未通过'}（user:create 且 role:create）。
        </Text>
      </Card>
    </div>
  );
}

export default PermissionDemoPage;
