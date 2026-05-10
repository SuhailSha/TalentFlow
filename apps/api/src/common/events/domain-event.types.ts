/** Identifies the aggregate type that owns the event. */
export type AggregateType = 'Candidate' | 'Job' | 'Submission' | 'User' | 'Organization';

/** Common metadata carried by every domain event. */
export interface DomainEventMeta {
  aggregateId:    string;
  aggregateType:  AggregateType;
  correlationId:  string | null;
  actorId:        string | null;
  actorEmail:     string | null;
  organizationId: string | null;
  timestamp:      string;
}

/** Payload shape for any FSM transition event. */
export interface WorkflowTransitionPayload<TStatus extends string = string> {
  fromStatus: TStatus;
  toStatus:   TStatus;
}

// ── Activity feed ─────────────────────────────────────────────────────────────

export type ActivityVerb =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'note_added'
  | 'skill_added'
  | 'skill_removed'
  | 'deleted';

export interface ActivityEntry {
  id:             string;
  verb:           ActivityVerb;
  actorId:        string | null;
  actorEmail:     string | null;
  occurredAt:     string;
  metadata:       Record<string, unknown> | null;
}
