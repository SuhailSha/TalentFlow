import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ReminderStatus,
} from '@repo/database';
import { PrismaService } from '../../database/prisma.service';
import type { ListRemindersDto } from './dto/list-reminders.dto';

// ── Include shapes ─────────────────────────────────────────────────────────────

const REMINDER_LIST_INCLUDE = {
  assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
  candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
  interview: { select: { id: true, round: true, roundLabel: true, type: true, status: true, scheduledAt: true } },
  submission: { select: { id: true, status: true } },
  job:        { select: { id: true, reqId: true, title: true, department: true } },
} satisfies Prisma.ReminderInclude;

const REMINDER_DETAIL_INCLUDE = {
  ...REMINDER_LIST_INCLUDE,
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  activities: {
    orderBy: { createdAt: 'desc' as const },
    take: 50,
    include: { actor: { select: { id: true, firstName: true, lastName: true } } },
  },
} satisfies Prisma.ReminderInclude;

export type ReminderListItem  = Prisma.ReminderGetPayload<{ include: typeof REMINDER_LIST_INCLUDE }>;
export type ReminderDetail    = Prisma.ReminderGetPayload<{ include: typeof REMINDER_DETAIL_INCLUDE }>;

// ── Repository ─────────────────────────────────────────────────────────────────

@Injectable()
export class RemindersRepository {
  constructor(private readonly db: PrismaService) {}

  async findMany(organizationId: string, dto: ListRemindersDto) {
    const where = this.buildWhere(organizationId, dto);
    const orderBy = this.buildOrderBy(dto);
    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);

    const [data, total] = await this.db.$transaction([
      this.db.reminder.findMany({
        where,
        include: REMINDER_LIST_INCLUDE,
        orderBy,
        skip,
        take: dto.limit ?? 20,
      }),
      this.db.reminder.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string, organizationId: string) {
    return this.db.reminder.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: REMINDER_DETAIL_INCLUDE,
    });
  }

  async create(data: Prisma.ReminderUncheckedCreateInput) {
    return this.db.reminder.create({ data, include: REMINDER_LIST_INCLUDE });
  }

  async update(id: string, data: Prisma.ReminderUncheckedUpdateInput) {
    return this.db.reminder.update({
      where: { id },
      data,
      include: REMINDER_LIST_INCLUDE,
    });
  }

  async softDelete(id: string) {
    return this.db.reminder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addActivity(data: Prisma.ReminderActivityUncheckedCreateInput) {
    return this.db.reminderActivity.create({ data });
  }

  // ── Action Center query ────────────────────────────────────────────────────

  async actionCenter(organizationId: string, assigneeId: string) {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const in7Days = new Date(now);
    in7Days.setDate(now.getDate() + 7);

    const activeStatuses: ReminderStatus[] = ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'];
    const baseWhere: Prisma.ReminderWhereInput = {
      organizationId,
      assigneeId,
      deletedAt: null,
    };

    const [
      overdue,
      dueToday,
      upcoming,
      pendingFeedback,
      total,
      critical,
    ] = await this.db.$transaction([
      // Overdue: active status and dueAt is in the past
      this.db.reminder.findMany({
        where: {
          ...baseWhere,
          status: { in: ['PENDING', 'ACKNOWLEDGED'] },
          dueAt: { lt: now, not: null },
        },
        include: REMINDER_LIST_INCLUDE,
        orderBy: { dueAt: 'asc' },
        take: 20,
      }),
      // Due today (not yet overdue)
      this.db.reminder.findMany({
        where: {
          ...baseWhere,
          status: { in: activeStatuses },
          dueAt: { gte: now, lte: endOfToday },
        },
        include: REMINDER_LIST_INCLUDE,
        orderBy: { dueAt: 'asc' },
        take: 20,
      }),
      // Upcoming (next 7 days, excluding today)
      this.db.reminder.findMany({
        where: {
          ...baseWhere,
          status: { in: activeStatuses },
          dueAt: { gt: endOfToday, lte: in7Days },
        },
        include: REMINDER_LIST_INCLUDE,
        orderBy: { dueAt: 'asc' },
        take: 20,
      }),
      // Pending feedback specifically
      this.db.reminder.findMany({
        where: {
          ...baseWhere,
          status: { in: activeStatuses },
          type: 'INTERVIEW_FEEDBACK_PENDING',
        },
        include: REMINDER_LIST_INCLUDE,
        orderBy: { dueAt: 'asc' },
        take: 10,
      }),
      // Total active count
      this.db.reminder.count({
        where: { ...baseWhere, status: { in: activeStatuses } },
      }),
      // Critical count
      this.db.reminder.count({
        where: { ...baseWhere, status: { in: activeStatuses }, priority: 'CRITICAL' },
      }),
    ]);

    return {
      stats: {
        total,
        overdue:        overdue.length,
        dueToday:       dueToday.length,
        upcoming:       upcoming.length,
        pendingFeedback: pendingFeedback.length,
        critical,
      },
      sections: {
        overdue,
        dueToday,
        upcoming,
        pendingFeedback,
      },
    };
  }

  // ── Stats query ────────────────────────────────────────────────────────────

  async stats(organizationId: string, assigneeId?: string) {
    const baseWhere: Prisma.ReminderWhereInput = {
      organizationId,
      ...(assigneeId && { assigneeId }),
      deletedAt: null,
    };
    const now = new Date();

    const [total, pending, overdue, critical, completedToday] =
      await this.db.$transaction([
        this.db.reminder.count({ where: { ...baseWhere, status: { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'] } } }),
        this.db.reminder.count({ where: { ...baseWhere, status: 'PENDING' } }),
        this.db.reminder.count({ where: { ...baseWhere, status: { in: ['PENDING', 'ACKNOWLEDGED'] }, dueAt: { lt: now } } }),
        this.db.reminder.count({ where: { ...baseWhere, status: { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'] }, priority: 'CRITICAL' } }),
        this.db.reminder.count({
          where: {
            ...baseWhere,
            status: 'COMPLETED',
            completedAt: { gte: new Date(now.setHours(0, 0, 0, 0)) },
          },
        }),
      ]);

    return { total, pending, overdue, critical, completedToday };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildWhere(organizationId: string, dto: ListRemindersDto): Prisma.ReminderWhereInput {
    return {
      organizationId,
      deletedAt: null,
      ...(dto.status?.length   && { status: { in: dto.status } }),
      ...(dto.type?.length     && { type: { in: dto.type } }),
      ...(dto.priority?.length && { priority: { in: dto.priority } }),
      ...(dto.assigneeId       && { assigneeId: dto.assigneeId }),
      ...(dto.submissionId     && { submissionId: dto.submissionId }),
      ...(dto.interviewId      && { interviewId: dto.interviewId }),
      ...(dto.candidateId      && { candidateId: dto.candidateId }),
    };
  }

  private buildOrderBy(dto: ListRemindersDto): Prisma.ReminderOrderByWithRelationInput {
    const dir = dto.sortOrder ?? 'asc';
    switch (dto.sortBy) {
      case 'priority':   return { priority: dir };
      case 'createdAt':  return { createdAt: dir };
      case 'status':     return { status: dir };
      default:           return { dueAt: { sort: dir, nulls: 'last' } };
    }
  }
}
