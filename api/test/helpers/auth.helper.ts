import request from 'supertest';
import { INestApplication } from '@nestjs/common';

export interface AuthTokens {
  accessToken: string;
  refreshTokenCookie?: string;
}

export class AuthHelper {
  static async login(app: INestApplication, email: string, password: string): Promise<AuthTokens> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const setCookieHeader = response.headers['set-cookie'] as string[] | undefined;
    const refreshTokenCookie = setCookieHeader?.find((cookie: string) =>
      cookie.startsWith('refreshToken='),
    );

    const responseBody = response.body as { accessToken: string };
    return {
      accessToken: responseBody.accessToken,
      refreshTokenCookie,
    };
  }

  static async register(
    app: INestApplication,
    data: { email: string; password: string; firstName: string; lastName: string },
  ) {
    return request(app.getHttpServer()).post('/api/v1/auth/register').send(data);
  }

  static getAuthHeader(accessToken: string): { Authorization: string } {
    return { Authorization: `Bearer ${accessToken}` };
  }

  static async logout(app: INestApplication, accessToken: string, refreshTokenCookie?: string) {
    const req = request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    if (refreshTokenCookie) {
      req.set('Cookie', refreshTokenCookie);
    }

    return req;
  }
}
