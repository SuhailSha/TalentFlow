import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NoteType, SubmissionStatus } from '@repo/database';

import { EventNames } from '../../common/events/event-names.constant';
import { AppContextService } from '../../common/context/app-context.service';
import { FsmService, SUBMISSION_FSM } from '../../common/workflow';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateSubmissionDto, CreateSubmissionNoteDto } from './dto/create-submission.dto';
import { ListSubmissionsDto } from './dto/list-submissions.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import {
  SubmissionCreatedEvent,
  SubmissionDeletedEvent,
  SubmissionNoteAddedEvent,
  SubmissionStatusChangedEvent,
  SubmissionUpdatedEvent,
} from './events/submission.events';
import { SubmissionsRepository } from './submissions.repository';
import {
  toSubmissionDetail,
  toSubmissionListItem,
} from './types/submission.types';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly repo: SubmissionsRepository,
    private readonly fsm: FsmService,
    private readonly events: EventEmitter2,
    private readonly ctx: AppContextService,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async list(user: RequestUser, dto: ListSubmissionsDto) {
    const { data, total } = await this.repo.findMany(user.organizationId, dto);
    const totalPages = Math.ceil(total / dto.limit);
    return {
      data: data.map(toSubmissionListItem),
      meta: { total, page: dto.page, limit: dto.limit, totalPages },
    };
  }

  // ── Get by ID ─────────────────────────────────────────────────────────────

  async findOne(user: RequestUser, id: string) {
    const s = await this.repo.findById(id, user.organizationId);
    if (!s) throw new NotFoundException('Submission not found');
    return toSubmissionDetail(s);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async stats(user: RequestUser) {
    const byStatus = await this.repo.stats(user.organizationId);
    const total = byStatus.reduce((sum, r) => sum + r.count, 0);
    return { total, byStatus };
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(user: RequestUser, dto: CreateSubmissionDto) {
    const duplicate = await this.repo.findActiveForCandidateAndJob(
      user.organizationId,
      dto.candidateId,
      dto.jobId,
    );
    if (duplicate) {
      throw new ConflictException(
        `An active submission already exists for this candidate and job (id: ${duplicate.id}, status: ${duplicate.status})`,
      );
    }

    const submission = await this.repo.create({
      organizationId: user.organizationId,
      candidateId:    dto.candidateId,
      jobId:          dto.jobId,
      vendorId:       dto.vendorId ?? null,
      ownerId:        dto.ownerId ?? user.userId,
      createdById:    user.userId,
      status:         SubmissionStatus.DRAFT,
      currency:       dto.currency ?? 'USD',
      billRate:       dto.billRate ?? null,
      payRate:        dto.payRate ?? null,
      offerSalary:    dto.offerSalary ?? null,
      startDate:      dto.startDate ? new Date(dto.startDate) : null,
      coverNote:      dto.coverNote ?? null,
    });

    await this.repo.addStatusHistory({
      submissionId: submission.id,
      fromStatus:   null,
      toStatus:     SubmissionStatus.DRAFT,
      changedById:  user.userId,
      reason:       'Submission created',
    });

    this.events.emit(
      EventNames.SUBMISSION_CREATED,
      new SubmissionCreatedEvent(this.actor(user), {
        submissionId: submission.id,
        candidateId:  dto.candidateId,
        jobId:        dto.jobId,
        vendorId:     dto.vendorId ?? null,
      }),
    );

    return toSubmissionDetail(submission);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(user: RequestUser, id: string, dto: UpdateSubmissionDto) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Submission not found');

    const changedFields = Object.keys(dto).filter(
      (k) => (dto as Record<string, unknown>)[k] !== undefined,
    );

    const updated = await this.repo.update(id, user.organizationId, {
      ...(dto.ownerId     !== undefined && { ownerId:     dto.ownerId }),
      ...(dto.vendorId    !== undefined && { vendorId:    dto.vendorId }),
      ...(dto.billRate    !== undefined && { billRate:    dto.billRate }),
      ...(dto.payRate     !== undefined && { payRate:     dto.payRate }),
      ...(dto.currency    !== undefined && { currency:    dto.currency }),
      ...(dto.offerSalary !== undefined && { offerSalary: dto.offerSalary }),
      ...(dto.startDate   !== undefined && { startDate:   dto.startDate ? new Date(dto.startDate) : null }),
      ...(dto.coverNote   !== undefined && { coverNote:   dto.coverNote }),
    });
    if (!updated) throw new NotFoundException('Submission not found');

    this.events.emit(
      EventNames.SUBMISSION_UPDATED,
      new SubmissionUpdatedEvent(this.actor(user), {
        submissionId: id,
        changedFields,
      }),
    );

    return toSubmissionDetail(updated);
  }

  // ── Change status ─────────────────────────────────────────────────────────

  async changeStatus(user: RequestUser, id: string, dto: ChangeStatusDto) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Submission not found');

    this.fsm.validate(SUBMISSION_FSM, existing.status, dto.status);

    const stageTimestamp = this.stageTimestampField(dto.status);
    const updated = await this.repo.update(id, user.organizationId, {
      status: dto.status,
      ...(dto.reason && this.isRejectionOrWithdrawal(dto.status) && {
        rejectionReason: dto.reason,
      }),
      ...(stageTimestamp && { [stageTimestamp]: new Date() }),
    });
    if (!updated) throw new NotFoundException('Submission not found');

    await this.repo.addStatusHistory({
      submissionId: id,
      fromStatus:   existing.status,
      toStatus:     dto.status,
      changedById:  user.userId,
      reason:       dto.reason ?? null,
    });

    await this.addSystemNote(
      id,
      user.organizationId,
      user.userId,
      user.email,
      `Status changed from ${existing.status} to ${dto.status}${dto.reason ? `: ${dto.reason}` : ''}`,
    );

    this.events.emit(
      EventNames.SUBMISSION_STATUS_CHANGED,
      new SubmissionStatusChangedEvent(this.actor(user), {
        submissionId: id,
        candidateId:  existing.candidateId,
        jobId:        existing.jobId,
        fromStatus:   existing.status,
        toStatus:     dto.status,
        reason:       dto.reason ?? null,
      }),
    );

    return toSubmissionDetail(updated);
  }

  // ── Add note ──────────────────────────────────────────────────────────────

  async addNote(user: RequestUser, id: string, dto: CreateSubmissionNoteDto) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Submission not found');

    const note = await this.repo.addNote({
      submissionId:   id,
      organizationId: user.organizationId,
      content:        dto.content,
      noteType:       dto.noteType ?? NoteType.NOTE,
      isSystem:       false,
      authorId:       user.userId,
      authorEmail:    user.email,
      authorName:     user.email,
    });

    this.events.emit(
      EventNames.SUBMISSION_NOTE_ADDED,
      new SubmissionNoteAddedEvent(this.actor(user), {
        submissionId: id,
        noteId:       note.id,
        noteType:     note.noteType,
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

  // ── Delete ────────────────────────────────────────────────────────────────

  async remove(user: RequestUser, id: string) {
    const existing = await this.repo.findById(id, user.organizationId);
    if (!existing) throw new NotFoundException('Submission not found');

    const deleted = await this.repo.softDelete(id, user.organizationId);
    if (!deleted) throw new NotFoundException('Submission not found');

    this.events.emit(
      EventNames.SUBMISSION_DELETED,
      new SubmissionDeletedEvent(this.actor(user), { submissionId: id }),
    );
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

  private stageTimestampField(status: SubmissionStatus): string | null {
    const map: Partial<Record<SubmissionStatus, string>> = {
      [SubmissionStatus.SUBMITTED]:    'submittedAt',
      [SubmissionStatus.UNDER_REVIEW]: 'reviewedAt',
      [SubmissionStatus.SHORTLISTED]:  'shortlistedAt',
      [SubmissionStatus.INTERVIEW]:    'interviewAt',
      [SubmissionStatus.OFFERED]:      'offeredAt',
      [SubmissionStatus.PLACED]:       'placedAt',
      [SubmissionStatus.REJECTED]:     'rejectedAt',
      [SubmissionStatus.WITHDRAWN]:    'withdrawnAt',
      [SubmissionStatus.CLOSED]:       'closedAt',
    };
    return map[status] ?? null;
  }

  private isRejectionOrWithdrawal(status: SubmissionStatus): boolean {
    return (
      status === SubmissionStatus.REJECTED ||
      status === SubmissionStatus.WITHDRAWN
    );
  }

  private async addSystemNote(
    submissionId: string,
    organizationId: string,
    authorId: string,
    authorEmail: string,
    content: string,
  ) {
    await this.repo.addNote({
      submissionId,
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
