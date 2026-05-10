import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InterviewStatus, NoteType } from '@repo/database';

import { EventNames } from '../../common/events/event-names.constant';
import { AppContextService } from '../../common/context/app-context.service';
import { FsmService, INTERVIEW_FSM } from '../../common/workflow';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ChangeInterviewStatusDto } from './dto/change-status.dto';
import { CreateInterviewDto, CreateInterviewNoteDto } from './dto/create-interview.dto';
import { ListInterviewsDto } from './dto/list-interviews.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
import { CreateFeedbackDto, UpdateFeedbackDto } from './dto/create-feedback.dto';
import {
  InterviewFeedbackSubmittedEvent,
  InterviewNoteAddedEvent,
  InterviewScheduledEvent,
  InterviewStatusChangedEvent,
  InterviewUpdatedEvent,
} from './events/interview.events';
import { InterviewsRepository } from './interviews.repository';
import { toInterviewDetail, toInterviewListItem } from './types/interview.types';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly repo: InterviewsRepository,
    private readonly fsm: FsmService,
    private readonly events: EventEmitter2,
    private readonly ctx: AppContextService,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async list(user: RequestUser, dto: ListInterviewsDto) {
    const { data, total } = await this.repo.findMany(user.organizationId, dto);
    const totalPages = Math.ceil(total / dto.limit);
    return {
      data: data.map(toInterviewListItem),
      meta: { total, page: dto.page, limit: dto.limit, totalPages },
    };
  }

  // ── Get by ID ─────────────────────────────────────────────────────────────

  async findOne(user: RequestUser, id: string) {
    const interview = await this.repo.findById(id, user.organizationId);
    if (!interview) throw new NotFoundException('Interview not found');
    return toInterviewDetail(interview);
  }

  // ── By submission ─────────────────────────────────────────────────────────

  async findBySubmission(user: RequestUser, submissionId: string) {
    const interviews = await this.repo.findBySubmission(submissionId, user.organizationId);
    return interviews.map(toInterviewListItem);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async stats(user: RequestUser) {
    return this.repo.stats(user.organizationId);
  }

  // ── Schedule (create) ─────────────────────────────────────────────────────

  async schedule(user: RequestUser, dto: CreateInterviewDto) {
    const subIds = await this.repo.findSubmissionIds(dto.submissionId, user.organizationId);
    if (!subIds) throw new NotFoundException('Submission not found');

    const interview = await this.repo.create({
      organizationId:  user.organizationId,
      submissionId:    dto.submissionId,
      candidateId:     subIds.candidateId,
      jobId:           subIds.jobId,
      round:           dto.round,
      roundLabel:      dto.roundLabel ?? null,
      type:            dto.type,
      status:          InterviewStatus.SCHEDULED,
      ownerId:         dto.ownerId ?? user.userId,
      createdById:     user.userId,
      interviewerId:   dto.interviewerId ?? null,
      interviewerName:  dto.interviewerName ?? null,
      interviewerEmail: dto.interviewerEmail ?? null,
      scheduledAt:     dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      durationMinutes: dto.durationMinutes ?? null,
      timezone:        dto.timezone ?? null,
      location:        dto.location ?? null,
      briefingNotes:   dto.briefingNotes ?? null,
    });

    await this.repo.addStatusHistory({
      interviewId: interview.id,
      fromStatus:  null,
      toStatus:    InterviewStatus.SCHEDULED,
      changedById: user.userId,
      reason:      'Interview scheduled',
    });

    this.events.emit(
      EventNames.INTERVIEW_SCHEDULED,
      new InterviewScheduledEvent(this.actor(user), {
        interviewId:  interview.id,
        submissionId: dto.submissionId,
        candidateId:  interview.candidateId,
        round:        dto.round,
      }),
    );

    return toInterviewDetail(interview);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(user: RequestUser, id: string, dto: UpdateInterviewDto) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Interview not found');

    const changedFields = Object.keys(dto).filter(
      (k) => (dto as Record<string, unknown>)[k] !== undefined,
    );

    const updated = await this.repo.update(id, {
      ...(dto.type             !== undefined && { type:             dto.type }),
      ...(dto.roundLabel       !== undefined && { roundLabel:       dto.roundLabel }),
      ...(dto.ownerId          !== undefined && { ownerId:          dto.ownerId }),
      ...(dto.interviewerId    !== undefined && { interviewerId:    dto.interviewerId }),
      ...(dto.interviewerName  !== undefined && { interviewerName:  dto.interviewerName }),
      ...(dto.interviewerEmail !== undefined && { interviewerEmail: dto.interviewerEmail }),
      ...(dto.scheduledAt      !== undefined && { scheduledAt:      dto.scheduledAt ? new Date(dto.scheduledAt) : null }),
      ...(dto.durationMinutes  !== undefined && { durationMinutes:  dto.durationMinutes }),
      ...(dto.timezone         !== undefined && { timezone:         dto.timezone }),
      ...(dto.location         !== undefined && { location:         dto.location }),
      ...(dto.briefingNotes    !== undefined && { briefingNotes:    dto.briefingNotes }),
    });

    this.events.emit(
      EventNames.INTERVIEW_UPDATED,
      new InterviewUpdatedEvent(this.actor(user), {
        interviewId:   id,
        changedFields,
      }),
    );

    return toInterviewDetail(updated);
  }

  // ── Change status ─────────────────────────────────────────────────────────

  async changeStatus(user: RequestUser, id: string, dto: ChangeInterviewStatusDto) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Interview not found');

    this.fsm.validate(INTERVIEW_FSM, existing.status, dto.status);

    const stageField = this.stageTimestampField(dto.status);
    const updated = await this.repo.update(id, {
      status: dto.status,
      ...(stageField && { [stageField]: new Date() }),
      ...(dto.status === InterviewStatus.CANCELLED && dto.reason && {
        cancellationReason: dto.reason,
      }),
    });

    await this.repo.addStatusHistory({
      interviewId: id,
      fromStatus:  existing.status,
      toStatus:    dto.status,
      changedById: user.userId,
      reason:      dto.reason ?? null,
    });

    await this.addSystemNote(
      id,
      user.organizationId,
      user.userId,
      user.email,
      `Status changed from ${existing.status} to ${dto.status}${dto.reason ? `: ${dto.reason}` : ''}`,
    );

    this.events.emit(
      EventNames.INTERVIEW_STATUS_CHANGED,
      new InterviewStatusChangedEvent(this.actor(user), {
        interviewId:  id,
        submissionId: existing.submissionId,
        candidateId:  existing.candidateId,
        fromStatus:   existing.status,
        toStatus:     dto.status,
        reason:       dto.reason ?? null,
      }),
    );

    // Emit specific terminal events for downstream workflows
    if (dto.status === InterviewStatus.PASSED) {
      this.events.emit(EventNames.INTERVIEW_PASSED, { interviewId: id });
    } else if (dto.status === InterviewStatus.FAILED) {
      this.events.emit(EventNames.INTERVIEW_FAILED, { interviewId: id });
    } else if (dto.status === InterviewStatus.NO_SHOW) {
      this.events.emit(EventNames.INTERVIEW_NO_SHOW, { interviewId: id });
    } else if (dto.status === InterviewStatus.CANCELLED) {
      this.events.emit(EventNames.INTERVIEW_CANCELLED, { interviewId: id });
    }

    return toInterviewDetail(updated);
  }

  // ── Add note ──────────────────────────────────────────────────────────────

  async addNote(user: RequestUser, id: string, dto: CreateInterviewNoteDto) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Interview not found');

    const note = await this.repo.addNote({
      interviewId:    id,
      organizationId: user.organizationId,
      content:        dto.content,
      noteType:       dto.noteType ?? NoteType.NOTE,
      isSystem:       false,
      authorId:       user.userId,
      authorEmail:    user.email,
      authorName:     user.email,
    });

    this.events.emit(
      EventNames.INTERVIEW_NOTE_ADDED,
      new InterviewNoteAddedEvent(this.actor(user), {
        interviewId: id,
        noteId:      note.id,
      }),
    );

    return {
      id:          note.id,
      content:     note.content,
      noteType:    note.noteType,
      isSystem:    note.isSystem,
      authorId:    note.authorId,
      authorEmail: note.authorEmail,
      authorName:  note.authorName,
      createdAt:   note.createdAt,
    };
  }

  // ── Feedback ──────────────────────────────────────────────────────────────

  async addFeedback(user: RequestUser, id: string, dto: CreateFeedbackDto) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Interview not found');

    const feedback = await this.repo.createFeedback({
      interviewId:       id,
      organizationId:    user.organizationId,
      submittedById:     user.userId,
      submitterName:     user.email,
      submitterEmail:    user.email,
      recommendation:    dto.recommendation ?? null,
      technicalScore:    dto.technicalScore ?? null,
      communicationScore: dto.communicationScore ?? null,
      cultureFitScore:   dto.cultureFitScore ?? null,
      overallScore:      dto.overallScore ?? null,
      strengths:         dto.strengths ?? null,
      concerns:          dto.concerns ?? null,
      notes:             dto.notes ?? null,
      isSubmitted:       false,
    });

    return feedback;
  }

  async updateFeedback(user: RequestUser, id: string, feedbackId: string, dto: UpdateFeedbackDto) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Interview not found');

    const feedback = await this.repo.findFeedbackById(feedbackId, id);
    if (!feedback) throw new NotFoundException('Feedback not found');

    if (feedback.isSubmitted) {
      throw new ConflictException('Cannot edit submitted feedback');
    }

    return this.repo.updateFeedback(feedbackId, {
      recommendation:    dto.recommendation ?? undefined,
      technicalScore:    dto.technicalScore ?? undefined,
      communicationScore: dto.communicationScore ?? undefined,
      cultureFitScore:   dto.cultureFitScore ?? undefined,
      overallScore:      dto.overallScore ?? undefined,
      strengths:         dto.strengths ?? undefined,
      concerns:          dto.concerns ?? undefined,
      notes:             dto.notes ?? undefined,
    });
  }

  async submitFeedback(user: RequestUser, id: string, feedbackId: string) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Interview not found');

    const feedback = await this.repo.findFeedbackById(feedbackId, id);
    if (!feedback) throw new NotFoundException('Feedback not found');

    if (feedback.isSubmitted) {
      throw new ConflictException('Feedback already submitted');
    }

    const submitted = await this.repo.updateFeedback(feedbackId, {
      isSubmitted: true,
      submittedAt: new Date(),
    });

    this.events.emit(
      EventNames.INTERVIEW_FEEDBACK_SUBMITTED,
      new InterviewFeedbackSubmittedEvent(this.actor(user), {
        interviewId:    id,
        feedbackId,
        recommendation: feedback.recommendation,
      }),
    );

    return submitted;
  }

  // ── Participants ──────────────────────────────────────────────────────────

  async addParticipant(user: RequestUser, id: string, dto: AddParticipantDto) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Interview not found');

    const participant = await this.repo.addParticipant({
      interviewId:  id,
      userId:       dto.userId ?? null,
      name:         dto.name,
      email:        dto.email,
      role:         dto.role,
    });

    return participant;
  }

  async removeParticipant(user: RequestUser, id: string, participantId: string) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Interview not found');

    await this.repo.removeParticipant(participantId);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async remove(user: RequestUser, id: string) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Interview not found');

    await this.repo.softDelete(id);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private actor(user: RequestUser) {
    return {
      actorId:        user.userId,
      actorEmail:     user.email,
      organizationId: user.organizationId,
      correlationId:  this.ctx.requestId,
    };
  }

  private stageTimestampField(status: InterviewStatus): string | null {
    const map: Partial<Record<InterviewStatus, string>> = {
      [InterviewStatus.CONFIRMED]:       'confirmedAt',
      [InterviewStatus.IN_PROGRESS]:     'startedAt',
      [InterviewStatus.COMPLETED]:       'completedAt',
      [InterviewStatus.FEEDBACK_PENDING]: 'completedAt',
      [InterviewStatus.PASSED]:          'passedAt',
      [InterviewStatus.FAILED]:          'failedAt',
      [InterviewStatus.CANCELLED]:       'cancelledAt',
      [InterviewStatus.NO_SHOW]:         'noShowAt',
      [InterviewStatus.RESCHEDULED]:     'rescheduledAt',
    };
    return map[status] ?? null;
  }

  private async addSystemNote(
    interviewId: string,
    organizationId: string,
    authorId: string,
    authorEmail: string,
    content: string,
  ) {
    await this.repo.addNote({
      interviewId,
      organizationId,
      content,
      noteType: NoteType.STATUS_CHANGE,
      isSystem: true,
      authorId,
      authorEmail,
      authorName: authorEmail,
    });
  }

}
