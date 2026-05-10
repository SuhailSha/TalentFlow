import { Module } from '@nestjs/common';

import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

/**
 * AuditModule — provides audit logging infrastructure.
 *
 * Not @Global() by design: imported explicitly in AppModule so the
 * APP_INTERCEPTOR provider there can reference AuditInterceptor without
 * circular-dependency risks.
 *
 * Dependencies:
 *   - DatabaseModule  (PrismaService — injected via AppModule's global scope)
 *   - AppContextModule (AppContextService — global)
 *   - EventEmitterModule (must be imported before AuditModule in AppModule)
 */
@Module({
  providers: [AuditService, AuditInterceptor],
  exports:   [AuditService, AuditInterceptor],
})
export class AuditModule {}
