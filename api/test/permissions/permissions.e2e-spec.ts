import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestAppSetup } from '../setup/test-app.setup';
import { UserFactory } from '../factories/user.factory';
import { AuthHelper } from '../helpers/auth.helper';

describe('Permissions (e2e)', () => {
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

  describe('GET /api/v1/permissions', () => {
    it('should return all permissions for super admin', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const response = await request(app.getHttpServer())
        .get('/api/v1/permissions')
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/permissions').expect(401);
    });

    it('should fail for non-super-admin users', async () => {
      const { user: coordinator, plainPassword } = await UserFactory.createCoordinator();
      const { accessToken } = await AuthHelper.login(app, coordinator.email, plainPassword);

      await request(app.getHttpServer())
        .get('/api/v1/permissions')
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(403);
    });
  });

  describe('POST /api/v1/permissions', () => {
    it('should create a new permission', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const response = await request(app.getHttpServer())
        .post('/api/v1/permissions')
        .set(AuthHelper.getAuthHeader(accessToken))
        .send({
          resource: 'TEST_RESOURCE',
          action: 'TEST_ACTION',
          description: 'Test permission',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        resource: 'TEST_RESOURCE',
        action: 'TEST_ACTION',
        description: 'Test permission',
      });
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/permissions')
        .send({
          resource: 'TEST_RESOURCE',
          action: 'TEST_ACTION',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/permissions/:id', () => {
    it('should return permission by id', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const permission = await prisma.permission.findFirst();

      if (permission) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/permissions/${permission.id}`)
          .set(AuthHelper.getAuthHeader(accessToken))
          .expect(200);

        expect(response.body.id).toBe(permission.id);
      }
    });
  });

  describe('DELETE /api/v1/permissions/:id', () => {
    it('should delete a permission', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const permission = await prisma.permission.create({
        data: {
          resource: 'DELETE_TEST',
          action: 'DELETE',
          description: 'To be deleted',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/permissions/${permission.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      const deleted = await prisma.permission.findUnique({
        where: { id: permission.id },
      });

      expect(deleted).toBeNull();
    });
  });
});
