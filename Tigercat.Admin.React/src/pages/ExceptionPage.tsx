import { useMemo, useState } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { Button } from '@expcat/tigercat-react';
import { Result } from '@expcat/tigercat-react/Result';
import { Countdown } from '@expcat/tigercat-react/Countdown';
import { Empty } from '@expcat/tigercat-react/Empty';

type ExceptionStatus = 403 | 404 | 500;

interface ExceptionPageProps {
  status: ExceptionStatus;
}

const EXCEPTION_META: Record<
  ExceptionStatus,
  { status: '403' | '404' | '500'; title: string; subTitle: string }
> = {
  403: {
    status: '403',
    title: '无权访问',
    subTitle: '当前账号没有访问该页面的权限，请联系管理员分配。',
  },
  404: {
    status: '404',
    title: '页面不存在',
    subTitle: '访问的地址不存在或已被移动。',
  },
  500: {
    status: '500',
    title: '服务异常',
    subTitle: '演示场景：会话异常或服务请求失败时，可跳转到此页查看统一兜底。',
  },
};

export default function ExceptionPage({ status }: ExceptionPageProps) {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const meta = EXCEPTION_META[status];
  // 进入页面时仅初始化一次倒计时目标
  const countdownTarget = useMemo(() => Date.now() + 5000, []);
  const [autoJumpEnabled, setAutoJumpEnabled] = useState(status === 404);
  const canGoBack = navigationType === 'PUSH';

  const goBack = () => {
    setAutoJumpEnabled(false);
    if (canGoBack) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-(--tiger-bg-page,#f8fafc) p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <Result
          status={meta.status}
          title={meta.title}
          subTitle={meta.subTitle}
          extra={
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => {
                  setAutoJumpEnabled(false);
                  navigate('/dashboard');
                }}
              >
                返回首页
              </Button>
              <Button variant="outline" onClick={goBack}>
                返回上一页
              </Button>
            </div>
          }
        >
          <div className="flex flex-col items-center">
            {status === 404 && autoJumpEnabled && (
              <Countdown
                value={countdownTarget}
                format="s"
                suffix="秒"
                title="即将自动返回首页"
                onFinish={() => navigate('/dashboard')}
              />
            )}
            {!canGoBack && (
              <Empty description="没有可返回的历史记录" showImage={false} />
            )}
          </div>
        </Result>
      </div>
    </div>
  );
}
