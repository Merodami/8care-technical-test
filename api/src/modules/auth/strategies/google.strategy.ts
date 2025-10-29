import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { AuthProvider, RoleName } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      done(new Error('No email provided by Google'), false);
      return;
    }

    const authProvider = await this.prisma.userAuthProvider.findUnique({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.GOOGLE,
          providerUserId: id,
        },
      },
      include: {
        user: {
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
        },
      },
    });

    if (authProvider) {
      const encryptedAccessToken = this.encryptToken(accessToken);
      const encryptedRefreshToken = refreshToken ? this.encryptToken(refreshToken) : null;

      await this.prisma.userAuthProvider.update({
        where: { id: authProvider.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
        },
      });

      done(null, authProvider.user);
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
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

    if (user && user.emailVerified) {
      const encryptedAccessToken = this.encryptToken(accessToken);
      const encryptedRefreshToken = refreshToken ? this.encryptToken(refreshToken) : null;

      await this.prisma.userAuthProvider.create({
        data: {
          userId: user.id,
          provider: AuthProvider.GOOGLE,
          providerUserId: id,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
        },
      });

      done(null, user);
      return;
    }

    if (!user) {
      const [firstName, ...lastNameParts] = displayName.split(' ');
      const lastName = lastNameParts.join(' ') || '';

      const createdUser = await this.prisma.user.create({
        data: {
          email,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      await this.prisma.profile.create({
        data: {
          userId: createdUser.id,
          firstName,
          lastName,
          avatarUrl: photos?.[0]?.value,
        },
      });

      const patientRole = await this.prisma.role.findUnique({
        where: { name: RoleName.PATIENT },
      });

      if (patientRole) {
        await this.prisma.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: patientRole.id,
          },
        });
      }

      const encryptedAccessToken = this.encryptToken(accessToken);
      const encryptedRefreshToken = refreshToken ? this.encryptToken(refreshToken) : null;

      await this.prisma.userAuthProvider.create({
        data: {
          userId: createdUser.id,
          provider: AuthProvider.GOOGLE,
          providerUserId: id,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
        },
      });

      const userWithRelations = await this.prisma.user.findUnique({
        where: { id: createdUser.id },
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

      if (userWithRelations) {
        done(null, userWithRelations);
      } else {
        done(new Error('Failed to create user'), false);
      }
      return;
    }

    done(null, user);
  }

  private encryptToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
