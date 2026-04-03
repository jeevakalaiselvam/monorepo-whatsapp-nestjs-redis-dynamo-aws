export interface Message {
  messageId: string;
  clientMsgId: string; // idempotency key from client
  chatId: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: 'text' | 'image' | 'audio';
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface ReceiptEvent {
  messageId: string;
  chatId: string;
  userId: string;
  type: 'delivered' | 'read';
  timestamp: string;
}

export interface WsPayload<T = unknown> {
  event: string;
  data: T;
}

export interface SendMessageDto {
  clientMsgId: string;
  chatId: string;
  recipientId: string;
  content: string;
  type: 'text' | 'image' | 'audio';
}
