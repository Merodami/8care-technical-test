import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { RoleName, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserNotFoundException } from '../../common/exceptions/custom.exceptions';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async create(dto: CreateUserDto, createdBy?: string) {
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
          assignedBy: createdBy,
        },
      });
    }

    if (dto.sendWelcomeEmail) {
      await this.mailService.sendVerificationEmail(user.email, 'token-placeholder', dto.firstName);
    }

    return this.findOne(user.id);
  }

  async findAll(query: QueryUsersDto, currentUser?: { roles?: string[] }) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (role) {
      where.userRoles = {
        some: {
          role: {
            name: role,
          },
        },
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (currentUser?.roles?.includes(RoleName.COORDINATOR)) {
      where.userRoles = {
        some: {
          role: {
            name: {
              in: [RoleName.CAREGIVER, RoleName.PATIENT],
            },
          },
        },
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          profile: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
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

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return user;
  }

  async remove(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { message: 'User deleted successfully' };
  }

  async assignRole(userId: string, roleId: string, assignedBy: string) {
    const existingAssignment = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
      },
    });

    if (existingAssignment) {
      return { message: 'Role already assigned to user' };
    }

    await this.prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy,
      },
    });

    return this.findOne(userId);
  }

  async removeRole(userId: string, roleId: string) {
    await this.prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });

    return this.findOne(userId);
  }
}
