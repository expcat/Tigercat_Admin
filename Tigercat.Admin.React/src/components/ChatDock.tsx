import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@expcat/tigercat-core';
import { Badge, Drawer } from '@expcat/tigercat-react';
import { FloatButton } from '@expcat/tigercat-react/FloatButton';
import { ChatWindow } from '@expcat/tigercat-react/ChatWindow';
import { MessageIcon, XIcon } from './Icons';

interface ChatDockProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const buildReply = (input: string) =>
  `已收到你的消息：“${input}”。这是演示客服坞，稍后会有同事跟进（ChatWindow 组件示例）。`;

export function ChatDock({ open, onOpenChange }: ChatDockProps) {
  const seqRef = useRef(0);
  const nextId = () => `chat-${Date.now()}-${seqRef.current++}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: `chat-welcome`,
      content: '你好，我是在线客服小虎，有任何关于后台的问题都可以问我～',
      direction: 'other',
      time: new Date().toISOString(),
    },
  ]);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(1);

  useEffect(() => {
    if (open) {
      setUnread(0);
    }
  }, [open]);

  const handleSend = (value: string) => {
    const text = value.trim();
    if (!text) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        content: text,
        direction: 'self',
        time: new Date().toISOString(),
      },
    ]);
    setDraft('');

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          content: buildReply(text),
          direction: 'other',
          time: new Date().toISOString(),
        },
      ]);
      setUnread((prev) => (open ? prev : prev + 1));
    }, 700);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <Badge
          content={unread}
          max={99}
          showZero={false}
          standalone={false}
          variant="danger"
        >
          <FloatButton
            type="primary"
            size="lg"
            data-tour="chat-dock"
            aria-label={open ? '关闭在线客服' : '联系在线客服'}
            tooltip={open ? '关闭在线客服' : '联系在线客服'}
            onClick={() => onOpenChange(!open)}
          >
            {open ? <XIcon size={22} /> : <MessageIcon size={22} />}
          </FloatButton>
        </Badge>
      </div>

      <Drawer
        placement="right"
        open={open}
        title="在线客服"
        width="380px"
        mask
        maskClosable
        onClose={() => onOpenChange(false)}
      >
        <ChatWindow
          messages={messages}
          value={draft}
          placeholder="输入消息，回车发送"
          sendText="发送"
          emptyText="暂无消息，开始对话吧"
          statusText="客服在线"
          statusVariant="success"
          showTime
          showAvatar={false}
          showName={false}
          onChange={setDraft}
          onSend={handleSend}
        />
      </Drawer>
    </>
  );
}
