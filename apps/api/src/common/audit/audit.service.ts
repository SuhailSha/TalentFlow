import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Prisma } from '@repo/database';

import { PrismaService } from '../../database';
import { AppContextService } from '../context/app-context.service';
import { BaseEvent } from '../events/base.event';
import type { AuditWriteParams } from './audit.types';

/**
 * AuditService — the single writer for the `audit_logs` table.
 *
 * Architecture:
 *   The service exposes two entry points:
 *
 *   1. `write(params)` — called directly by services that need fine-grained
 *      control over before/after snapshots (candidate mutations, auth events).
 *
 *   2. `@OnEvent('**')` wildcard listener — catches ALL domain events emitted
 *      via EventEmitter2 and writes a lightweight audit record automatically.
 *      This is the fallback; explicit `write()` calls take precedence by
 *      being more specific (they include before/after diffs).
 *
 * Resilience:
 *   Audit writes must NEVER crash the request. All DB errors are caught and
 *   logged. A failed audit write is a bug to investigate, not a 500 to surface.
 *
 * Immutability:
 *   The `audit_logs` table has no `updatedAt`, no soft-delete, no UPDATE path.
 *   Once written, a record is permanent. Retention/purge is a scheduled job.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: AppContextService,
  ) {}

  /**
   * Write an explicit audit record with full before/after diff control.
   * Call this from service methods that mutate entities.
   */
  async write(params: AuditWriteParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId:  params.organizationId ?? this.safeOrgId(),
          actorId:         params.actorId        ?? this.safeUserId(),
          actorEmail:      params.actorEmail      ?? this.safeUserEmail(),
          action:          params.action,
          resourceType:    params.resourceType,
          resourceId:      params.resourceId,
          before:          (params.before   ?? undefined) as Prisma.InputJsonValue | undefined,
          after:           (params.after    ?? undefined) as Prisma.InputJsonValue | undefined,
          metadata:        (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          ipAddress:       params.ipAddress,
          userAgent:       params.userAgent,
        },
      });
    } catch (err: unknown) {
      this.logger.error(
        { err, action: params.action, resourceId: params.resourceId },
        'Audit write failed — audit record lost',
      );
    }
  }

  /**
   * Wildcard listener: write a lightweight record for every domain event
   * that doesn't have an explicit service-level `write()` call.
   *
   * The event's `correlationId` connects this audit record back to the
   * request log line in pino. Event properties are stored in `metadata`.
   */
  @OnEvent('**', { async: true })
  async onAnyEvent(payload: unknown): Promise<void> {
    if (!(payload instanceof BaseEvent)) return;

    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: payload.organizationId ?? undefined,
          actorId:        payload.actorId        ?? undefined,
          actorEmail:     payload.actorEmail      ?? undefined,
          // Derive action + resource from the class name: CandidateCreatedEvent → candidate.created
          action:         this.classNameToAction(payload.constructor.name),
          resourceType:   this.classNameToResource(payload.constructor.name),
          resourceId:     this.extractResourceId(payload),
          metadata: {
            correlationId: payload.correlationId,
            ...this.extractMetadata(payload),
          },
        },
      });
    } catch (err: unknown) {
      this.logger.error({ err, eventClass: payload.constructor.name }, 'Event audit write failed');
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private safeOrgId(): string | undefined {
    try { return this.ctx.organizationId; } catch { return undefined; }
  }

  private safeUserId(): string | undefined {
    try { return this.ctx.userId; } catch { return undefined; }
  }

  private safeUserEmail(): string | undefined {
    try { return this.ctx.user?.email; } catch { return undefined; }
  }

  /**
   * CandidateCreatedEvent → "candidate.created"
   * ResumeParseRequestedEvent → "resume.parse_requested"
   */
  private classNameToAction(className: string): string {
    return className
      .replace(/Event$/, '')
      .replace(/([A-Z])/g, (_, l: string, i: number) => (i === 0 ? l : `_${l}`))
      .toLowerCase()
      .replace(/_([a-z])/, '.$1');
  }

  /**
   * CandidateCreatedEvent → "Candidate"
   */
  private classNameToResource(className: string): string {
    const match = /^([A-Z][a-z]+)/.exec(className);
    return match?.[1] ?? className;
  }

  /** Pull the primary resource ID from known event shapes. */
  private extractResourceId(event: BaseEvent): string {
    const e = event as unknown as Record<string, unknown>;
    return String(
      e['candidateId'] ?? e['jobId'] ?? e['submissionId'] ??
      e['resumeId']    ?? e['userId'] ?? 'unknown',
    );
  }

  /** Collect all non-base-class properties as metadata. */
  private extractMetadata(event: BaseEvent): Record<string, unknown> {
    const base = new Set(['timestamp', 'correlationId', 'actorId', 'actorEmail', 'organizationId']);
    return Object.fromEntries(
      Object.entries(event as unknown as Record<string, unknown>).filter(([k]) => !base.has(k)),
    );
  }
}
