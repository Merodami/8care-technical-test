import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

export class TestContainerSetup {
  private static postgresContainer: StartedPostgreSqlContainer;
  private static redisContainer: StartedTestContainer;
  private static minioContainer: StartedTestContainer;
  private static prisma: PrismaClient;

  static async startContainers(): Promise<void> {
    console.log('Starting test containers...');

    await Promise.all([this.startPostgres(), this.startRedis(), this.startMinio()]);

    this.runMigrations();
    await this.seedDatabase();

    console.log('Test containers ready');
  }

  private static async startPostgres(): Promise<void> {
    this.postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts(5432)
      .start();

    const databaseUrl = `postgresql://test_user:test_password@${this.postgresContainer.getHost()}:${this.postgresContainer.getMappedPort(5432)}/test_db`;
    process.env.DATABASE_URL = databaseUrl;

    console.log('PostgreSQL container started');
  }

  private static async startRedis(): Promise<void> {
    this.redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withCommand(['redis-server', '--requirepass', 'test_redis_password'])
      .start();

    const redisUrl = `redis://:test_redis_password@${this.redisContainer.getHost()}:${this.redisContainer.getMappedPort(6379)}`;
    process.env.REDIS_URL = redisUrl;

    console.log('Redis container started');
  }

  private static async startMinio(): Promise<void> {
    this.minioContainer = await new GenericContainer('minio/minio:latest')
      .withExposedPorts(9000)
      .withEnvironment({
        MINIO_ROOT_USER: 'test_minio_user',
        MINIO_ROOT_PASSWORD: 'test_minio_password',
      })
      .withCommand(['server', '/data'])
      .start();

    process.env.MINIO_ENDPOINT = this.minioContainer.getHost();
    process.env.MINIO_PORT = this.minioContainer.getMappedPort(9000).toString();
    process.env.MINIO_ACCESS_KEY = 'test_minio_user';
    process.env.MINIO_SECRET_KEY = 'test_minio_password';
    process.env.MINIO_USE_SSL = 'false';

    console.log('MinIO container started');
  }

  private static runMigrations(): void {
    console.log('Running database migrations...');
    execSync('npx prisma migrate deploy', {
      env: { ...process.env },
      stdio: 'inherit',
    });
    console.log('Migrations completed');
  }

  private static async seedDatabase(): Promise<void> {
    console.log('Seeding test database...');
    this.prisma = new PrismaClient();

    await this.prisma.role.createMany({
      data: [
        { name: 'SUPER_ADMIN', description: 'Super Administrator', isSystemRole: true },
        { name: 'COORDINATOR', description: 'Care Coordinator', isSystemRole: true },
        { name: 'CAREGIVER', description: 'Caregiver', isSystemRole: true },
        { name: 'PATIENT', description: 'Patient', isSystemRole: true },
      ],
      skipDuplicates: true,
    });

    console.log('Database seeded');
  }

  static async stopContainers(): Promise<void> {
    console.log('Stopping test containers...');

    if (this.prisma) {
      await this.prisma.$disconnect();
    }

    await Promise.all([
      this.postgresContainer?.stop(),
      this.redisContainer?.stop(),
      this.minioContainer?.stop(),
    ]);

    console.log('Test containers stopped');
  }

  static getPostgresContainer(): StartedPostgreSqlContainer {
    return this.postgresContainer;
  }

  static getRedisContainer(): StartedTestContainer {
    return this.redisContainer;
  }

  static getMinioContainer(): StartedTestContainer {
    return this.minioContainer;
  }
}
