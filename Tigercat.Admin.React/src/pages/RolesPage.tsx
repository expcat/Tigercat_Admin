import { Card, Tag, Text } from '@expcat/tigercat-react';

const quickActions = [
  { label: '新增角色', icon: '➕', description: '创建新的角色与权限' },
  { label: '成员分配', icon: '👤', description: '为角色分配成员' },
  { label: '权限模板', icon: '📋', description: '管理权限模板' },
  { label: '审计日志', icon: '🔍', description: '查看角色变更记录' },
];

const statusOverview = [
  { label: '系统角色', value: '8', trend: '+1', trendUp: true },
  { label: '自定义角色', value: '14', trend: '+2', trendUp: true },
  { label: '待审核', value: '3', trend: '+1', trendUp: true },
  { label: '已禁用', value: '1', trend: '0', trendUp: false },
];

const recentUpdates = [
  { title: '新增角色', detail: '创建“运营主管”角色', time: '10 分钟前' },
  { title: '权限更新', detail: '更新“客服专员”权限', time: '35 分钟前' },
  { title: '成员调整', detail: '将 user_lee 加入“审核员”', time: '1 小时前' },
  { title: '角色停用', detail: '停用“临时访客”角色', time: '2 小时前' },
];

function RolesPage() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 -m-4" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <span className="text-xl text-white">🛡️</span>
                </div>
                <div>
                  <Text size="lg" weight="bold" className="text-slate-800">
                    角色管理
                  </Text>
                  <Text size="sm" color="secondary">
                    维护平台角色与权限配置
                  </Text>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Tag color="blue" size="sm">
                权限中心
              </Tag>
              <Tag color="green" size="sm">
                已启用
              </Tag>
            </div>
          </div>
        </div>
      </Card>

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
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${
                  index === 0
                    ? 'bg-blue-100'
                    : index === 1
                      ? 'bg-purple-100'
                      : index === 2
                        ? 'bg-orange-100'
                        : 'bg-green-100'
                }`}>
                {index === 0 ? '🛡️' : index === 1 ? '✨' : index === 2 ? '⏳' : '🚫'}
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
                className={`flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-gradient-to-br transition-all duration-300 hover:shadow-md ${
                  index === 0
                    ? 'from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200'
                    : index === 1
                      ? 'from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200'
                      : index === 2
                        ? 'from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200'
                        : 'from-green-50 to-green-100 hover:from-green-100 hover:to-green-200'
                }`}>
                <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center text-xl">
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
            {recentUpdates.map((item, index) => (
              <div
                key={index}
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
