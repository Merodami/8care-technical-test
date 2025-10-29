import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { AuthProvider, RoleName } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL') || '',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user?: any) => void,
  ): Promise<any> {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      done(new Error('Email not provided by GitHub'), false);
      return;
    }

    const authProvider = await this.prisma.userAuthProvider.findUnique({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.GITHUB,
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

      await this.prisma.userAuthProvider.update({
        where: { id: authProvider.id },
        data: {
          accessToken: encryptedAccessToken,
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

      await this.prisma.userAuthProvider.create({
        data: {
          userId: user.id,
          provider: AuthProvider.GITHUB,
          providerUserId: id,
          accessToken: encryptedAccessToken,
        },
      });

      done(null, user);
      return;
    }

    if (!user) {
      const [firstName, ...lastNameParts] = (displayName || email.split('@')[0]).split(' ');
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

      await this.prisma.userAuthProvider.create({
        data: {
          userId: createdUser.id,
          provider: AuthProvider.GITHUB,
          providerUserId: id,
          accessToken: encryptedAccessToken,
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
