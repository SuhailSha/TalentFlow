import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database';
import type { ActivityEntry, ActivityVerb } from './activity.types';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Project a unified activity feed for a candidate from audit_logs + notes.
   * Sorted newest-first.
   */
  async assembleForCandidate(
    candidateId: string,
    organizationId: string,
    limit = 50,
  ): Promise<ActivityEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { resourceId: candidateId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id:         log.id,
      verb:       this.actionToVerb(log.action),
      actorId:    log.actorId   ?? null,
      actorEmail: log.actorEmail ?? null,
      occurredAt: log.createdAt.toISOString(),
      metadata:   (log.metadata as Record<string, unknown> | null) ?? null,
    }));
  }

  /**
   * Project a unified activity feed for a job from audit_logs + notes.
   * Sorted newest-first.
   */
  async assembleForJob(
    jobId: string,
    organizationId: string,
    limit = 50,
  ): Promise<ActivityEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { resourceId: jobId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id:         log.id,
      verb:       this.actionToVerb(log.action),
      actorId:    log.actorId   ?? null,
      actorEmail: log.actorEmail ?? null,
      occurredAt: log.createdAt.toISOString(),
      metadata:   (log.metadata as Record<string, unknown> | null) ?? null,
    }));
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private actionToVerb(action: string): ActivityVerb {
    if (action.includes('created'))       return 'created';
    if (action.includes('deleted'))       return 'deleted';
    if (action.includes('status_change')) return 'status_changed';
    if (action.includes('note_add'))      return 'note_added';
    if (action.includes('skill_add'))     return 'skill_added';
    if (action.includes('skill_remove'))  return 'skill_removed';
    return 'updated';
  }
}
