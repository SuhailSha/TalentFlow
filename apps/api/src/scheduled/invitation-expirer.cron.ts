import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../database/prisma.service';

/**
 * Marks invitations whose expiresAt has passed as EXPIRED.
 *
 * Without this background sweep, an invitation that nobody attempts to use
 * stays PENDING forever. AuthService.previewInvitation also auto-promotes on
 * read, but the cron guarantees stale rows don't accumulate.
 *
 * Single-instance assumption: if you scale the API horizontally, this cron
 * will fire on every instance and do duplicate (but idempotent) UPDATEs.
 * Move to a leader-elected job runner or BullMQ repeatable jobs to avoid that.
 */
@Injectable()
export class InvitationExpirerCron {
  private readonly logger = new Logger(InvitationExpirerCron.name);

  constructor(private readonly db: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expirePastDueInvitations() {
    const result = await this.db.userInvitation.updateMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
      data:  { status: 'EXPIRED' },
    });
    if (result.count > 0) {
      this.logger.log({ expiredCount: result.count }, 'Expired stale invitations');
    }
  }
}
