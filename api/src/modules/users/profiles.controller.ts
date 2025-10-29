import { Controller, Get, Body, Patch, UseGuards, Param } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface UserPayload {
  userId: string;
  email: string;
}

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: UserPayload) {
    return this.profilesService.findOne(user.userId);
  }

  @Patch('me')
  updateMyProfile(@CurrentUser() user: UserPayload, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profilesService.update(user.userId, updateProfileDto);
  }

  @Get(':userId')
  getProfile(@Param('userId') userId: string) {
    return this.profilesService.findOne(userId);
  }

  @Patch(':userId')
  updateProfile(@Param('userId') userId: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profilesService.update(userId, updateProfileDto);
  }
}
