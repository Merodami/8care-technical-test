import { PrismaClient, RoleName, AvailabilityStatus } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const roles = [
    {
      name: RoleName.SUPER_ADMIN,
      description: 'Full system access, can manage all users and view audit logs',
      isSystemRole: true,
    },
    {
      name: RoleName.COORDINATOR,
      description: 'Can view and manage caregivers and patients',
      isSystemRole: true,
    },
    {
      name: RoleName.CAREGIVER,
      description: 'Can view and edit own profile',
      isSystemRole: true,
    },
    {
      name: RoleName.PATIENT,
      description: 'Can view and edit own profile',
      isSystemRole: true,
    },
  ];

  console.log('📝 Creating roles...');
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log('🔐 Creating permissions...');
  const permissions = [
    { resource: 'users', action: 'create', description: 'Create new users' },
    { resource: 'users', action: 'read', description: 'View users' },
    { resource: 'users', action: 'update', description: 'Update users' },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    { resource: 'profiles', action: 'read', description: 'View profiles' },
    { resource: 'profiles', action: 'update', description: 'Update profiles' },
    { resource: 'roles', action: 'create', description: 'Create roles' },
    { resource: 'roles', action: 'read', description: 'View roles' },
    { resource: 'roles', action: 'update', description: 'Update roles' },
    { resource: 'roles', action: 'delete', description: 'Delete roles' },
    { resource: 'permissions', action: 'create', description: 'Create permissions' },
    { resource: 'permissions', action: 'read', description: 'View permissions' },
    { resource: 'permissions', action: 'update', description: 'Update permissions' },
    { resource: 'permissions', action: 'delete', description: 'Delete permissions' },
    { resource: 'audit', action: 'read', description: 'View audit logs' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: permission.resource, action: permission.action } },
      update: {},
      create: permission,
    });
  }

  console.log('🔗 Assigning permissions to roles...');
  const superAdminRole = await prisma.role.findUnique({ where: { name: RoleName.SUPER_ADMIN } });
  const coordinatorRole = await prisma.role.findUnique({ where: { name: RoleName.COORDINATOR } });
  const caregiverRole = await prisma.role.findUnique({ where: { name: RoleName.CAREGIVER } });
  const patientRole = await prisma.role.findUnique({ where: { name: RoleName.PATIENT } });

  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole!.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole!.id,
        permissionId: permission.id,
      },
    });
  }

  const coordinatorPermissions = allPermissions.filter(
    (p) =>
      (p.resource === 'users' && ['read', 'update'].includes(p.action)) ||
      (p.resource === 'profiles' && ['read', 'update'].includes(p.action)),
  );

  for (const permission of coordinatorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: coordinatorRole!.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: coordinatorRole!.id,
        permissionId: permission.id,
      },
    });
  }

  const caregiverPatientPermissions = allPermissions.filter(
    (p) => p.resource === 'profiles' && ['read', 'update'].includes(p.action),
  );

  for (const permission of caregiverPatientPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: caregiverRole!.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: caregiverRole!.id,
        permissionId: permission.id,
      },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: patientRole!.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: patientRole!.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('👥 Creating seed users...');
  const seedUsers = [
    {
      email: 'superadmin@8care.ai',
      password: 'SuperAdmin123!',
      role: RoleName.SUPER_ADMIN,
      profile: {
        firstName: 'Super',
        lastName: 'Admin',
        phone: '+1-555-0001',
        address: '123 Admin St, New York, NY 10001',
      },
    },
    {
      email: 'coordinator@8care.ai',
      password: 'Coordinator123!',
      role: RoleName.COORDINATOR,
      profile: {
        firstName: 'Jane',
        lastName: 'Coordinator',
        phone: '+1-555-0002',
        address: '456 Coord Ave, Los Angeles, CA 90001',
      },
      coordinatorProfile: {
        department: 'Care Coordination',
        employeeId: 'COORD-001',
      },
    },
    {
      email: 'caregiver@8care.ai',
      password: 'Caregiver123!',
      role: RoleName.CAREGIVER,
      profile: {
        firstName: 'John',
        lastName: 'Caregiver',
        phone: '+1-555-0003',
        address: '789 Care Blvd, Chicago, IL 60601',
      },
      caregiverProfile: {
        licenseNumber: 'CG-2024-001',
        specialization: 'Elderly Care',
        yearsOfExperience: 5,
        availabilityStatus: AvailabilityStatus.AVAILABLE,
      },
    },
    {
      email: 'patient@8care.ai',
      password: 'Patient123!',
      role: RoleName.PATIENT,
      profile: {
        firstName: 'Mary',
        lastName: 'Patient',
        phone: '+1-555-0004',
        address: '321 Patient Ln, Houston, TX 77001',
        dateOfBirth: new Date('1950-05-15'),
      },
      patientProfile: {
        medicalRecordNumber: 'MRN-2024-001',
        emergencyContactName: 'Robert Patient',
        emergencyContactPhone: '+1-555-0005',
        allergies: 'Penicillin',
        medicalConditions: 'Hypertension, Type 2 Diabetes',
      },
    },
  ];

  for (const userData of seedUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`⏭️  User ${userData.email} already exists, skipping...`);
      continue;
    }

    const passwordHash = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });

    const role = await prisma.role.findUnique({
      where: { name: userData.role },
    });

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role!.id,
      },
    });

    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        firstName: userData.profile.firstName,
        lastName: userData.profile.lastName,
        phone: userData.profile.phone,
        address: userData.profile.address,
        dateOfBirth: userData.profile.dateOfBirth,
      },
    });

    if (userData.role === RoleName.COORDINATOR && userData.coordinatorProfile) {
      await prisma.coordinatorProfile.create({
        data: {
          profileId: profile.id,
          department: userData.coordinatorProfile.department,
          employeeId: userData.coordinatorProfile.employeeId,
        },
      });
    }

    if (userData.role === RoleName.CAREGIVER && userData.caregiverProfile) {
      await prisma.caregiverProfile.create({
        data: {
          profileId: profile.id,
          licenseNumber: userData.caregiverProfile.licenseNumber,
          specialization: userData.caregiverProfile.specialization,
          yearsOfExperience: userData.caregiverProfile.yearsOfExperience,
          availabilityStatus: userData.caregiverProfile.availabilityStatus,
        },
      });
    }

    if (userData.role === RoleName.PATIENT && userData.patientProfile) {
      await prisma.patientProfile.create({
        data: {
          profileId: profile.id,
          medicalRecordNumber: userData.patientProfile.medicalRecordNumber,
          emergencyContactName: userData.patientProfile.emergencyContactName,
          emergencyContactPhone: userData.patientProfile.emergencyContactPhone,
          allergies: userData.patientProfile.allergies,
          medicalConditions: userData.patientProfile.medicalConditions,
        },
      });
    }

    console.log(`✅ Created user: ${userData.email}`);
  }

  console.log('✨ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
