import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TokenService } from './token.service';
import { OtpService } from './otp.service';
import { MailService } from '../../mail/mail.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import * as bcrypt from 'bcrypt';
import {
  InvalidCredentialsException,
  EmailNotVerifiedException,
  UserNotFoundException,
  AccountInactiveException,
} from '../../../common/exceptions/custom.exceptions';
import { RoleName } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
    private otpService: OtpService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        emailVerified: false,
      },
    });

    await this.prisma.profile.create({
      data: {
        userId: user.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    const roleName = dto.role || RoleName.PATIENT;
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (role) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    const verificationToken = await this.tokenService.createEmailVerificationToken(user.id);
    await this.mailService.sendVerificationEmail(user.email, verificationToken, dto.firstName);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async verifyEmail(token: string) {
    const userId = await this.tokenService.validateEmailVerificationToken(token);

    if (!userId) {
      throw new InvalidCredentialsException();
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        profile: true,
      },
    });

    if (!user) {
      throw new InvalidCredentialsException();
    }

    if (!user.passwordHash) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    if (!user.emailVerified) {
      throw new EmailNotVerifiedException();
    }

    if (!user.isActive) {
      throw new AccountInactiveException();
    }

    if (user.isOtpEnabled) {
      const otpCode = this.otpService.generateOtp();
      await this.otpService.storeOtp(user.id, otpCode);
      await this.mailService.sendOTPEmail(user.email, otpCode);

      const partialToken = this.tokenService.generateAccessToken({
        sub: user.id,
        email: user.email,
        roles: [],
        permissions: [],
      });

      return {
        otpRequired: true,
        partialToken,
        message: 'OTP sent to your email',
      };
    }

    return this.generateAuthResponse(user);
  }

  async verifyOtp(userId: string, code: string) {
    const isValid = await this.otpService.verifyOtp(userId, code);

    if (!isValid) {
      throw new InvalidCredentialsException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        profile: true,
      },
    });

    if (!user) {
      throw new UserNotFoundException();
    }

    return this.generateAuthResponse(user);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    const resetToken = await this.tokenService.createPasswordResetToken(user.id);
    await this.mailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.tokenService.validatePasswordResetToken(token);

    if (!userId) {
      throw new InvalidCredentialsException();
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.tokenService.revokeAllUserTokens(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      await this.mailService.sendPasswordChangedEmail(user.email);
    }

    return { message: 'Password reset successfully' };
  }

  async refreshToken(token: string) {
    const result = await this.tokenService.validateRefreshToken(token);

    if (!result) {
      throw new InvalidCredentialsException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: result.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UserNotFoundException();
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => `${rp.permission.resource}.${rp.permission.action}`),
    );

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      roles,
      permissions,
    });

    return { accessToken };
  }

  async logout(token: string) {
    await this.tokenService.revokeRefreshToken(token);
    return { message: 'Logged out successfully' };
  }

  async generateAuthResponse(user: {
    id: string;
    email: string;
    userRoles: Array<{
      role: {
        name: string;
        rolePermissions: Array<{
          permission: {
            resource: string;
            action: string;
          };
        }>;
      };
    }>;
    profile?: unknown;
  }) {
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => `${rp.permission.resource}.${rp.permission.action}`),
    );

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      roles,
      permissions,
    });

    const { token: refreshToken } = await this.tokenService.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roles,
        permissions,
        profile: user.profile,
      },
    };
  }
}
