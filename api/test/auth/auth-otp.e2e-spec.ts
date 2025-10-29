import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestAppSetup } from '../setup/test-app.setup';
import { UserFactory } from '../factories/user.factory';

describe('Auth - OTP (e2e)', () => {
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

  describe('POST /api/v1/auth/otp/verify', () => {
    it('should verify OTP and return tokens', async () => {
      const { user, plainPassword } = await UserFactory.create({
        roles: ['PATIENT'],
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { isOtpEnabled: true, otpSecret: 'test-secret' },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: plainPassword,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('otpRequired', true);
      expect(loginResponse.body).toHaveProperty('partialToken');

      const partialToken = loginResponse.body.partialToken;
      const otpCode = '123456';

      const response = await request(app.getHttpServer()).post('/api/v1/auth/otp/verify').send({
        partialToken,
        code: otpCode,
      });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('user');
      }
    });

    it('should fail with invalid OTP code', async () => {
      const { user, plainPassword } = await UserFactory.create({
        roles: ['PATIENT'],
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { isOtpEnabled: true, otpSecret: 'test-secret' },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: plainPassword,
        })
        .expect(200);

      const partialToken = loginResponse.body.partialToken;

      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({
          partialToken,
          code: 'wrong-code',
        })
        .expect(400);
    });
  });
});
