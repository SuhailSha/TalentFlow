import { Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/database';

/**
 * OutboxService — write-side of the transactional outbox (ADR-003 Layer 1).
 *
 * Callers use `emit(tx, event)` from inside a Prisma `$transaction(...)`
 * callback. The event row commits or rolls back with the business write,
 * guaranteeing the outbox table is always consistent with the rest of the
 * database.
 *
 * Reading and publishing are the worker's job (OutboxRelayWorker).
 *
 * Idempotency contract for emitters:
 *   - Every outbox row gets a generated UUID (`id`). Consumers use this id
 *     as the dedup key — they record processed event ids in a per-consumer
 *     `processed_events` table or in-memory LRU.
 *   - Emitters with their own dedup needs (e.g., "don't emit
 *     candidate.created twice for the same row") must enforce this via
 *     application logic before calling `emit`.
 *
 * @see docs/architecture/adr/adr-003-event-architecture.md
 */

export interface OutboxEventInput {
  organizationId: string;
  aggregateType:  string;       // e.g., 'Candidate', 'Submission'
  aggregateId:    string;       // entity uuid
  eventType:      string;       // dot-separated: 'candidate.status.changed'
  payload:        Record<string, unknown>;
  correlationId?: string;       // request id from AsyncLocalStorage, propagated
}

@Injectable()
export class OutboxService {

  /**
   * Emit an event into the outbox **within the caller's transaction**.
   *
   * The caller must pass the Prisma transaction client (`tx`) so the
   * insert lives in the same transaction as the business write. If the
   * business transaction rolls back, this insert rolls back too — the
   * transactional outbox guarantee.
   *
   * @example
   *   await this.prisma.$transaction(async (tx) => {
   *     const candidate = await tx.candidate.update({ where: { id }, data });
   *     await this.outbox.emit(tx, {
   *       organizationId: candidate.organizationId,
   *       aggregateType:  'Candidate',
   *       aggregateId:    candidate.id,
   *       eventType:      'candidate.status.changed',
   *       payload:        { from: prevStatus, to: candidate.status },
   *     });
   *     return candidate;
   *   });
   */
  async emit(
    tx: Prisma.TransactionClient,
    event: OutboxEventInput,
  ): Promise<string> {
    const row = await tx.outboxEvent.create({
      data: {
        organizationId: event.organizationId,
        aggregateType:  event.aggregateType,
        aggregateId:    event.aggregateId,
        eventType:      event.eventType,
        payload:        event.payload as Prisma.InputJsonValue,
        correlationId:  event.correlationId ?? null,
      },
      select: { id: true },
    });
    return row.id;
  }

  /**
   * Emit multiple events atomically. Same transactional guarantee.
   * Uses createMany under the hood; ids are NOT returned (createMany
   * limitation) — call `emit` in a loop if ids are needed.
   */
  async emitMany(
    tx: Prisma.TransactionClient,
    events: OutboxEventInput[],
  ): Promise<number> {
    if (events.length === 0) return 0;
    const result = await tx.outboxEvent.createMany({
      data: events.map((e) => ({
        organizationId: e.organizationId,
        aggregateType:  e.aggregateType,
        aggregateId:    e.aggregateId,
        eventType:      e.eventType,
        payload:        e.payload as Prisma.InputJsonValue,
        correlationId:  e.correlationId ?? null,
      })),
    });
    return result.count;
  }
}
