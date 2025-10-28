import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDevelopment = config.get('NODE_ENV') === 'development';

        return {
          pinoHttp: {
            transport: isDevelopment
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
            level: isDevelopment ? 'debug' : 'info',
            customProps: () => ({
              context: 'HTTP',
            }),
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                remoteAddress: req.remoteAddress,
                remotePort: req.remotePort,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
            },
            autoLogging: {
              ignore: (req) => req.url === '/health' || req.url === '/health/ready',
            },
            customLogLevel: (req, res, err) => {
              if (res.statusCode >= 400 && res.statusCode < 500) {
                return 'warn';
              } else if (res.statusCode >= 500 || err) {
                return 'error';
              }
              return 'info';
            },
            customSuccessMessage: (req, res) => {
              return `${req.method} ${req.url} ${res.statusCode}`;
            },
            customErrorMessage: (req, res, err) => {
              return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
            },
          },
        };
      },
    }),
  ],
})
export class AppLoggingModule {}
