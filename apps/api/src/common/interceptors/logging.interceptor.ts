import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { PinoLogger } from 'nestjs-pino';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, requestId } = request;
    const startMs = Date.now();

    this.logger.assign({ requestId });

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - startMs;
          this.logger.debug({ method, url, ms }, 'Request completed');
        },
        error: () => {
          const ms = Date.now() - startMs;
          this.logger.debug({ method, url, ms }, 'Request failed');
        },
      }),
    );
  }
}
