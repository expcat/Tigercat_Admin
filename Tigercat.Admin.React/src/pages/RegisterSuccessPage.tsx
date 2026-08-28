import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@expcat/tigercat-react';
import { Result } from '@expcat/tigercat-react/Result';
import { Countdown } from '@expcat/tigercat-react/Countdown';
import { LogoIcon } from '../components/Icons';

function RegisterSuccessPage() {
  const navigate = useNavigate();
  const countdownTarget = useMemo(() => Date.now() + 5000, []);

  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <div
      className="flex flex-col md:flex-row w-full min-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-(--tiger-border,#e2e8f0) dark:border-slate-850 bg-(--tiger-bg-card,#ffffff) dark:bg-slate-900/90 backdrop-blur-md animate-fade-in-up"
      style={{
        '--tiger-primary': '#7c3aed',
        '--tiger-primary-hover': '#6d28d9',
        '--tiger-primary-disabled': '#ddd6fe',
        '--tiger-focus-ring': '#7c3aed',
      } as React.CSSProperties}
    >
      <div className="hidden md:flex md:w-[42%] bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-600 p-8 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <LogoIcon size={44} className="shadow-lg rounded-xl" />
            <span className="font-bold text-xl tracking-wider">Tigercat Admin</span>
          </div>
          <div className="space-y-6 my-auto pt-6">
            <h2 className="text-2xl font-bold leading-tight">账号已创建</h2>
            <p className="text-pink-100 text-sm">接下来使用新账号登录，即可进入管理后台。</p>
          </div>
        </div>

        <div className="relative z-10 text-xs text-pink-200/80">
          © 2026 Tigercat Team. All rights reserved.
        </div>
      </div>

      <div className="w-full md:w-[58%] p-8 md:p-10 flex flex-col justify-center min-w-0">
        <div className="md:hidden flex items-center justify-center gap-3 mb-6">
          <LogoIcon size={48} className="shadow-md rounded-xl" />
          <h2 className="p2-text-primary text-xl font-bold">Tigercat Admin</h2>
        </div>

        <Card variant="transparent" className="p-0">
          <Result
            status="success"
            title="注册成功"
            subTitle="账号已创建，即将返回登录页"
            extra={
              <Button variant="primary" onClick={goToLogin}>
                立即登录
              </Button>
            }
          >
            <div className="flex flex-col items-center">
              <Countdown
                value={countdownTarget}
                format="s"
                suffix="秒"
                title="即将自动返回登录"
                onFinish={() => navigate('/login')}
              />
            </div>
          </Result>
        </Card>
      </div>
    </div>
  );
}

export default RegisterSuccessPage;
