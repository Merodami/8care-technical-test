import { Module, DynamicModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { PrismaService } from '../../database/prisma.service';
import { MailModule } from '../mail/mail.module';

@Module({})
export class AuthModule {
  static forRoot(): DynamicModule {
    const providers = [
      AuthService,
      TokenService,
      OtpService,
      LocalStrategy,
      JwtStrategy,
      PrismaService,
    ];

    return {
      module: AuthModule,
      imports: [
        PassportModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_ACCESS_SECRET'),
            signOptions: {
              expiresIn: configService.get('JWT_ACCESS_EXPIRATION'),
            },
          }),
        }),
        MailModule,
      ],
      controllers: [AuthController],
      providers: [
        ...providers,
        {
          provide: 'OAUTH_STRATEGIES',
          useFactory: (configService: ConfigService) => {
            const strategies = [];

            if (configService.get('GOOGLE_CLIENT_ID')) {
              strategies.push(GoogleStrategy);
            }

            if (configService.get('GITHUB_CLIENT_ID')) {
              strategies.push(GithubStrategy);
            }

            return strategies;
          },
          inject: [ConfigService],
        },
      ],
      exports: [AuthService, TokenService, OtpService],
    };
  }
}
