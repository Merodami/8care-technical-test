import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestAppSetup } from '../setup/test-app.setup';
import { UserFactory } from '../factories/user.factory';
import { AuthHelper } from '../helpers/auth.helper';

describe('Roles - CRUD (e2e)', () => {
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

  describe('GET /api/v1/roles', () => {
    it('should return all roles', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const response = await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      const roles = response.body as Array<{ name: string }>;
      expect(roles.length).toBeGreaterThanOrEqual(4);
      expect(roles.some((role) => role.name === 'SUPER_ADMIN')).toBe(true);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/roles').expect(401);
    });
  });

  describe('GET /api/v1/roles/:id', () => {
    it('should return role with permissions', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const role = await prisma.role.findFirst({
        where: { name: 'SUPER_ADMIN' },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/roles/${role?.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        id: role?.id,
        name: 'SUPER_ADMIN',
      });
    });
  });

  describe('POST /api/v1/roles', () => {
    it('should create a new role as SUPER_ADMIN', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const newRoleData = {
        name: 'CUSTOM_ROLE',
        description: 'Custom test role',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set(AuthHelper.getAuthHeader(accessToken))
        .send(newRoleData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: newRoleData.name,
        description: newRoleData.description,
      });
    });

    it('should fail without SUPER_ADMIN role', async () => {
      const { user: coordinator, plainPassword } = await UserFactory.createCoordinator();
      const { accessToken } = await AuthHelper.login(app, coordinator.email, plainPassword);

      await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set(AuthHelper.getAuthHeader(accessToken))
        .send({
          name: 'CUSTOM_ROLE',
          description: 'Should fail',
        })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/roles/:id', () => {
    it('should prevent deletion of system roles', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const systemRole = await prisma.role.findFirst({
        where: { isSystemRole: true },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/roles/${systemRole?.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(400);
    });

    it('should delete custom role', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const customRole = await prisma.role.create({
        data: {
          name: 'TEMP_ROLE',
          description: 'Temporary role',
          isSystemRole: false,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/roles/${customRole.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      const deletedRole = await prisma.role.findUnique({
        where: { id: customRole.id },
      });
      expect(deletedRole).toBeNull();
    });
  });
});
