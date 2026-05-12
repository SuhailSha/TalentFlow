import { Injectable } from '@nestjs/common';

import { runBulkOperation } from '../../common/bulk/bulk-helper';
import type { BulkOperationResult } from '../../common/bulk/bulk.types';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { InterviewsService } from './interviews.service';
import type {
  BulkAddInterviewNoteDto,
  BulkChangeInterviewStatusDto,
} from './dto/bulk-interviews.dto';

/**
 * Bulk operations over interviews. Delegates to the per-record
 * InterviewsService so the FSM, status history, system notes, and event
 * emission remain authoritative.
 *
 * Typical bulk paths:
 *   - Cancel a tranche of upcoming interviews (status -> CANCELLED + reason)
 *   - Apply a common note across a panel's worth of interviews
 */
@Injectable()
export class InterviewsBulkService {
  constructor(
    private readonly db: PrismaService,
    private readonly interviews: InterviewsService,
  ) {}

  private async authorize(ids: string[], organizationId: string): Promise<string[]> {
    const rows = await this.db.interview.findMany({
      where: { id: { in: ids }, organizationId, deletedAt: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async changeStatus(
    user: RequestUser,
    dto: BulkChangeInterviewStatusDto,
  ): Promise<BulkOperationResult> {
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        await this.interviews.changeStatus(user, id, {
          status: dto.status,
          ...(dto.reason ? { reason: dto.reason } : {}),
        });
        return { id, status: dto.status };
      },
    });
  }

  async addNote(user: RequestUser, dto: BulkAddInterviewNoteDto): Promise<BulkOperationResult> {
    return runBulkOperation({
      ids:            dto.ids,
      organizationId: user.organizationId,
      authorize:      (ids) => this.authorize(ids, user.organizationId),
      handler:        async (id) => {
        const note = await this.interviews.addNote(user, id, {
          content:  dto.content,
          ...(dto.noteType ? { noteType: dto.noteType } : {}),
        });
        return { id, noteId: note.id };
      },
    });
  }
}
