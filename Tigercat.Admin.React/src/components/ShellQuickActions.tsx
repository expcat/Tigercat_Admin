import { useNavigate } from 'react-router-dom';
import { notification } from '@expcat/tigercat-react';
import { FloatButton, FloatButtonGroup } from '@expcat/tigercat-react/FloatButton';
import { BackTop } from '@expcat/tigercat-react/BackTop';
import { ArrowUpIcon, HelpIcon, MessageIcon, PlusIcon } from './Icons';

const getScrollTarget = () =>
  typeof document !== 'undefined'
    ? document.getElementById('main-content-scroll')
    : null;

export function ShellQuickActions() {
  const navigate = useNavigate();

  const goHelp = () => {
    navigate('/about');
  };

  const sendFeedback = () => {
    notification.info({
      title: '感谢你的反馈',
      description: '我们已收到你的反馈（演示场景，不会真实提交）。',
    });
  };

  return (
    <>
      <FloatButtonGroup
        trigger="click"
        style={{ bottom: '6.5rem' }}
        triggerNode={
          <FloatButton type="primary" size="lg" aria-label="快捷操作" tooltip="快捷操作">
            <PlusIcon size={22} />
          </FloatButton>
        }
      >
        <FloatButton
          type="default"
          size="md"
          aria-label="帮助"
          tooltip="帮助"
          onClick={goHelp}
        >
          <HelpIcon size={20} />
        </FloatButton>
        <FloatButton
          type="default"
          size="md"
          aria-label="反馈"
          tooltip="反馈"
          onClick={sendFeedback}
        >
          <MessageIcon size={20} />
        </FloatButton>
      </FloatButtonGroup>

      <BackTop
        target={getScrollTarget}
        visibilityHeight={240}
        className="!fixed !bottom-6 !left-6 !right-auto !ml-0 !mr-0"
      >
        <ArrowUpIcon size={20} />
      </BackTop>
    </>
  );
}
