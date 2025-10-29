import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const results = await this.redis.multi().incr(key).pttl(key).pexpire(key, ttl).exec();

    const totalHits = results?.[0]?.[1] as number;
    let timeToExpire = results?.[1]?.[1] as number;

    if (timeToExpire === -1) {
      timeToExpire = ttl;
    }

    const isBlocked = totalHits > limit;
    const timeToBlockExpire = isBlocked ? blockDuration : 0;

    return { totalHits, timeToExpire, isBlocked, timeToBlockExpire };
  }
}
