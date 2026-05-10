import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';

import { AppContextService } from './app-context.service';

/**
 * Provides AsyncLocalStorage-based request context via nestjs-cls.
 *
 * @Global() — imported once in AppModule; available everywhere without
 * re-importing. Services inject AppContextService to read tenantId, userId,
 * and requestId without threading the Request object through function calls.
 *
 * The ClsModule.forRoot() call here only initialises the storage. Actual
 * values are set by JwtAuthGuard after token validation (userId, orgId) and
 * by the request-ID middleware (requestId).
 */
@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        // Mount automatically on every incoming HTTP request.
        mount: true,
        // Seed requestId from pino-http's req.id so it's available in CLS
        // before any guard or interceptor runs.
        setup: (cls, req) => {
          const id: unknown = (req as { id?: unknown }).id;
          cls.set('requestId', typeof id === 'string' || typeof id === 'number' ? String(id) : 'unknown');
        },
      },
    }),
  ],
  providers: [AppContextService],
  exports: [AppContextService],
})
export class AppContextModule {}
