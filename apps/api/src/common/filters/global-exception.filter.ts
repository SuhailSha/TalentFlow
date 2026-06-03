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

    // ─── PII / stack redaction in production (audit finding S-7) ────────
    // In production we never log the raw exception object. Stack traces and
    // any properties the exception carries (which can include candidate
    // emails, salary, resume text, etc.) are dropped. Engineers reproducing
    // an incident correlate via requestId in OpenTelemetry, where traces
    // are scrubbed by the OTel pipeline.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      if (process.env['NODE_ENV'] === 'production') {
        this.logger.error(
          { requestId: body.requestId, code, status },
          'Internal server error',
        );
      } else {
        this.logger.error({ err: exception, requestId: body.requestId }, message);
      }
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
      405: 'METHOD_NOT_ALLOWED',
      408: 'REQUEST_TIMEOUT',
      409: 'CONFLICT',
      410: 'GONE',
      413: 'PAYLOAD_TOO_LARGE',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };
    return map[status] ?? `HTTP_${status}`;
  }
}
