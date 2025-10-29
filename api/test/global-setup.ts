import { TestContainerSetup } from './setup/test-container.setup';

export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-minimum-32-chars-long';
  process.env.JWT_ACCESS_EXPIRATION = '15m';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-minimum-32-chars-long';
  process.env.JWT_REFRESH_EXPIRATION = '30d';
  process.env.OTP_EXPIRATION_MINUTES = '5';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.CORS_ORIGINS = 'http://localhost:3000';
  process.env.SMTP_HOST = 'localhost';
  process.env.SMTP_PORT = '1025';
  process.env.SMTP_USER = '';
  process.env.SMTP_PASS = '';
  process.env.MAIL_FROM = 'test@8care.com';

  await TestContainerSetup.startContainers();
}
