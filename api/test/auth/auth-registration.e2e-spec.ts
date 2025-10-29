import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestAppSetup } from '../setup/test-app.setup';
import { UserFactory } from '../factories/user.factory';

describe('Auth - Registration (e2e)', () => {
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
    await prisma.user.deleteMany();
    UserFactory.reset();
  });

  describe('POST /api/v1/auth/register', () => {
    const validRegistrationData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: expect.any(String),
      });

      const user = await prisma.user.findUnique({
        where: { email: validRegistrationData.email },
        include: { profile: true },
      });

      expect(user).toBeDefined();
      expect(user?.emailVerified).toBe(false);
      expect(user?.profile?.firstName).toBe(validRegistrationData.firstName);
      expect(user?.profile?.lastName).toBe(validRegistrationData.lastName);
    });

    it('should fail with duplicate email', async () => {
      await UserFactory.create({ email: validRegistrationData.email });

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validRegistrationData)
        .expect(409);
    });

    it('should fail with weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...validRegistrationData,
          password: '123',
        })
        .expect(400);
    });

    it('should fail with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...validRegistrationData,
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
        })
        .expect(400);
    });

    it('should create email verification token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validRegistrationData)
        .expect(201);

      const token = await prisma.emailVerificationToken.findFirst({
        where: {
          user: { email: validRegistrationData.email },
        },
      });

      expect(token).toBeDefined();
      expect(token?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
