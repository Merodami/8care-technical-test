import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestAppSetup } from '../setup/test-app.setup';
import { UserFactory } from '../factories/user.factory';
import * as crypto from 'crypto';

describe('Auth - Password Reset (e2e)', () => {
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
    await prisma.passwordResetToken.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    UserFactory.reset();
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      const { user } = await UserFactory.createPatient();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({
          email: user.email,
        })
        .expect(200);

      expect(response.body.message).toContain('password reset link');

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id },
      });

      expect(resetToken).toBeDefined();
    });

    it('should return generic message for non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      expect(response.body.message).toContain('password reset link');
    });

    it('should fail with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'invalid-email',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const { user } = await UserFactory.createPatient();

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token,
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      expect(response.body.message).toContain('Password reset successfully');

      const resetTokenRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      });

      expect(resetTokenRecord?.usedAt).toBeDefined();
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        })
        .expect(401);
    });

    it('should fail with expired token', async () => {
      const { user } = await UserFactory.createPatient();

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() - 1);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token,
          newPassword: 'NewPassword123!',
        })
        .expect(401);
    });

    it('should fail with weak password', async () => {
      const { user } = await UserFactory.createPatient();

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token,
          newPassword: 'weak',
        })
        .expect(400);
    });
  });
});
