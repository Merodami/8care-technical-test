import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserNotFoundException } from '../../common/exceptions/custom.exceptions';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async findOne(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailVerified: true,
            isActive: true,
            isOtpEnabled: true,
          },
        },
        caregiverProfile: true,
        patientProfile: true,
        coordinatorProfile: true,
      },
    });

    if (!profile) {
      throw new UserNotFoundException();
    }

    return profile;
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.profile.update({
      where: { userId },
      data: dto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailVerified: true,
            isActive: true,
          },
        },
        caregiverProfile: true,
        patientProfile: true,
        coordinatorProfile: true,
      },
    });

    return profile;
  }
}
