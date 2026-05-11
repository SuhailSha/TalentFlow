import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database';
import type { ActivityEntry, ActivityVerb } from './activity.types';

const ENTITY_TYPE_MAP: Record<string, string> = {
  candidate:   'Candidate',
  candidates:  'Candidate',
  job:         'JobDescription',
  jobs:        'JobDescription',
  vendor:      'Vendor',
  vendors:     'Vendor',
  submission:  'Submission',
  submissions: 'Submission',
  interview:   'Interview',
  interviews:  'Interview',
  user:        'User',
  organization: 'Organization',
};

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Unified activity feed for any entity. Pulls from audit_logs which is the
   * authoritative cross-domain event store (every event hits @OnEvent('**')).
   */
  async assembleForEntity(
    entityType: string,
    entityId: string,
    organizationId: string,
    limit = 50,
  ): Promise<ActivityEntry[]> {
    const resourceType = ENTITY_TYPE_MAP[entityType.toLowerCase()] ?? entityType;

    const logs = await this.prisma.auditLog.findMany({
      where: { resourceType, resourceId: entityId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id:           log.id,
      action:       log.action,
      verb:         this.actionToVerb(log.action),
      actorId:      log.actorId   ?? null,
      actorEmail:   log.actorEmail ?? null,
      resourceType: log.resourceType,
      resourceId:   log.resourceId,
      occurredAt:   log.createdAt.toISOString(),
      metadata:     (log.metadata as Record<string, unknown> | null) ?? null,
      before:       (log.before   as Record<string, unknown> | null) ?? null,
      after:        (log.after    as Record<string, unknown> | null) ?? null,
    }));
  }

  // Legacy convenience methods retained for compatibility.
  async assembleForCandidate(candidateId: string, organizationId: string, limit = 50) {
    return this.assembleForEntity('Candidate', candidateId, organizationId, limit);
  }
  async assembleForJob(jobId: string, organizationId: string, limit = 50) {
    return this.assembleForEntity('JobDescription', jobId, organizationId, limit);
  }

  private actionToVerb(action: string): ActivityVerb {
    if (action.endsWith('.created'))                 return 'created';
    if (action.endsWith('.deleted'))                 return 'deleted';
    if (action.includes('status_changed'))           return 'status_changed';
    if (action.includes('note_added'))               return 'note_added';
    if (action.includes('skill_added'))              return 'skill_added';
    if (action.includes('skill_removed'))            return 'skill_removed';
    if (action.includes('owner_changed'))            return 'assigned';
    if (action.includes('scheduled'))                return 'scheduled';
    if (action.includes('cancelled'))                return 'cancelled';
    if (action.includes('feedback_submitted'))       return 'feedback_submitted';
    if (action.includes('invited'))                  return 'invited';
    if (action.includes('placed'))                   return 'placed';
    if (action.includes('offer_extended'))           return 'offer_extended';
    if (action.includes('passed'))                   return 'passed';
    if (action.includes('failed'))                   return 'failed';
    if (action.includes('no_show'))                  return 'no_show';
    if (action.includes('reminder.acknowledged'))    return 'acknowledged';
    if (action.includes('reminder.completed'))       return 'reminder_completed';
    if (action.includes('reminder.snoozed'))         return 'snoozed';
    if (action.includes('reminder.dismissed'))       return 'dismissed';
    return 'updated';
  }
}
