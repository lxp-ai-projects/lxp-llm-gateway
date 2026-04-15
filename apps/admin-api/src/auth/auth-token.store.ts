import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class AuthTokenStore implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    this.client = createClient({ url: redisUrl });
    this.client.on('error', () => undefined);
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.getClient().set(this.getBlacklistKey(jti), 'revoked', {
      EX: Math.max(ttlSeconds, 1),
    });
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    return (await this.getClient().exists(this.getBlacklistKey(jti))) === 1;
  }

  async setRefreshSession(sessionId: string, refreshJti: string, ttlSeconds: number): Promise<void> {
    await this.getClient().set(this.getSessionKey(sessionId), refreshJti, {
      EX: Math.max(ttlSeconds, 1),
    });
  }

  async getRefreshSession(sessionId: string): Promise<string | null> {
    return this.getClient().get(this.getSessionKey(sessionId));
  }

  async deleteRefreshSession(sessionId: string): Promise<void> {
    await this.getClient().del(this.getSessionKey(sessionId));
  }

  private getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client not initialized.');
    }

    return this.client;
  }

  private getBlacklistKey(jti: string): string {
    return `auth:blacklist:${jti}`;
  }

  private getSessionKey(sessionId: string): string {
    return `auth:refresh-session:${sessionId}`;
  }
}
