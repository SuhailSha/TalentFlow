import { BaseEvent } from '../../../common/events/base.event';
import type { InterviewStatus } from '@repo/database';

interface InterviewEventActor {
  actorId: string;
  actorEmail: string;
  organizationId: string;
  correlationId?: string | null;
}

export class InterviewScheduledEvent extends BaseEvent {
  readonly interviewId: string;
  readonly submissionId: string;
  readonly candidateId: string;
  readonly round: number;

  constructor(
    actor: InterviewEventActor,
    payload: { interviewId: string; submissionId: string; candidateId: string; round: number },
  ) {
    super(actor);
    this.interviewId = payload.interviewId;
    this.submissionId = payload.submissionId;
    this.candidateId = payload.candidateId;
    this.round = payload.round;
  }
}

export class InterviewStatusChangedEvent extends BaseEvent {
  readonly interviewId: string;
  readonly submissionId: string;
  readonly candidateId: string;
  readonly fromStatus: InterviewStatus;
  readonly toStatus: InterviewStatus;
  readonly reason: string | null;

  constructor(
    actor: InterviewEventActor,
    payload: {
      interviewId: string;
      submissionId: string;
      candidateId: string;
      fromStatus: InterviewStatus;
      toStatus: InterviewStatus;
      reason: string | null;
    },
  ) {
    super(actor);
    this.interviewId = payload.interviewId;
    this.submissionId = payload.submissionId;
    this.candidateId = payload.candidateId;
    this.fromStatus = payload.fromStatus;
    this.toStatus = payload.toStatus;
    this.reason = payload.reason;
  }
}

export class InterviewUpdatedEvent extends BaseEvent {
  readonly interviewId: string;
  readonly changedFields: string[];

  constructor(
    actor: InterviewEventActor,
    payload: { interviewId: string; changedFields: string[] },
  ) {
    super(actor);
    this.interviewId = payload.interviewId;
    this.changedFields = payload.changedFields;
  }
}

export class InterviewFeedbackSubmittedEvent extends BaseEvent {
  readonly interviewId: string;
  readonly feedbackId: string;
  readonly recommendation: string | null;

  constructor(
    actor: InterviewEventActor,
    payload: { interviewId: string; feedbackId: string; recommendation: string | null },
  ) {
    super(actor);
    this.interviewId = payload.interviewId;
    this.feedbackId = payload.feedbackId;
    this.recommendation = payload.recommendation;
  }
}

export class InterviewNoteAddedEvent extends BaseEvent {
  readonly interviewId: string;
  readonly noteId: string;

  constructor(
    actor: InterviewEventActor,
    payload: { interviewId: string; noteId: string },
  ) {
    super(actor);
    this.interviewId = payload.interviewId;
    this.noteId = payload.noteId;
  }
}
