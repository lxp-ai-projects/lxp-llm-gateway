import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RegistrationVerificationRateLimitService
  implements OnModuleInit, OnModuleDestroy
{
  private client: RedisClientType | null = null;
  async onModuleInit() {
    this.client = createClient({ url: process.env.REDIS_URL });
    this.client.on('error', () => undefined);
    await this.client.connect();
  }
  async onModuleDestroy() {
    if (this.client?.isOpen) await this.client.quit();
  }
  async assertLimit(
    scope: string,
    value: string,
    limit: number,
    ttlSeconds: number,
  ) {
    const client = this.client;
    if (!client)
      throw new Error('Registration rate limiter is not initialized.');
    const key = `registration-verification:${scope}:${value}`;
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, ttlSeconds);
    if (count > limit)
      throw new HttpException(
        'Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }
}
