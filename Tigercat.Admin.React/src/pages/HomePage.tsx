import { Alert, Card, Text, Space } from '@expcat/tigercat-react';

interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

interface HomePageProps {
  notice: Notice;
  homeMessage: string;
  homeError: string;
}

function HomePage({ notice, homeMessage, homeError }: HomePageProps) {
  return (
    <div className="space-y-4">
      {notice?.message && (
        <Alert
          type={notice.type || 'info'}
          title={notice.type === 'error' ? '操作失败' : '操作成功'}
          description={notice.message}
          closable={false}
        />
      )}

      <Card title="Dashboard">
        {homeError && (
          <Alert
            type="error"
            title="Load Failed"
            description={homeError}
            closable={false}
          />
        )}
        {!homeError && (
          <Text>{homeMessage || 'Welcome to Tigercat Admin'}</Text>
        )}
      </Card>

      {/* Sample Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-slate-500 text-sm">Total Users</div>
          <div className="text-2xl font-bold mt-2">1,234</div>
        </Card>
        <Card>
          <div className="text-slate-500 text-sm">Active Sessions</div>
          <div className="text-2xl font-bold mt-2">56</div>
        </Card>
        <Card>
          <div className="text-slate-500 text-sm">System Status</div>
          <div className="text-2xl font-bold mt-2 text-green-500">Normal</div>
        </Card>
      </div>
    </div>
  );
}

export default HomePage;
