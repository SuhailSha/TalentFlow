import { Injectable } from '@nestjs/common';

import { runBulkOperation } from '../../common/bulk/bulk-helper';
import type { BulkOperationResult } from '../../common/bulk/bulk.types';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { RemindersService } from '../reminders/reminders.service';
import { SubmissionsService } from './submissions.service';
import type {
  BulkAddReminderDto,
  BulkArchiveDto,
  BulkAssignOwnerDto,
  BulkChangeStatusDto,
} from './dto/bulk-submissions.dto';

/**
 * Bulk operations over submissions.
 *
 * Every handler delegates to the per-record SubmissionsService method
 * (changeStatus / update / remove) so the existing FSM, status-history,
 * system-note, and event-emission semantics flow through naturally. No
 * duplicate domain logic.
 *
 * Tenant authorization is done once per request via a single Prisma
 * findMany that filters to ids in the caller's org. Failed ids are
 * surfaced in the result rather than blocking the batch.
 */
@Injectable()
export class SubmissionsBulkService {
  constructor(
    private readonly db: PrismaService,
    private readonly submissions: SubmissionsService,
    private readonly reminders:   RemindersService,
  ) {}

  /** Returns the subset of ids the caller can act on. */
  private async authorize(ids: string[], organizationId: string): Promise<string[]> {
    const rows = await this.db.submission.findMany({
      where: { id: { in: ids }, organizationId, deletedAt: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async changeStatus(user: RequestUser, dto: BulkChangeStatusDto): Promise<BulkOperationResult> {
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        await this.submissions.changeStatus(user, id, {
          status: dto.status,
          ...(dto.reason ? { reason: dto.reason } : {}),
        });
        return { id, status: dto.status };
      },
    });
  }

  async assignOwner(user: RequestUser, dto: BulkAssignOwnerDto): Promise<BulkOperationResult> {
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        await this.submissions.update(user, id, { ownerId: dto.ownerId });
        return { id, ownerId: dto.ownerId };
      },
    });
  }

  async archive(user: RequestUser, dto: BulkArchiveDto): Promise<BulkOperationResult> {
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        await this.submissions.remove(user, id);
        return { id, archived: true };
      },
    });
  }

  async addReminder(user: RequestUser, dto: BulkAddReminderDto): Promise<BulkOperationResult> {
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
          submissionId: id,
        });
        return { id, reminderId: reminder.id };
      },
    });
  }
}
