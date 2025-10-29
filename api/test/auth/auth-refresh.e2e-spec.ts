import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestAppSetup } from '../setup/test-app.setup';
import { UserFactory } from '../factories/user.factory';
import { AuthHelper } from '../helpers/auth.helper';

describe('Auth - Refresh Token (e2e)', () => {
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
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    UserFactory.reset();
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const { user, plainPassword } = await UserFactory.create();
      const { refreshTokenCookie } = await AuthHelper.login(app, user.email, plainPassword);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshTokenCookie || '')
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
      });
    });

    it('should fail without refresh token cookie', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(401);
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);
    });

    it('should fail with revoked refresh token', async () => {
      const { user, plainPassword } = await UserFactory.create();
      const { accessToken, refreshTokenCookie } = await AuthHelper.login(
        app,
        user.email,
        plainPassword,
      );

      await AuthHelper.logout(app, accessToken, refreshTokenCookie);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshTokenCookie || '')
        .expect(401);
    });

    it('should fail with expired refresh token', async () => {
      const { user } = await UserFactory.create();
      const refreshToken = await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: 'expired-token-hash',
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken.tokenHash}`)
        .expect(401);
    });
  });
});
