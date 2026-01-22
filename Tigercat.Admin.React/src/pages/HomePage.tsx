import {
  Alert,
  Button,
  Card,
  Divider,
  Menu,
  Space,
  Text,
} from '@expcat/tigercat-react';
import { Session } from '../App';

interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

interface HomePageProps {
  session: Session | null;
  notice: Notice;
  homeMessage: string;
  homeError: string;
  activeMenu: string;
  onMenuSelect: (key: any) => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
}

function HomePage({
  session,
  notice,
  homeMessage,
  homeError,
  activeMenu,
  onMenuSelect,
  onOpenChangePassword,
  onLogout,
}: HomePageProps) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-3xl shadow-sm">
              🐯
            </div>
            <div className="flex flex-col">
              <Text size="lg" weight="bold">
                Tigercat Admin
              </Text>
              <span className="text-xs text-slate-400">
                Enterprise Control Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-2 border border-slate-100">
            <div className="flex items-center gap-2 px-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {session?.username || 'Guest'}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-200"></div>

            <Space size="small">
              <Button
                variant="outline"
                size="small"
                onClick={onOpenChangePassword}
                className="!border-slate-200 !text-slate-600 hover:!bg-white hover:!text-blue-600">
                修改密码
              </Button>
              <Button
                variant="outline"
                size="small"
                onClick={onLogout}
                className="!border-red-100 !text-red-500 hover:!bg-red-50 hover:!border-red-200">
                登出
              </Button>
            </Space>
          </div>
        </div>
      </Card>

      {notice?.message && (
        <Alert
          type={notice.type || 'info'}
          title={notice.type === 'error' ? '操作失败' : '操作成功'}
          description={notice.message}
          closable={false}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        <Card>
          <Text weight="bold">导航</Text>
          <Divider />
          <Menu
            items={[{ key: 'home', label: '主页' }]}
            activeKey={activeMenu}
            onSelect={onMenuSelect}
          />
        </Card>
        <Card title="主页">
          {homeError && (
            <Alert
              type="error"
              title="加载失败"
              description={homeError}
              closable={false}
            />
          )}
          {!homeError && (
            <Text>{homeMessage || '欢迎使用 Tigercat Admin'}</Text>
          )}
        </Card>
      </div>
    </div>
  );
}

export default HomePage;
