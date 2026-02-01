import { Card, Tag, Text } from '@expcat/tigercat-react';

function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 -m-4" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <span className="text-xl text-white">⚙️</span>
                </div>
                <div>
                  <Text size="lg" weight="bold" className="text-slate-800">
                    系统设置
                  </Text>
                  <Text size="sm" color="secondary">
                    管理基础配置、安全策略与通知规则
                  </Text>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Tag color="blue" size="sm">
                配置中心
              </Tag>
              <Tag color="green" size="sm">
                同步完成
              </Tag>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="配置中心">
          <div className="space-y-2">
            <Text size="sm" color="secondary">
              设置数据将由后端配置中心实时同步。
            </Text>
            <Tag color="blue" size="sm">
              等待同步
            </Tag>
          </div>
        </Card>
        <Card title="安全提示">
          <div className="space-y-2">
            <Text size="sm" color="secondary">
              如需调整安全策略，请联系系统管理员或在配置中心更新。
            </Text>
            <Tag color="green" size="sm">
              保护中
            </Tag>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SettingsPage;
