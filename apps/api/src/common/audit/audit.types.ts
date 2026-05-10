/**
 * Parameters for AuditService.write().
 *
 * `before` / `after` should be plain JSON-serialisable objects
 * containing ONLY the changed fields, not the full entity snapshot.
 * This keeps audit_logs rows small and diffs readable.
 *
 * Example:
 *   before: { status: 'ACTIVE' }
 *   after:  { status: 'PLACED' }
 */
export interface AuditWriteParams {
  /** Target organisation. Falls back to CLS context if omitted. */
  organizationId?: string | null;

  /** Actor user ID. Falls back to CLS context if omitted. */
  actorId?: string | null;

  /** Actor email — denormalised for readability. Falls back to CLS. */
  actorEmail?: string | null;

  /**
   * Event action string following the "resource.action" convention.
   * Must match an EventNames constant where possible.
   * e.g. "candidate.created", "submission.stage_changed"
   */
  action: string;

  /**
   * The Prisma model name (PascalCase) of the affected entity.
   * e.g. "Candidate", "JobDescription", "Submission"
   */
  resourceType: string;

  /** Primary key of the affected record. */
  resourceId: string;

  /** State of changed fields BEFORE the mutation. Null for creation events. */
  before?: Record<string, unknown> | null;

  /** State of changed fields AFTER the mutation. Null for deletion events. */
  after?: Record<string, unknown> | null;

  /** Additional structured context: requestId, jobId, featureFlag, etc. */
  metadata?: Record<string, unknown> | null;

  /** Client IP address from the HTTP request. */
  ipAddress?: string | null;

  /** Raw User-Agent header from the HTTP request. */
  userAgent?: string | null;
}
