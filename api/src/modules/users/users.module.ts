import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { ProfilesService } from './profiles.service';
import { UsersController } from './users.controller';
import { ProfilesController } from './profiles.controller';
import { PrismaService } from '../../database/prisma.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [UsersController, ProfilesController],
  providers: [UsersService, ProfilesService, PrismaService],
  exports: [UsersService, ProfilesService],
})
export class UsersModule {}
