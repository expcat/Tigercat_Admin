import { Card, Tag, Text } from '@expcat/tigercat-react';
import {
  UserPlusIcon,
  UploadIcon,
  ShieldIcon,
  SearchIcon,
  UsersIcon,
  ClockIcon,
  BanIcon,
  SparklesIcon,
} from '../components/Icons';
import { PageHeader } from '../components/PageHeader';

const quickActions = [
  {
    label: '新增用户',
    icon: <UserPlusIcon size={24} className="text-blue-600" />,
    description: '创建新用户账号',
    bgClass: 'from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200',
  },
  {
    label: '导入用户',
    icon: <UploadIcon size={24} className="text-purple-600" />,
    description: '批量导入用户数据',
    bgClass:
      'from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200',
  },
  {
    label: '权限配置',
    icon: <ShieldIcon size={24} className="text-orange-600" />,
    description: '管理用户权限与角色',
    bgClass:
      'from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200',
  },
  {
    label: '安全审计',
    icon: <SearchIcon size={24} className="text-green-600" />,
    description: '查看登录与操作记录',
    bgClass:
      'from-green-50 to-green-100 hover:from-green-100 hover:to-green-200',
  },
];

const statusOverview = [
  {
    label: '活跃用户',
    value: '1,024',
    trend: '+8%',
    trendUp: true,
    icon: <UsersIcon />,
    iconClass: 'text-blue-600',
    bgClass: 'bg-blue-100',
  },
  {
    label: '待审核',
    value: '12',
    trend: '+3',
    trendUp: true,
    icon: <ClockIcon />,
    iconClass: 'text-purple-600',
    bgClass: 'bg-purple-100',
  },
  {
    label: '已禁用',
    value: '5',
    trend: '-1',
    trendUp: false,
    icon: <BanIcon />,
    iconClass: 'text-orange-600',
    bgClass: 'bg-orange-100',
  },
  {
    label: '今日新增',
    value: '18',
    trend: '+4',
    trendUp: true,
    icon: <SparklesIcon />,
    iconClass: 'text-green-600',
    bgClass: 'bg-green-100',
  },
];

const recentUpdates = [
  {
    id: 'user-apply',
    title: '新用户申请',
    detail: 'marketing_lead 申请加入',
    time: '5 分钟前',
  },
  {
    id: 'permission-update',
    title: '权限调整',
    detail: 'admin 更新了角色权限',
    time: '20 分钟前',
  },
  {
    id: 'account-freeze',
    title: '账号冻结',
    detail: '禁用用户 demo_user',
    time: '1 小时前',
  },
  {
    id: 'batch-import',
    title: '批量导入',
    detail: '导入 35 条用户数据',
    time: '2 小时前',
  },
];

function UsersPage() {
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

export default UsersPage;
