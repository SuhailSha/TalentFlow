import { BaseEvent } from '../../../common/events/base.event';
import type { SubmissionStatus } from '@repo/database';

interface SubmissionEventActor {
  actorId: string;
  actorEmail: string;
  organizationId: string;
  correlationId?: string | null;
}

// ── submission.created ────────────────────────────────────────────────────────

export class SubmissionCreatedEvent extends BaseEvent {
  readonly submissionId: string;
  readonly candidateId: string;
  readonly jobId: string;
  readonly vendorId: string | null;

  constructor(
    actor: SubmissionEventActor,
    payload: { submissionId: string; candidateId: string; jobId: string; vendorId: string | null },
  ) {
    super(actor);
    this.submissionId = payload.submissionId;
    this.candidateId = payload.candidateId;
    this.jobId = payload.jobId;
    this.vendorId = payload.vendorId;
  }
}

// ── submission.updated ────────────────────────────────────────────────────────

export class SubmissionUpdatedEvent extends BaseEvent {
  readonly submissionId: string;
  readonly changedFields: string[];

  constructor(
    actor: SubmissionEventActor,
    payload: { submissionId: string; changedFields: string[] },
  ) {
    super(actor);
    this.submissionId = payload.submissionId;
    this.changedFields = payload.changedFields;
  }
}

// ── submission.status_changed ─────────────────────────────────────────────────

export class SubmissionStatusChangedEvent extends BaseEvent {
  readonly submissionId: string;
  readonly candidateId: string;
  readonly jobId: string;
  readonly fromStatus: SubmissionStatus;
  readonly toStatus: SubmissionStatus;
  readonly reason: string | null;

  constructor(
    actor: SubmissionEventActor,
    payload: {
      submissionId: string;
      candidateId: string;
      jobId: string;
      fromStatus: SubmissionStatus;
      toStatus: SubmissionStatus;
      reason: string | null;
    },
  ) {
    super(actor);
    this.submissionId = payload.submissionId;
    this.candidateId = payload.candidateId;
    this.jobId = payload.jobId;
    this.fromStatus = payload.fromStatus;
    this.toStatus = payload.toStatus;
    this.reason = payload.reason;
  }
}

// ── submission.note_added ─────────────────────────────────────────────────────

export class SubmissionNoteAddedEvent extends BaseEvent {
  readonly submissionId: string;
  readonly noteId: string;
  readonly noteType: string;

  constructor(
    actor: SubmissionEventActor,
    payload: { submissionId: string; noteId: string; noteType: string },
  ) {
    super(actor);
    this.submissionId = payload.submissionId;
    this.noteId = payload.noteId;
    this.noteType = payload.noteType;
  }
}

// ── submission.deleted ────────────────────────────────────────────────────────

export class SubmissionDeletedEvent extends BaseEvent {
  readonly submissionId: string;

  constructor(actor: SubmissionEventActor, payload: { submissionId: string }) {
    super(actor);
    this.submissionId = payload.submissionId;
  }
}
