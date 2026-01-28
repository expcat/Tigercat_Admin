import { Alert, Card, Text, Tag } from '@expcat/tigercat-react';

interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

interface HomePageProps {
  notice: Notice;
  homeMessage: string;
  homeError: string;
  username?: string;
}

// 模拟统计数据
const stats = [
  {
    label: '总用户数',
    value: '1,234',
    trend: '+12%',
    trendUp: true,
    icon: '👥',
  },
  { label: '活跃会话', value: '56', trend: '+5', trendUp: true, icon: '🔗' },
  { label: '今日登录', value: '128', trend: '-3%', trendUp: false, icon: '📈' },
  { label: '系统状态', value: '正常', status: 'success' as const, icon: '✅' },
];

// 快捷操作
const quickActions = [
  { label: '用户管理', icon: '👥', key: 'users' },
  { label: '角色配置', icon: '🛡️', key: 'roles' },
  { label: '系统设置', icon: '⚙️', key: 'settings' },
  { label: '查看日志', icon: '📋', key: 'logs' },
];

// 最近活动
const recentActivities = [
  { time: '10 分钟前', action: '用户 admin 登录系统', type: 'info' as const },
  {
    time: '30 分钟前',
    action: '新用户 test_user 注册',
    type: 'success' as const,
  },
  { time: '1 小时前', action: '系统配置已更新', type: 'warning' as const },
  { time: '2 小时前', action: '用户 demo 修改密码', type: 'info' as const },
];

function HomePage({ notice, homeMessage, homeError, username }: HomePageProps) {
  return (
    <div className="space-y-6">
      {/* 通知提示 */}
      {notice?.message && (
        <Alert
          type={notice.type || 'info'}
          title={notice.type === 'error' ? '操作失败' : '操作成功'}
          description={notice.message}
          closable
        />
      )}

      {/* 欢迎区域 */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Text size="lg" weight="bold" className="text-slate-800">
              👋 欢迎回来，{username || 'Admin'}！
            </Text>
            <Text size="sm" color="secondary" className="mt-1">
              {homeMessage || '今天是个好日子，让我们开始工作吧！'}
            </Text>
          </div>
          <div className="text-4xl">🐯</div>
        </div>
      </Card>

      {/* 加载错误提示 */}
      {homeError && (
        <Alert
          type="error"
          title="数据加载失败"
          description={homeError}
          closable
        />
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-start justify-between">
              <div>
                <Text size="sm" color="secondary">
                  {stat.label}
                </Text>
                <div className="text-2xl font-bold mt-2 text-slate-800">
                  {stat.value}
                </div>
                {stat.trend && (
                  <div className="mt-2 flex items-center gap-1">
                    <Tag color={stat.trendUp ? 'green' : 'red'} size="sm">
                      {stat.trend}
                    </Tag>
                    <Text size="xs" color="secondary">
                      较昨日
                    </Text>
                  </div>
                )}
                {stat.status && (
                  <div className="mt-2">
                    <Tag color="green" size="sm">
                      运行中
                    </Tag>
                  </div>
                )}
              </div>
              <div className="text-3xl opacity-80">{stat.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快捷操作 */}
        <Card title="快捷操作" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.key}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200">
                <span className="text-2xl mb-2">{action.icon}</span>
                <Text size="sm">{action.label}</Text>
              </button>
            ))}
          </div>
        </Card>

        {/* 最近活动 */}
        <Card title="最近活动" className="lg:col-span-2">
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <div
                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.type === 'info'
                      ? 'bg-blue-500'
                      : activity.type === 'success'
                        ? 'bg-green-500'
                        : activity.type === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <Text size="sm" className="text-slate-700">
                    {activity.action}
                  </Text>
                  <Text size="xs" color="secondary" className="mt-1">
                    {activity.time}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 系统信息 */}
      <Card title="系统信息">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <Text size="sm" color="secondary">
              系统版本
            </Text>
            <Text size="sm" weight="medium" className="mt-1">
              v1.0.0
            </Text>
          </div>
          <div>
            <Text size="sm" color="secondary">
              运行环境
            </Text>
            <Text size="sm" weight="medium" className="mt-1">
              .NET 10 + React 19
            </Text>
          </div>
          <div>
            <Text size="sm" color="secondary">
              最后更新
            </Text>
            <Text size="sm" weight="medium" className="mt-1">
              2026-01-28
            </Text>
          </div>
          <div>
            <Text size="sm" color="secondary">
              API 状态
            </Text>
            <Tag color="green" size="sm">
              在线
            </Tag>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default HomePage;
