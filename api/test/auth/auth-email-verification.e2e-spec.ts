import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestAppSetup } from '../setup/test-app.setup';
import { UserFactory } from '../factories/user.factory';
import * as crypto from 'crypto';

describe('Auth - Email Verification (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    UserFactory.setPrisma(prisma);
    app = await TestAppSetup.createTestApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await TestAppSetup.closeApp(app);
  });

  beforeEach(async () => {
    await prisma.emailVerificationToken.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    UserFactory.reset();
  });

  describe('GET /api/v1/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const { user } = await UserFactory.create({
        emailVerified: false,
      });

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/auth/verify-email?token=${token}`)
        .expect(200);

      expect(response.body.message).toContain('Email verified successfully');

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.emailVerified).toBe(true);
      expect(updatedUser?.emailVerifiedAt).toBeDefined();
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/verify-email?token=invalid').expect(401);
    });

    it('should fail with expired token', async () => {
      const { user } = await UserFactory.create({
        emailVerified: false,
      });

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() - 1);

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await request(app.getHttpServer())
        .get(`/api/v1/auth/verify-email?token=${token}`)
        .expect(401);
    });

    it('should fail with already used token', async () => {
      const { user } = await UserFactory.create({
        emailVerified: false,
      });

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          usedAt: new Date(),
        },
      });

      await request(app.getHttpServer())
        .get(`/api/v1/auth/verify-email?token=${token}`)
        .expect(401);
    });
  });
});
