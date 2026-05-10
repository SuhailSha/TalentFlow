import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

import type { ErrorResponse } from '../types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Inject(Logger) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { status, code, message, details } = this.resolveException(exception);

    const body: ErrorResponse = {
      success: false,
      error: { code, message, details },
      requestId: request.requestId ?? request.id ?? 'unknown',
      timestamp: new Date().toISOString(),
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({ err: exception, requestId: body.requestId }, message);
    } else {
      this.logger.warn({ requestId: body.requestId, code }, message);
    }

    response.status(status).json(body);
  }

  private resolveException(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        return { status, code: this.statusToCode(status), message: res };
      }

      if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        return {
          status,
          code: (obj['code'] as string | undefined) ?? this.statusToCode(status),
          message: (obj['message'] as string | undefined) ?? exception.message,
          details: obj['details'] ?? (Array.isArray(obj['message']) ? obj['message'] : undefined),
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    };
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] ?? `HTTP_${status}`;
  }
}
