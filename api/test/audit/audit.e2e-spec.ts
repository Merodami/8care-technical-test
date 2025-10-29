import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestAppSetup } from '../setup/test-app.setup';
import { UserFactory } from '../factories/user.factory';
import { AuthHelper } from '../helpers/auth.helper';

describe('Audit (e2e)', () => {
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
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    UserFactory.reset();
  });

  describe('GET /api/v1/audit', () => {
    it('should return audit logs for super admin', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'USER_LOGIN',
          resourceType: 'USER',
          resourceId: admin.id,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/audit')
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.logs)).toBe(true);
      expect(response.body.logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter audit logs by userId', async () => {
      const { user: admin, plainPassword } = await UserFactory.createSuperAdmin();
      const { user: otherUser } = await UserFactory.createPatient();
      const { accessToken } = await AuthHelper.login(app, admin.email, plainPassword);

      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'USER_LOGIN',
          resourceType: 'USER',
          resourceId: admin.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: otherUser.id,
          action: 'USER_CREATED',
          resourceType: 'USER',
          resourceId: otherUser.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/audit?userId=${otherUser.id}`)
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(200);

      expect(
        response.body.logs.every((log: { userId: string }) => log.userId === otherUser.id),
      ).toBe(true);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/audit').expect(401);
    });

    it('should fail for non-super-admin users', async () => {
      const { user: coordinator, plainPassword } = await UserFactory.createCoordinator();
      const { accessToken } = await AuthHelper.login(app, coordinator.email, plainPassword);

      await request(app.getHttpServer())
        .get('/api/v1/audit')
        .set(AuthHelper.getAuthHeader(accessToken))
        .expect(403);
    });
  });
});
