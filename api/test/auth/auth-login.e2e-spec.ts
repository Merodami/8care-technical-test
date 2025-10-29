import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestAppSetup } from '../setup/test-app.setup';
import { UserFactory } from '../factories/user.factory';
import { AuthHelper } from '../helpers/auth.helper';

describe('Auth - Login (e2e)', () => {
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

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const { user, plainPassword } = await UserFactory.create();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: plainPassword,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        user: {
          id: user.id,
          email: user.email,
        },
      });

      const setCookieHeader = response.headers['set-cookie'];
      const cookies: string[] = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader].filter(Boolean);
      const refreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
    });

    it('should fail with invalid password', async () => {
      const { user } = await UserFactory.create();

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should fail with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test1234!',
        })
        .expect(401);
    });

    it('should fail with unverified email', async () => {
      const { user, plainPassword } = await UserFactory.create({
        emailVerified: false,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: plainPassword,
        })
        .expect(403);
    });

    it('should fail with inactive user', async () => {
      const { user, plainPassword } = await UserFactory.create({
        isActive: false,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: plainPassword,
        })
        .expect(403);
    });

    it('should create refresh token in database', async () => {
      const { user, plainPassword } = await UserFactory.create();

      await AuthHelper.login(app, user.email, plainPassword);

      const refreshToken = await prisma.refreshToken.findFirst({
        where: { userId: user.id },
      });

      expect(refreshToken).toBeDefined();
      expect(refreshToken?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should include user roles and permissions in response', async () => {
      const { user, plainPassword } = await UserFactory.createSuperAdmin();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: plainPassword,
        })
        .expect(200);

      const responseBody = response.body as { user: { roles: string[]; permissions: unknown[] } };
      expect(responseBody.user.roles).toContain('SUPER_ADMIN');
      expect(responseBody.user.permissions).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const { user, plainPassword } = await UserFactory.create();
      const { accessToken, refreshTokenCookie } = await AuthHelper.login(
        app,
        user.email,
        plainPassword,
      );

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshTokenCookie || '')
        .expect(200);

      const refreshToken = await prisma.refreshToken.findFirst({
        where: { userId: user.id },
      });

      expect(refreshToken?.revokedAt).toBeDefined();
    });

    it('should fail without access token', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(401);
    });
  });
});
