import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform(Number),

  DATABASE_URL: z.string(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('30d'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),

  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.string().default('9000').transform(Number),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_USE_SSL: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  MINIO_BUCKET_NAME: z.string().default('8care-avatars'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.string().default('1025').transform(Number),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().default('noreply@8care.ai'),

  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  OTP_EXPIRATION_MINUTES: z.string().default('5').transform(Number),
  OTP_MAX_ATTEMPTS: z.string().default('3').transform(Number),

  EMAIL_VERIFICATION_EXPIRATION_HOURS: z.string().default('24').transform(Number),
  PASSWORD_RESET_EXPIRATION_HOURS: z.string().default('1').transform(Number),

  RATE_LIMIT_TTL: z.string().default('60').transform(Number),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  RATE_LIMIT_AUTH_TTL: z.string().default('900').transform(Number),
  RATE_LIMIT_AUTH_MAX: z.string().default('5').transform(Number),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  SEED_DATA: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  ENCRYPTION_KEY: z.string().min(32),
});

export type EnvConfig = z.infer<typeof envSchema>;
