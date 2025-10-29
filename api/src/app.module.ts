import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from './common/config';
import { getThrottlerConfig } from './common/config/throttle.config';
import { DatabaseModule } from './database/database.module';
import { AppLoggingModule } from './modules/logging';
import { HealthModule } from './modules/health';
import { MailModule } from './modules/mail';
import { StorageModule } from './modules/storage';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AppLoggingModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getThrottlerConfig,
    }),
    HealthModule,
    MailModule,
    StorageModule,
    AuditModule,
    AuthModule.forRoot(),
    UsersModule,
    RolesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
