import { create } from 'zustand';
import { Message } from '@whatsapp-clone/shared-types';
import { v4 as uuid } from 'uuid';

interface PendingMessage extends Message {
  pending: boolean;
}

interface ChatStore {
  messages: Record<string, PendingMessage[]>; // chatId → messages
  addMessage: (msg: PendingMessage) => void;
  updateStatus: (chatId: string, messageId: string, status: Message['status']) => void;
  getPendingMessages: () => PendingMessage[];
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: {},

  addMessage: (msg) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [msg.chatId]: [...(state.messages[msg.chatId] ?? []), msg],
      },
    })),

  updateStatus: (chatId, messageId, status) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] ?? []).map((m) =>
          m.messageId === messageId || m.clientMsgId === messageId
            ? { ...m, status, pending: false }
            : m,
        ),
      },
    })),

  getPendingMessages: () =>
    Object.values(get().messages)
      .flat()
      .filter((m) => m.pending),
}));