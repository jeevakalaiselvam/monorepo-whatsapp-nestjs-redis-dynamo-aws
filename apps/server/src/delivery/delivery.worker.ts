import { Injectable, OnModuleInit } from '@nestjs/common';
import { KafkaService } from '../kafka/kafka.service';
import { RedisService } from '../redis/redis.service';
import { DynamoService } from '../dynamo/dynamo.service';
import { ChatGateway } from '../chat/chat.gateway';
import { Message, ReceiptEvent } from '@whatsapp-clone/shared-types';

@Injectable()
export class DeliveryWorker implements OnModuleInit {
  constructor(
    private kafka: KafkaService,
    private redis: RedisService,
    private dynamo: DynamoService,
    private gateway: ChatGateway,
  ) {}

  async onModuleInit() {
    // consume new messages and deliver to recipient
    await this.kafka.subscribe('messages', 'delivery-group', async (msg) => {
      await this.deliverMessage(msg as Message);
    });

    // consume read/delivered receipts and forward to sender
    await this.kafka.subscribe('receipts', 'receipt-group', async (evt) => {
      await this.handleReceipt(evt as ReceiptEvent);
    });
  }

  private async deliverMessage(msg: Message) {
    const delivered = await this.gateway.pushToUser(
      msg.recipientId, 'newMessage', msg,
    );

    if (delivered) {
      // update status and publish delivered receipt
      await this.dynamo.updateMessageStatus(msg.messageId, msg.chatId, 'delivered');
      await this.kafka.publish('receipts', {
        messageId: msg.messageId,
        chatId: msg.chatId,
        userId: msg.recipientId,
        type: 'delivered',
        timestamp: new Date().toISOString(),
      });
    }
    // if not delivered: message stays 'sent' in DynamoDB
    // recipient will sync on next connect via REST /messages/missed
  }

  private async handleReceipt(evt: ReceiptEvent) {
    // find the message to get senderId
    // in prod: denormalize senderId into receipt topic payload
    await this.dynamo.updateMessageStatus(evt.messageId, evt.chatId, evt.type);
    // push receipt to sender — we'd need senderId here
    // include senderId in the receipt event payload (emit from client with it)
  }
}