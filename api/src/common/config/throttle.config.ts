import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nestjs/throttler/dist/throttler-storage-redis.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const getThrottlerConfig = (configService: ConfigService): ThrottlerModuleOptions => {
  const redis = new Redis({
    host: configService.get('REDIS_HOST'),
    port: configService.get('REDIS_PORT'),
    password: configService.get('REDIS_PASSWORD'),
  });

  return {
    throttlers: [
      {
        ttl: 60000,
        limit: 100,
      },
    ],
    storage: new ThrottlerStorageRedisService(redis),
  };
};
