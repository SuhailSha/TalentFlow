import { BaseEvent } from '../../../common/events/base.event';

interface JobEventActor {
  actorId: string;
  actorEmail: string;
  organizationId: string;
  correlationId?: string | null;
}

// ── job.created ───────────────────────────────────────────────────────────────

export class JobCreatedEvent extends BaseEvent {
  readonly jobId: string;
  readonly reqId: string;
  readonly title: string;

  constructor(
    actor: JobEventActor,
    payload: { jobId: string; reqId: string; title: string },
  ) {
    super(actor);
    this.jobId = payload.jobId;
    this.reqId = payload.reqId;
    this.title = payload.title;
  }
}

// ── job.updated ───────────────────────────────────────────────────────────────

export class JobUpdatedEvent extends BaseEvent {
  readonly jobId: string;
  readonly changedFields: string[];

  constructor(
    actor: JobEventActor,
    payload: { jobId: string; changedFields: string[] },
  ) {
    super(actor);
    this.jobId = payload.jobId;
    this.changedFields = payload.changedFields;
  }
}

// ── job.status_changed ────────────────────────────────────────────────────────

export class JobStatusChangedEvent extends BaseEvent {
  readonly jobId: string;
  readonly fromStatus: string;
  readonly toStatus: string;

  constructor(
    actor: JobEventActor,
    payload: { jobId: string; fromStatus: string; toStatus: string },
  ) {
    super(actor);
    this.jobId = payload.jobId;
    this.fromStatus = payload.fromStatus;
    this.toStatus = payload.toStatus;
  }
}

// ── job.deleted ───────────────────────────────────────────────────────────────

export class JobDeletedEvent extends BaseEvent {
  readonly jobId: string;

  constructor(actor: JobEventActor, payload: { jobId: string }) {
    super(actor);
    this.jobId = payload.jobId;
  }
}

// ── job.note_added ────────────────────────────────────────────────────────────

export class JobNoteAddedEvent extends BaseEvent {
  readonly jobId: string;
  readonly noteId: string;
  readonly noteType: string;

  constructor(
    actor: JobEventActor,
    payload: { jobId: string; noteId: string; noteType: string },
  ) {
    super(actor);
    this.jobId = payload.jobId;
    this.noteId = payload.noteId;
    this.noteType = payload.noteType;
  }
}

// ── job.skill_added ───────────────────────────────────────────────────────────

export class JobSkillAddedEvent extends BaseEvent {
  readonly jobId: string;
  readonly skillId: string;
  readonly skillName: string;
  readonly isRequired: boolean;

  constructor(
    actor: JobEventActor,
    payload: { jobId: string; skillId: string; skillName: string; isRequired: boolean },
  ) {
    super(actor);
    this.jobId = payload.jobId;
    this.skillId = payload.skillId;
    this.skillName = payload.skillName;
    this.isRequired = payload.isRequired;
  }
}

// ── job.skill_removed ─────────────────────────────────────────────────────────

export class JobSkillRemovedEvent extends BaseEvent {
  readonly jobId: string;
  readonly skillId: string;

  constructor(actor: JobEventActor, payload: { jobId: string; skillId: string }) {
    super(actor);
    this.jobId = payload.jobId;
    this.skillId = payload.skillId;
  }
}
