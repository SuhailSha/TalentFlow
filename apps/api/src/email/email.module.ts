import { type DynamicModule, Logger, Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';

import type { EnvConfig } from '../config';
import { DatabaseModule } from '../database';
import { EmailService } from './email.service';
import { EmailWorker } from './email.worker';
import { EMAIL_PROVIDER } from './email.tokens';
import { ConsoleEmailProvider } from './providers/console-provider';
import type { EmailProvider } from './providers/email-provider.interface';
import { PostmarkEmailProvider } from './providers/postmark-provider';
import { SendgridEmailProvider } from './providers/sendgrid-provider';
import { SmtpEmailProvider } from './providers/smtp-provider';
import { TemplateRenderer } from './templates/template.renderer';

const logger = new Logger('EmailModule');

const emailProviderFactory: Provider = {
  provide: EMAIL_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<EnvConfig, true>): EmailProvider => {
    const driver = config.get('EMAIL_DRIVER', { infer: true });
    logger.log(`EMAIL_DRIVER=${driver}`);

    switch (driver) {
      case 'smtp': {
        const host = config.get('SMTP_HOST', { infer: true });
        if (!host) {
          throw new Error('EMAIL_DRIVER=smtp but SMTP_HOST is not set');
        }
        return new SmtpEmailProvider({
          host,
          port:     config.get('SMTP_PORT', { infer: true }),
          secure:   config.get('SMTP_SECURE', { infer: true }),
          user:     config.get('SMTP_USER', { infer: true }),
          password: config.get('SMTP_PASSWORD', { infer: true }),
        });
      }
      case 'sendgrid': return new SendgridEmailProvider();
      case 'postmark': return new PostmarkEmailProvider();
      case 'console':
      default: {
        const baseStorage = config.get('STORAGE_LOCAL_PATH', { infer: true });
        const outputDir = path.join(baseStorage, 'emails');
        return new ConsoleEmailProvider(outputDir);
      }
    }
  },
};

/**
 * EmailModule wires the provider, template renderer, EmailService, and
 * (conditionally) the EmailWorker.
 *
 * The worker is only registered when REDIS_ENABLED=true. Without Redis,
 * `@Processor` would try to open a connection at module init and crash the
 * app boot. EmailService's synchronous fallback handles the no-queue case.
 */
@Module({})
export class EmailModule {
  static register(): DynamicModule {
    const redisEnabled = process.env['REDIS_ENABLED'] === 'true';
    return {
      module: EmailModule,
      // Global so feature modules can inject EmailService without importing
      // this dynamic module (which would re-instantiate the provider tree).
      global: true,
      imports: [ConfigModule, DatabaseModule],
      providers: [
        emailProviderFactory,
        TemplateRenderer,
        EmailService,
        ...(redisEnabled ? [EmailWorker] : []),
      ],
      exports: [EmailService],
    };
  }
}
