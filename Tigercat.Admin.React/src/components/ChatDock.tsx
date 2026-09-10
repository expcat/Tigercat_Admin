import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@expcat/tigercat-core';
import { Badge } from '@expcat/tigercat-react/Badge';
import { Drawer } from '@expcat/tigercat-react/Drawer';
import { Message } from '@expcat/tigercat-react/Message';
import { FloatButton } from '@expcat/tigercat-react/FloatButton';
import { ChatWindow } from '@expcat/tigercat-react/ChatWindow';
import { fetchChatMessages, sendChatMessage, subscribeChatMessages } from '../utils/chat';
import { formatDisplayDateTime } from '../utils/common';
import { MessageIcon, XIcon } from './Icons';

interface ChatDockProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function mapChatMessages(items: ChatMessage[] | undefined): ChatMessage[] {
  return (items ?? []).map((item) => ({
    ...item,
    content: String(item.content ?? '').split('客服坞').join('客服回复'),
    time: formatDisplayDateTime(item.time),
  }));
}

export function ChatDock({ open, onOpenChange }: ChatDockProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(1);
  const [loading, setLoading] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;

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
        setMessages(mapChatMessages(payload.data as ChatMessage[] | undefined));
      } catch (error: unknown) {
        Message.error({ content: readErrorMessage(error, '客服消息加载失败'), duration: 3000 });
      } finally {
        setLoading(false);
      }
    };
    void loadMessages();
    return subscribeChatMessages((items) => {
      setMessages(mapChatMessages(items as ChatMessage[] | undefined));
      if (!openRef.current) {
        setUnread((prev) => prev + 1);
      }
    });
  }, []);

  const handleSend = async (value: string) => {
    const text = value.trim();
    if (!text) {
      return;
    }

    try {
      const payload = await sendChatMessage(text);
      setDraft('');
      setMessages(mapChatMessages(payload.data as ChatMessage[] | undefined));
      setUnread((prev) => (open ? prev : prev + 1));
    } catch (error: unknown) {
      Message.error({ content: readErrorMessage(error, '发送客服消息失败'), duration: 3000 });
    }
  };

  return (
    <>
      <FloatButton
        floating
        placement="bottom-right"
        offset={24}
        type="primary"
        size="lg"
        className="max-sm:!hidden"
        data-tour="chat-dock"
        aria-label={open ? '关闭在线客服' : '联系在线客服'}
        tooltip={open ? '关闭在线客服' : '联系在线客服'}
        onClick={() => onOpenChange(!open)}
      >
        {open ? <XIcon size={22} /> : <MessageIcon size={22} />}
        <Badge
          content={unread}
          max={99}
          showZero={false}
          standalone
          variant="danger"
          className="pointer-events-none absolute -right-1 -top-1"
        />
      </FloatButton>

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
          className="h-full min-h-0 [&_textarea]:resize-none"
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
