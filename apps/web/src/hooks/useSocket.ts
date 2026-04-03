import { useEffect, useRef } from 'react';
import { getSocket } from '../socket/socket';
import { useChatStore } from '../store/chatStore';
import { Message } from '@whatsapp-clone/shared-types';

export function useSocket(userId: string) {
  const { addMessage, updateStatus, getPendingMessages } = useChatStore();
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const socket = getSocket(userId);

    socket.on('connect', () => {
      console.log('[WS] connected');
      // resend unacked messages on reconnect
      getPendingMessages().forEach((msg) => {
        socket.emit('sendMessage', {
          clientMsgId: msg.clientMsgId,
          chatId: msg.chatId,
          recipientId: msg.recipientId,
          content: msg.content,
          type: msg.type,
        });
      });
    });

    socket.on('newMessage', (msg: Message) => {
      addMessage({ ...msg, pending: false });
      // emit read receipt when message is visible
      socket.emit('messageRead', { messageId: msg.messageId, chatId: msg.chatId });
    });

    socket.on('messageSent', ({ clientMsgId, messageId }: { clientMsgId: string; messageId: string }) => {
      updateStatus('', clientMsgId, 'sent'); // chatId is in the store
    });

    socket.on('receipt', ({ messageId, chatId, type }: { messageId: string; chatId: string; type: 'delivered' | 'read' }) => {
      updateStatus(chatId, messageId, type);
    });

    // heartbeat every 30s to refresh Redis TTL
    heartbeatRef.current = setInterval(() => {
      if (socket.connected) socket.emit('heartbeat');
    }, 30_000);

    return () => {
      socket.off('connect');
      socket.off('newMessage');
      socket.off('messageSent');
      socket.off('receipt');
      clearInterval(heartbeatRef.current);
    };
  }, [userId]);
}