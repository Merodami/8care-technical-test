import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface CreateUserOptions {
  email?: string;
  password?: string;
  emailVerified?: boolean;
  isActive?: boolean;
  roles?: RoleName[];
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export class UserFactory {
  private static prisma: PrismaClient;
  private static counter = 0;

  static setPrisma(prisma: PrismaClient): void {
    this.prisma = prisma;
  }

  static async create(options: CreateUserOptions = {}) {
    this.counter++;

    const email = options.email || `test-user-${this.counter}@example.com`;
    const password = options.password || 'Test1234!';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerified: options.emailVerified ?? true,
        emailVerifiedAt: (options.emailVerified ?? true) ? new Date() : null,
        isActive: options.isActive ?? true,
        profile: {
          create: {
            firstName: options.profile?.firstName || 'Test',
            lastName: options.profile?.lastName || 'User',
            phone: options.profile?.phone || null,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    if (options.roles && options.roles.length > 0) {
      const roles = await this.prisma.role.findMany({
        where: { name: { in: options.roles } },
      });

      await this.prisma.userRole.createMany({
        data: roles.map((role) => ({
          userId: user.id,
          roleId: role.id,
        })),
      });
    }

    return { user, plainPassword: password };
  }

  static async createSuperAdmin(options: Partial<CreateUserOptions> = {}) {
    return this.create({
      ...options,
      email: options.email || `superadmin-${this.counter}@example.com`,
      roles: [RoleName.SUPER_ADMIN],
    });
  }

  static async createCoordinator(options: Partial<CreateUserOptions> = {}) {
    return this.create({
      ...options,
      email: options.email || `coordinator-${this.counter}@example.com`,
      roles: [RoleName.COORDINATOR],
    });
  }

  static async createCaregiver(options: Partial<CreateUserOptions> = {}) {
    return this.create({
      ...options,
      email: options.email || `caregiver-${this.counter}@example.com`,
      roles: [RoleName.CAREGIVER],
    });
  }

  static async createPatient(options: Partial<CreateUserOptions> = {}) {
    return this.create({
      ...options,
      email: options.email || `patient-${this.counter}@example.com`,
      roles: [RoleName.PATIENT],
    });
  }

  static reset(): void {
    this.counter = 0;
  }
}
