import { Injectable } from '@nestjs/common';

import { runBulkOperation } from '../../common/bulk/bulk-helper';
import type { BulkOperationResult } from '../../common/bulk/bulk.types';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { RemindersService } from '../reminders/reminders.service';
import { CandidatesService } from './candidates.service';
import type {
  BulkAddCandidateNoteDto,
  BulkAddCandidateReminderDto,
  BulkChangeCandidateStatusDto,
  BulkDeleteCandidatesDto,
} from './dto/bulk-candidates.dto';

@Injectable()
export class CandidatesBulkService {
  constructor(
    private readonly db: PrismaService,
    private readonly candidates: CandidatesService,
    private readonly reminders:  RemindersService,
  ) {}

  private async authorize(ids: string[], organizationId: string): Promise<string[]> {
    const rows = await this.db.candidate.findMany({
      where: { id: { in: ids }, organizationId, deletedAt: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async transitionStatus(
    user: RequestUser,
    dto: BulkChangeCandidateStatusDto,
  ): Promise<BulkOperationResult> {
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        await this.candidates.transitionStatus(id, { status: dto.status }, user);
        // Reason recorded as a system note so the audit trail tells the
        // recruiter why the bulk move happened.
        if (dto.reason) {
          await this.candidates.addNote(
            id,
            { content: `[Bulk status change] ${dto.reason}`, noteType: 'STATUS_CHANGE' },
            user,
          );
        }
        return { id, status: dto.status };
      },
    });
  }

  async addNote(user: RequestUser, dto: BulkAddCandidateNoteDto): Promise<BulkOperationResult> {
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        const note = await this.candidates.addNote(
          id,
          {
            content: dto.content,
            ...(dto.noteType ? { noteType: dto.noteType } : {}),
          },
          user,
        );
        return { id, noteId: note.id };
      },
    });
  }

  async addReminder(
    user: RequestUser,
    dto: BulkAddCandidateReminderDto,
  ): Promise<BulkOperationResult> {
    const parsedDueAt = dto.dueAt ? new Date(dto.dueAt) : undefined;
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        const reminder = await this.reminders.create(user, {
          type:        dto.type,
          title:       dto.title,
          ...(dto.description && { description: dto.description }),
          ...(dto.priority && { priority: dto.priority }),
          ...(parsedDueAt && { dueAt: parsedDueAt.toISOString() }),
          candidateId: id,
        });
        return { id, reminderId: reminder.id };
      },
    });
  }

  async softDelete(user: RequestUser, dto: BulkDeleteCandidatesDto): Promise<BulkOperationResult> {
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        await this.candidates.softDelete(id, user);
        return { id, deleted: true };
      },
    });
  }
}
