import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
    });
  }

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashOtp(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async storeOtp(userId: string, code: string): Promise<void> {
    const hashedCode = this.hashOtp(code);
    const expirationMinutes = this.configService.get<number>('OTP_EXPIRATION_MINUTES') || 5;
    const key = `otp:${userId}`;

    await this.redis.setex(key, expirationMinutes * 60, hashedCode);
    await this.redis.setex(`${key}:attempts`, expirationMinutes * 60, '0');
  }

  async verifyOtp(userId: string, code: string): Promise<boolean> {
    const key = `otp:${userId}`;
    const attemptsKey = `${key}:attempts`;

    const storedHash = await this.redis.get(key);
    if (!storedHash) {
      return false;
    }

    const attempts = parseInt((await this.redis.get(attemptsKey)) || '0');
    const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS') || 3;

    if (attempts >= maxAttempts) {
      await this.redis.del(key);
      await this.redis.del(attemptsKey);
      return false;
    }

    const hashedCode = this.hashOtp(code);

    if (hashedCode === storedHash) {
      await this.redis.del(key);
      await this.redis.del(attemptsKey);
      return true;
    }

    await this.redis.incr(attemptsKey);
    return false;
  }

  async deleteOtp(userId: string): Promise<void> {
    const key = `otp:${userId}`;
    await this.redis.del(key);
    await this.redis.del(`${key}:attempts`);
  }
}
