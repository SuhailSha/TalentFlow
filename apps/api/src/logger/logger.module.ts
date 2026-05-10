import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import type { EnvConfig } from '../config';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => {
        const isDev = config.get('NODE_ENV') !== 'production';
        const level = config.get('LOG_LEVEL');

        return {
          pinoHttp: {
            level,
            // Skip logging for health endpoints to reduce noise
            autoLogging: {
              ignore: (req) => req.url?.startsWith('/health') ?? false,
            },
            ...(isDev
              ? {
                  transport: {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      singleLine: true,
                      translateTime: 'HH:MM:ss',
                      ignore: 'pid,hostname',
                    },
                  },
                }
              : {
                  // Production: structured JSON — fields parsed by log aggregators
                  formatters: {
                    level: (label: string) => ({ level: label }),
                  },
                  timestamp: () => `,"time":"${new Date().toISOString()}"`,
                }),
            // Redact sensitive fields from request logs
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.refreshToken',
              ],
              censor: '[REDACTED]',
            },
            // Assign a serializable request ID so all child log calls carry it
            genReqId: (req) => (req as { id?: string }).id ?? crypto.randomUUID(),
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
