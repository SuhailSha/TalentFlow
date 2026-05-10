/**
 * Base class for all domain events emitted via EventEmitter2.
 *
 * Design decisions:
 *   - Every event carries a `timestamp` so listeners can compute latency
 *     without a separate Date.now() call.
 *   - `correlationId` = requestId from CLS — threads log lines across
 *     async handlers back to the originating HTTP request.
 *   - `actorId` / `actorEmail` are captured at emit time (inside the service
 *     that performs the mutation) so the AuditService doesn't need to re-read
 *     the CLS store inside an async event handler (CLS context may not propagate
 *     through EventEmitter callbacks in all NestJS versions).
 *   - Events are plain serialisable objects — no methods, no Prisma types,
 *     so they can safely be serialised to BullMQ job data in the future.
 */
export abstract class BaseEvent {
  /** ISO timestamp captured at construction (emit time). */
  readonly timestamp: string;

  /**
   * Correlation ID — copied from the HTTP request's requestId (CLS store).
   * Null for system-generated events (scheduled jobs, background workers).
   */
  readonly correlationId: string | null;

  /** ID of the user who triggered this event. Null for system events. */
  readonly actorId: string | null;

  /** Email of the actor — denormalised so it survives user deletion. */
  readonly actorEmail: string | null;

  /** Organisation the event belongs to. Null for platform-level events. */
  readonly organizationId: string | null;

  constructor(params: {
    correlationId?: string | null;
    actorId?: string | null;
    actorEmail?: string | null;
    organizationId?: string | null;
  }) {
    this.timestamp = new Date().toISOString();
    this.correlationId = params.correlationId ?? null;
    this.actorId = params.actorId ?? null;
    this.actorEmail = params.actorEmail ?? null;
    this.organizationId = params.organizationId ?? null;
  }
}
