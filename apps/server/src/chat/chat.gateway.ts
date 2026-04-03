import {
  WebSocketGateway, SubscribeMessage,
  WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { RedisService } from '../redis/redis.service';
import { SendMessageDto } from './dto/send-message.dto';
import { WsAuthGuard } from '../auth/auth.guard';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private chatService: ChatService,
    private redis: RedisService,
  ) {}

  async handleConnection(socket: Socket) {
    const userId = socket.handshake.auth?.userId as string;
    if (!userId) { socket.disconnect(); return; }
    await this.redis.setConnection(userId, socket.id);
    await this.redis.setOnline(userId);
    console.log(`[WS] connected: ${userId} → ${socket.id}`);
  }

  async handleDisconnect(socket: Socket) {
    const userId = socket.handshake.auth?.userId as string;
    if (userId) {
      await this.redis.delConnection(userId);
      console.log(`[WS] disconnected: ${userId}`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(socket: Socket, payload: SendMessageDto) {
    const userId = socket.handshake.auth?.userId as string;
    const result = await this.chatService.handleSendMessage(userId, payload);
    // ack back to sender
    socket.emit('messageSent', { clientMsgId: payload.clientMsgId, messageId: result.messageId });
  }

  @SubscribeMessage('messageRead')
  async handleRead(socket: Socket, payload: { messageId: string; chatId: string }) {
    const userId = socket.handshake.auth?.userId as string;
    await this.chatService.handleReadReceipt(userId, payload);
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(socket: Socket) {
    const userId = socket.handshake.auth?.userId as string;
    if (userId) {
      await this.redis.setOnline(userId);
      await this.redis.setConnection(userId, socket.id);
    }
  }

  // called by delivery worker to push to a specific user
  async pushToUser(userId: string, event: string, data: unknown) {
    const connId = await this.redis.getConnection(userId);
    if (connId) {
      this.server.to(connId).emit(event, data);
      return true;
    }
    return false;
  }
}