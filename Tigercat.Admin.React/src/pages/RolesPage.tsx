import { Card, Tag, Text } from '@expcat/tigercat-react';
import {
  ShieldIcon,
  UserPlusIcon,
  UsersIcon,
  ClipboardIcon,
  SearchIcon,
  SparklesIcon,
  ClockIcon,
  BanIcon,
} from '../components/Icons';
import { PageHeader } from '../components/PageHeader';

const quickActions = [
  {
    label: '新增角色',
    icon: <UserPlusIcon size={24} className="text-blue-600" />,
    description: '创建新的角色与权限',
    bgClass: 'from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200',
  },
  {
    label: '成员分配',
    icon: <UsersIcon size={24} className="text-purple-600" />,
    description: '为角色分配成员',
    bgClass:
      'from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200',
  },
  {
    label: '权限模板',
    icon: <ClipboardIcon size={24} className="text-orange-600" />,
    description: '管理权限模板',
    bgClass:
      'from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200',
  },
  {
    label: '审计日志',
    icon: <SearchIcon size={24} className="text-green-600" />,
    description: '查看角色变更记录',
    bgClass:
      'from-green-50 to-green-100 hover:from-green-100 hover:to-green-200',
  },
];

const statusOverview = [
  {
    label: '系统角色',
    value: '8',
    trend: '+1',
    trendUp: true,
    icon: <ShieldIcon />,
    iconClass: 'text-blue-600',
    bgClass: 'bg-blue-100',
  },
  {
    label: '自定义角色',
    value: '14',
    trend: '+2',
    trendUp: true,
    icon: <SparklesIcon />,
    iconClass: 'text-purple-600',
    bgClass: 'bg-purple-100',
  },
  {
    label: '待审核',
    value: '3',
    trend: '+1',
    trendUp: true,
    icon: <ClockIcon />,
    iconClass: 'text-orange-600',
    bgClass: 'bg-orange-100',
  },
  {
    label: '已禁用',
    value: '1',
    trend: '0',
    trendUp: false,
    icon: <BanIcon />,
    iconClass: 'text-green-600',
    bgClass: 'bg-green-100',
  },
];

const recentUpdates = [
  {
    id: 'role-create',
    title: '新增角色',
    detail: '创建“运营主管”角色',
    time: '10 分钟前',
  },
  {
    id: 'role-update',
    title: '权限更新',
    detail: '更新“客服专员”权限',
    time: '35 分钟前',
  },
  {
    id: 'member-adjust',
    title: '成员调整',
    detail: '将 user_lee 加入“审核员”',
    time: '1 小时前',
  },
  {
    id: 'role-disable',
    title: '角色停用',
    detail: '停用“临时访客”角色',
    time: '2 小时前',
  },
];

function RolesPage() {
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusOverview.map((stat, index) => (
          <Card
            key={stat.label}
            className="group hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Text size="sm" color="secondary">
                  {stat.label}
                </Text>
                <div className="text-2xl font-bold mt-2 text-slate-800">
                  {stat.value}
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <Tag color={stat.trendUp ? 'green' : 'red'} size="sm">
                    {stat.trendUp ? '↑' : '↓'} {stat.trend}
                  </Tag>
                  <Text size="xs" color="secondary">
                    较昨日
                  </Text>
                </div>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${stat.bgClass} ${stat.iconClass}`}>
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="快捷操作" className="lg:col-span-1">
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <div
                key={action.label}
                className={`flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-gradient-to-br transition-all duration-300 hover:shadow-md ${action.bgClass}`}>
                <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center transition-transform group-hover:scale-110">
                  {action.icon}
                </div>
                <div className="flex-1">
                  <Text size="sm" weight="medium" className="text-slate-800">
                    {action.label}
                  </Text>
                  <Text size="xs" color="secondary" className="mt-1">
                    {action.description}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="近期动态" className="lg:col-span-2">
          <div className="space-y-4">
            {recentUpdates.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-blue-500" />
                <div className="flex-1 min-w-0">
                  <Text size="sm" className="text-slate-700">
                    {item.title}
                  </Text>
                  <Text size="xs" color="secondary" className="mt-1">
                    {item.detail}
                  </Text>
                </div>
                <Text size="xs" color="secondary">
                  {item.time}
                </Text>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default RolesPage;
