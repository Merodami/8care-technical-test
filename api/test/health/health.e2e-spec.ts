import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppSetup } from '../setup/test-app.setup';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await TestAppSetup.createTestApp();
  });

  afterAll(async () => {
    await TestAppSetup.closeApp(app);
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
      });
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

      expect(response.body).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        status: expect.any(String),
      });
    });
  });
});
