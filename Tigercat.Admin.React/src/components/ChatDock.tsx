import { useEffect, useState } from 'react';
import type { ChatMessage } from '@expcat/tigercat-core';
import { Badge, Drawer, Message } from '@expcat/tigercat-react';
import { FloatButton } from '@expcat/tigercat-react/FloatButton';
import { ChatWindow } from '@expcat/tigercat-react/ChatWindow';
import { fetchChatMessages, sendChatMessage } from '../utils/chat';
import { MessageIcon, XIcon } from './Icons';

interface ChatDockProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export function ChatDock({ open, onOpenChange }: ChatDockProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setUnread(0);
    }
  }, [open]);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        const payload = await fetchChatMessages();
        setMessages((payload.data ?? []) as ChatMessage[]);
      } catch (error: unknown) {
        Message.error({ content: readErrorMessage(error, '客服消息加载失败'), duration: 3000 });
      } finally {
        setLoading(false);
      }
    };
    void loadMessages();
  }, []);

  const handleSend = async (value: string) => {
    const text = value.trim();
    if (!text) {
      return;
    }

    try {
      const payload = await sendChatMessage(text);
      setDraft('');
      setMessages((payload.data ?? []) as ChatMessage[]);
      setUnread((prev) => (open ? prev : prev + 1));
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '发送客服消息失败'), duration: 3000 });
    }
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
          emptyText={loading ? '正在加载消息…' : '暂无消息，开始对话吧'}
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
