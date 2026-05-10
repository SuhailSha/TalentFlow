import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { AppContextService } from '../context/app-context.service';
import { AuditService } from './audit.service';

/**
 * AuditInterceptor — HTTP-layer audit record writer.
 *
 * Responsibility: capture request metadata (method, path, status, IP, UA)
 * and write audit records for mutating HTTP operations (POST/PATCH/PUT/DELETE).
 *
 * Separation of concerns:
 *   - This interceptor writes "HTTP action" audit records (who called what endpoint).
 *   - AuditService.@OnEvent writes "domain event" audit records (what actually changed).
 *   Both records exist: the HTTP record is fast/reliable, the domain-event record
 *   carries the before/after diff for compliance review.
 *
 * Why NOT write audit in the interceptor for every mutation:
 *   The interceptor doesn't have access to before/after entity snapshots.
 *   That detail lives in the service layer. So the interceptor writes a coarse
 *   "request was made" record; services emit fine-grained domain events.
 *
 * Mutation detection:
 *   Only POST/PATCH/PUT/DELETE methods trigger an audit write.
 *   GET requests are not audited at the HTTP level (too noisy; use query
 *   logs in PostgreSQL if read auditing is needed for compliance).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private static readonly MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

  constructor(
    private readonly auditService: AuditService,
    private readonly ctx: AppContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req  = http.getRequest<Request & { requestId?: string }>();
    const res  = http.getResponse<Response>();

    if (!AuditInterceptor.MUTATION_METHODS.has(req.method)) {
      return next.handle();
    }

    const startMs   = Date.now();
    const ipAddress = this.extractIp(req);
    const userAgent = req.headers['user-agent'] ?? null;
    const requestId = req.requestId ?? this.ctx.requestId;

    // Extract resource info from the URL path.
    // e.g. PATCH /api/v1/candidates/abc-123 → resource=candidates, resourceId=abc-123
    const { resourceType, resourceId } = this.extractResource(req.path);

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = res.statusCode;
          // Fire-and-forget — never await audit writes in the response path.
          void this.auditService.write({
            action:       `http.${req.method.toLowerCase()}`,
            resourceType: resourceType,
            resourceId:   resourceId,
            metadata: {
              requestId,
              method:     req.method,
              path:       req.path,
              statusCode,
              durationMs: Date.now() - startMs,
            },
            ipAddress,
            userAgent,
          });
        },
        error: (err: unknown) => {
          const statusCode = (err as { status?: number })?.status ?? 500;
          void this.auditService.write({
            action:       `http.${req.method.toLowerCase()}.error`,
            resourceType: resourceType,
            resourceId:   resourceId,
            metadata: {
              requestId,
              method:      req.method,
              path:        req.path,
              statusCode,
              errorCode:   (err as { code?: string })?.code,
              durationMs:  Date.now() - startMs,
            },
            ipAddress,
            userAgent,
          });
        },
      }),
    );
  }

  private extractIp(req: Request): string | null {
    // Trust X-Forwarded-For when behind a reverse proxy (nginx/ALB).
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return (forwarded.split(',')[0] ?? forwarded).trim();
    return req.socket?.remoteAddress ?? null;
  }

  /**
   * Parse REST path into resource type and ID.
   * /api/v1/candidates/uuid-here  → { resourceType: 'candidates', resourceId: 'uuid-here' }
   * /api/v1/candidates             → { resourceType: 'candidates', resourceId: 'list'      }
   * /api/v1/candidates/id/skills   → { resourceType: 'candidate_skills', resourceId: 'id'  }
   */
  private extractResource(path: string): { resourceType: string; resourceId: string } {
    // Strip /api/v1 prefix
    const stripped = path.replace(/^\/api\/v\d+\//, '');
    const parts    = stripped.split('/').filter(Boolean);

    if (parts.length === 0) return { resourceType: 'unknown', resourceId: 'unknown' };
    if (parts.length === 1) return { resourceType: parts[0] ?? 'unknown', resourceId: 'list' };

    // /candidates/:id → resource=candidates, id=parts[1]
    // /candidates/:id/notes → resource=candidate_notes, id=parts[1]
    if (parts.length >= 3) {
      return {
        resourceType: `${(parts[0] ?? '').replace(/s$/, '')}_${parts[2] ?? ''}`,
        resourceId: parts[1] ?? 'unknown',
      };
    }

    return { resourceType: parts[0] ?? 'unknown', resourceId: parts[1] ?? 'unknown' };
  }
}
