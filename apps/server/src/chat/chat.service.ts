import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { KafkaService } from '../kafka/kafka.service';
import { RedisService } from '../redis/redis.service';
import { DynamoService } from '../dynamo/dynamo.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private kafka: KafkaService,
    private redis: RedisService,
    private dynamo: DynamoService,
  ) {}

  async handleSendMessage(senderId: string, dto: SendMessageDto) {
    // idempotency check
    const isNew = await this.redis.acquireIdempotencyKey(dto.clientMsgId);
    if (!isNew) {
      // duplicate — return existing messageId
      const existing = await this.dynamo.getByClientMsgId(dto.clientMsgId);
      return { messageId: existing?.messageId ?? dto.clientMsgId };
    }

    const messageId = uuid();
    const message = {
      messageId,
      clientMsgId: dto.clientMsgId,
      chatId: dto.chatId,
      senderId,
      recipientId: dto.recipientId,
      content: dto.content,
      type: dto.type,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    // write to DynamoDB
    await this.dynamo.putMessage(message);

    // publish to Kafka for async delivery
    await this.kafka.publish('messages', message);

    return { messageId };
  }

  async handleReadReceipt(userId: string, payload: { messageId: string; chatId: string }) {
    await this.kafka.publish('receipts', {
      messageId: payload.messageId,
      chatId: payload.chatId,
      userId,
      type: 'read',
      timestamp: new Date().toISOString(),
    });
  }
}