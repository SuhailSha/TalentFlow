import { Injectable } from '@nestjs/common';

import { runBulkOperation } from '../../common/bulk/bulk-helper';
import type { BulkOperationResult } from '../../common/bulk/bulk.types';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { RemindersService } from './reminders.service';
import type {
  BulkCompleteRemindersDto,
  BulkDismissRemindersDto,
  BulkSnoozeRemindersDto,
} from './dto/bulk-reminders.dto';

/**
 * Bulk operations over reminders. Common recruiter workflow:
 *   - "snooze all my reminders for the weekend" — snooze N at once
 *   - "I've actioned these 12 — mark them all complete"
 *   - "these are noise — dismiss them all"
 */
@Injectable()
export class RemindersBulkService {
  constructor(
    private readonly db: PrismaService,
    private readonly reminders: RemindersService,
  ) {}

  private async authorize(ids: string[], organizationId: string): Promise<string[]> {
    const rows = await this.db.reminder.findMany({
      where: { id: { in: ids }, organizationId, deletedAt: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async snooze(user: RequestUser, dto: BulkSnoozeRemindersDto): Promise<BulkOperationResult> {
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        await this.reminders.snooze(user, id, {
          minutes: dto.minutes,
          ...(dto.note ? { note: dto.note } : {}),
        });
        return { id, snoozedMinutes: dto.minutes };
      },
    });
  }

  async complete(user: RequestUser, dto: BulkCompleteRemindersDto): Promise<BulkOperationResult> {
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        await this.reminders.complete(user, id, dto.note ? { note: dto.note } : {});
        return { id, completed: true };
      },
    });
  }

  async dismiss(user: RequestUser, dto: BulkDismissRemindersDto): Promise<BulkOperationResult> {
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        await this.reminders.dismiss(user, id, dto.reason ? { reason: dto.reason } : {});
        return { id, dismissed: true };
      },
    });
  }
}
