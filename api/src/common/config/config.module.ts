import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envSchema } from './env.schema';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          throw new Error(
            `Environment validation failed: ${JSON.stringify(result.error.format(), null, 2)}`,
          );
        }
        return result.data;
      },
    }),
  ],
})
export class AppConfigModule {}
