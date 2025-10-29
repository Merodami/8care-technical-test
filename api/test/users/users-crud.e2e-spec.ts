import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestAppSetup } from '../setup/test-app.setup';
import { UserFactory } from '../factories/user.factory';
import { AuthHelper } from '../helpers/auth.helper';

describe('Users - CRUD (e2e)', () => {
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

  describe('GET /api/v1/users', () => {
    it('should return all users for SUPER_ADMIN', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      await UserFactory.createPatient();
      await UserFactory.createCaregiver();

      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      const responseBody = response.body as { data: unknown[] };
      expect(responseBody.data).toHaveLength(3);
    });

    it('should filter users by role', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      await UserFactory.createPatient();
      await UserFactory.createCaregiver();

      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const response = await request(app.getHttpServer())
        .get('/api/v1/users?role=PATIENT')
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      const responseBody = response.body as {
        data: Array<{ userRoles: Array<{ role: { name: string } }> }>;
      };
      expect(responseBody.data).toHaveLength(1);
      expect(responseBody.data[0].userRoles[0].role.name).toBe('PATIENT');
    });

    it('should support pagination', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      await Promise.all([
        UserFactory.createPatient(),
        UserFactory.createPatient(),
        UserFactory.createPatient(),
      ]);

      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const response = await request(app.getHttpServer())
        .get('/api/v1/users?page=1&limit=2')
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      const responseBody = response.body as {
        data: unknown[];
        meta: { page: number; limit: number };
      };
      expect(responseBody.data.length).toBeLessThanOrEqual(2);
      expect(responseBody.meta).toMatchObject({
        page: 1,
        limit: 2,
      });
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return user by id', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { user: patient } = await UserFactory.createPatient();

      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${patient.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        id: patient.id,
        email: patient.email,
      });
    });

    it('should fail with non-existent id', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      await request(app.getHttpServer())
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(404);
    });
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user as SUPER_ADMIN', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const newUserData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(AuthHelper.getAuthHeader(accessToken))
        .send(newUserData)
        .expect(201);

      expect(response.body).toMatchObject({
        email: newUserData.email,
      });

      const user = await prisma.user.findUnique({
        where: { email: newUserData.email },
      });
      expect(user).toBeDefined();
    });

    it('should fail without SUPER_ADMIN role', async () => {
      const { user: patient, plainPassword } = await UserFactory.createPatient();
      const { accessToken } = await AuthHelper.login(app, patient.email, plainPassword);

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(AuthHelper.getAuthHeader(accessToken))
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'User',
        })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should update user as SUPER_ADMIN', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { user: patient } = await UserFactory.createPatient();

      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      await request(app.getHttpServer())
        .patch(`/api/v1/users/${patient.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .send({
          isActive: false,
        })
        .expect(200);

      const updatedUser = await prisma.user.findUnique({
        where: { id: patient.id },
      });
      expect(updatedUser?.isActive).toBe(false);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should soft delete user as SUPER_ADMIN', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { user: patient } = await UserFactory.createPatient();

      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${patient.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      const deletedUser = await prisma.user.findUnique({
        where: { id: patient.id },
      });
      expect(deletedUser?.deletedAt).toBeDefined();
    });

    it('should fail without SUPER_ADMIN role', async () => {
      const { user: coordinator, plainPassword } = await UserFactory.createCoordinator();
      const { user: patient } = await UserFactory.createPatient();

      const { accessToken } = await AuthHelper.login(app, coordinator.email, plainPassword);

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${patient.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(403);
    });
  });
});
