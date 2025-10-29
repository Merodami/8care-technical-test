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

  describe('DELETE /api/v1/roles/:id', () => {
    it('should prevent deletion of system roles', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const systemRole = await prisma.role.findFirst({
        where: { name: 'PATIENT' },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/roles/${systemRole?.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(400);
    });
  });

  describe('POST /api/v1/roles/:id/permissions', () => {
    it('should assign permission to role', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const role = await prisma.role.findFirst({
        where: { name: 'CAREGIVER' },
      });

      const permission = await prisma.permission.findFirst();

      await request(app.getHttpServer())
        .post(`/api/v1/roles/${role?.id}/permissions`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .send({
          permissionId: permission?.id,
        })
        .expect(201);

      const roleWithPermissions = await prisma.role.findUnique({
        where: { id: role?.id },
        include: { rolePermissions: true },
      });

      expect(
        roleWithPermissions?.rolePermissions.some((rp) => rp.permissionId === permission?.id),
      ).toBe(true);
    });

    it('should fail without authentication', async () => {
      const role = await prisma.role.findFirst();
      const permission = await prisma.permission.findFirst();

      await request(app.getHttpServer())
        .post(`/api/v1/roles/${role?.id}/permissions`)
        .send({
          permissionId: permission?.id,
        })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/roles/:id/permissions/:permissionId', () => {
    it('should remove permission from role', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      const role = await prisma.role.findFirst({
        where: { name: 'COORDINATOR' },
      });

      const permission = await prisma.permission.findFirst();

      await prisma.rolePermission.create({
        data: {
          roleId: role!.id,
          permissionId: permission!.id,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/roles/${role?.id}/permissions/${permission?.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      const rolePermission = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: role!.id,
            permissionId: permission!.id,
          },
        },
      });

      expect(rolePermission).toBeNull();
    });
  });
});
