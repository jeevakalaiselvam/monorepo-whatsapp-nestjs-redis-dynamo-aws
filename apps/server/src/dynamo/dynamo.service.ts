import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoService {
  private client: DynamoDBDocumentClient;
  private table: string;

  constructor(private config: ConfigService) {
    const raw = new DynamoDBClient({
      region: this.config.get('dynamo.region'),
      ...(this.config.get('dynamo.endpoint') && {
        endpoint: this.config.get('dynamo.endpoint'),
        credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
      }),
    });
    this.client = DynamoDBDocumentClient.from(raw);
    this.table = this.config.get<string>('dynamo.tableName')!;
  }

  async putMessage(message: Record<string, unknown>) {
    await this.client.send(new PutCommand({
      TableName: this.table,
      Item: message,
    }));
  }

  async getByClientMsgId(clientMsgId: string) {
    const res = await this.client.send(new QueryCommand({
      TableName: this.table,
      IndexName: 'clientMsgId-index',
      KeyConditionExpression: 'clientMsgId = :k',
      ExpressionAttributeValues: { ':k': clientMsgId },
      Limit: 1,
    }));
    return res.Items?.[0];
  }

  async updateMessageStatus(messageId: string, chatId: string, status: string) {
    // simplified — in prod use UpdateCommand with ConditionExpression
    const res = await this.client.send(new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: 'chatId = :c AND messageId = :m',
      ExpressionAttributeValues: { ':c': chatId, ':m': messageId },
      Limit: 1,
    }));
    if (res.Items?.[0]) {
      await this.putMessage({ ...res.Items[0], status });
    }
  }
}