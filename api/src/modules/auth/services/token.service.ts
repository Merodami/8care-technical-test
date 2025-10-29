import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import * as crypto from 'crypto';
import { JwtPayload } from '../../../common/types/jwt-payload.type';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
    });
  }

  async generateRefreshToken(userId: string): Promise<{ token: string; tokenHash: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return { token, tokenHash };
  }

  async validateRefreshToken(token: string): Promise<{ userId: string } | null> {
    if (!token) {
      return null;
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!refreshToken || refreshToken.revokedAt || refreshToken.expiresAt < new Date()) {
      return null;
    }

    return { userId: refreshToken.userId };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    if (!token) {
      return;
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async createEmailVerificationToken(userId: string): Promise<string> {
    const token = this.generateEmailVerificationToken();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date();
    const hours = this.configService.get<number>('EMAIL_VERIFICATION_EXPIRATION_HOURS') || 24;
    expiresAt.setHours(expiresAt.getHours() + hours);

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  async validateEmailVerificationToken(token: string): Promise<string | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (
      !verificationToken ||
      verificationToken.usedAt ||
      verificationToken.expiresAt < new Date()
    ) {
      return null;
    }

    await this.prisma.emailVerificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });

    return verificationToken.userId;
  }

  async createPasswordResetToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date();
    const hours = this.configService.get<number>('PASSWORD_RESET_EXPIRATION_HOURS') || 1;
    expiresAt.setHours(expiresAt.getHours() + hours);

    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  async validatePasswordResetToken(token: string): Promise<string | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return null;
    }

    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return resetToken.userId;
  }
}
