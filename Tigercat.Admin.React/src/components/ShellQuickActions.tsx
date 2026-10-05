import { useNavigate } from 'react-router-dom';
import { notification } from '@expcat/tigercat-react';
import { Button } from '@expcat/tigercat-react/Button';
import { Dropdown, DropdownItem, DropdownMenu } from '@expcat/tigercat-react/Dropdown';
import { BackTop } from '@expcat/tigercat-react/BackTop';
import { ArrowUpIcon, HelpIcon } from './Icons';

const getScrollTarget = () =>
  typeof document !== 'undefined'
    ? document.getElementById('main-content-scroll')
    : null;

export function ShellQuickActions() {
  const navigate = useNavigate();

  const sendFeedback = () => {
    notification.info({
      title: '感谢你的反馈',
      description: '我们已收到你的反馈（演示场景，不会真实提交）。',
    });
  };

  return (
    <>
      <Dropdown
        trigger="click"
        placement="bottom-end"
        showArrow={false}
        renderTrigger={() => (
          <Button variant="ghost" aria-label="帮助与反馈" className="!hidden h-10 w-10 shrink-0 !p-0 sm:!flex">
            <HelpIcon size={20} />
          </Button>
        )}
      >
        <DropdownMenu>
          <DropdownItem onClick={() => navigate('/help')}>帮助中心</DropdownItem>
          <DropdownItem onClick={sendFeedback}>反馈</DropdownItem>
        </DropdownMenu>
      </Dropdown>
      <BackTop
        aria-label="回到顶部"
        target={getScrollTarget}
        visibilityHeight={240}
        position="fixed"
        placement="bottom-right"
        offset={24}
      >
        <ArrowUpIcon size={20} />
      </BackTop>
    </>
  );
}
