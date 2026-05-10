import { BaseEvent } from '../../../common/events/base.event';

/**
 * Shared actor context — passed into every candidate event constructor
 * from the service layer where RequestUser is available.
 */
interface CandidateEventActor {
  actorId: string;
  actorEmail: string;
  organizationId: string;
  correlationId?: string | null;
}

// ── candidate.created ─────────────────────────────────────────────────────────

export class CandidateCreatedEvent extends BaseEvent {
  readonly candidateId: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;

  constructor(
    actor: CandidateEventActor,
    payload: { candidateId: string; email: string; firstName: string; lastName: string },
  ) {
    super(actor);
    this.candidateId = payload.candidateId;
    this.email = payload.email;
    this.firstName = payload.firstName;
    this.lastName = payload.lastName;
  }
}

// ── candidate.updated ─────────────────────────────────────────────────────────

export class CandidateUpdatedEvent extends BaseEvent {
  readonly candidateId: string;
  /**
   * Keys that changed — not the full before/after snapshot.
   * The AuditService writes the full diff; this is just a lightweight hint
   * for other listeners (e.g. the matching engine) about what changed.
   */
  readonly changedFields: string[];

  constructor(
    actor: CandidateEventActor,
    payload: { candidateId: string; changedFields: string[] },
  ) {
    super(actor);
    this.candidateId = payload.candidateId;
    this.changedFields = payload.changedFields;
  }
}

// ── candidate.deleted ─────────────────────────────────────────────────────────

export class CandidateDeletedEvent extends BaseEvent {
  readonly candidateId: string;

  constructor(actor: CandidateEventActor, payload: { candidateId: string }) {
    super(actor);
    this.candidateId = payload.candidateId;
  }
}

// ── candidate.note_added ──────────────────────────────────────────────────────

export class CandidateNoteAddedEvent extends BaseEvent {
  readonly candidateId: string;
  readonly noteId: string;
  readonly noteType: string;

  constructor(
    actor: CandidateEventActor,
    payload: { candidateId: string; noteId: string; noteType: string },
  ) {
    super(actor);
    this.candidateId = payload.candidateId;
    this.noteId = payload.noteId;
    this.noteType = payload.noteType;
  }
}

// ── candidate.skill_added ─────────────────────────────────────────────────────

export class CandidateSkillAddedEvent extends BaseEvent {
  readonly candidateId: string;
  readonly skillId: string;
  readonly skillName: string;

  constructor(
    actor: CandidateEventActor,
    payload: { candidateId: string; skillId: string; skillName: string },
  ) {
    super(actor);
    this.candidateId = payload.candidateId;
    this.skillId = payload.skillId;
    this.skillName = payload.skillName;
  }
}

// ── candidate.status_changed ──────────────────────────────────────────────────

export class CandidateStatusChangedEvent extends BaseEvent {
  readonly candidateId: string;
  readonly fromStatus: string;
  readonly toStatus: string;

  constructor(
    actor: CandidateEventActor,
    payload: { candidateId: string; fromStatus: string; toStatus: string },
  ) {
    super(actor);
    this.candidateId = payload.candidateId;
    this.fromStatus = payload.fromStatus;
    this.toStatus = payload.toStatus;
  }
}

// ── candidate.skill_removed ───────────────────────────────────────────────────

export class CandidateSkillRemovedEvent extends BaseEvent {
  readonly candidateId: string;
  readonly skillId: string;

  constructor(
    actor: CandidateEventActor,
    payload: { candidateId: string; skillId: string },
  ) {
    super(actor);
    this.candidateId = payload.candidateId;
    this.skillId = payload.skillId;
  }
}
