import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestAppSetup } from '../setup/test-app.setup';
import { UserFactory } from '../factories/user.factory';
import { AuthHelper } from '../helpers/auth.helper';

describe('Profiles (e2e)', () => {
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

  describe('GET /api/v1/profiles/me', () => {
    it('should return current user profile', async () => {
      const { user, plainPassword } = await UserFactory.createPatient();
      const { accessToken } = await AuthHelper.login(app, user.email, plainPassword);

      const response = await request(app.getHttpServer())
        .get('/api/v1/profiles/me')
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        userId: user.id,
        firstName: expect.any(String),
        lastName: expect.any(String),
      });
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/profiles/me').expect(401);
    });
  });

  describe('PATCH /api/v1/profiles/me', () => {
    it('should update current user profile', async () => {
      const { user, plainPassword } = await UserFactory.createPatient();
      const { accessToken } = await AuthHelper.login(app, user.email, plainPassword);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .set(AuthHelper.getAuthHeader(accessToken))
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        firstName: 'Updated',
        lastName: 'Name',
      });
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/profiles/me')
        .send({
          firstName: 'Test',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/profiles/:userId', () => {
    it('should return user profile by userId', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { user: targetUser } = await UserFactory.createPatient();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/profiles/${targetUser.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      expect(response.body.userId).toBe(targetUser.id);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/profiles/some-user-id').expect(401);
    });
  });

  describe('PATCH /api/v1/profiles/:userId', () => {
    it('should update user profile by userId', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { user: targetUser } = await UserFactory.createPatient();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/profiles/${targetUser.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .send({
          firstName: 'AdminUpdated',
          lastName: 'Profile',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        firstName: 'AdminUpdated',
        lastName: 'Profile',
      });
    });
  });
});
