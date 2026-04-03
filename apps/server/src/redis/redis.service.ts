import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private config: ConfigService) {
    this.client = new Redis({
      host: this.config.get('redis.host'),
      port: this.config.get('redis.port'),
    });
  }

  async onModuleInit() {
    this.client.on('error', (e) => console.error('Redis error', e));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // store userId → connectionId with 90s TTL (refreshed by heartbeat)
  async setConnection(userId: string, connectionId: string) {
    await this.client.set(`conn:${userId}`, connectionId, 'EX', 90);
  }

  async getConnection(userId: string): Promise<string | null> {
    return this.client.get(`conn:${userId}`);
  }

  async delConnection(userId: string) {
    await this.client.del(`conn:${userId}`);
  }

  // online presence
  async setOnline(userId: string) {
    await this.client.set(`online:${userId}`, '1', 'EX', 90);
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.client.exists(`online:${userId}`)) === 1;
  }

  // idempotency — returns false if key already existed (duplicate message)
  async acquireIdempotencyKey(key: string): Promise<boolean> {
    const result = await this.client.set(`idem:${key}`, '1', 'EX', 86400, 'NX');
    return result === 'OK';
  }
}