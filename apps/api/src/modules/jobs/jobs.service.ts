import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobStatus, NoteType } from '@repo/database';

import type { RequestUser } from '../../auth/types/request-user.interface';
import { AppContextService } from '../../common/context/app-context.service';
import { EventNames } from '../../common/events/event-names.constant';
import { FsmService, JOB_FSM } from '../../common/workflow';
import { SkillsService } from '../candidates/skills.service';
import { JobsRepository } from './jobs.repository';
import type { AssignJobSkillDto } from './dto/assign-job-skill.dto';
import type { CreateJobDto } from './dto/create-job.dto';
import type { CreateJobNoteDto } from './dto/create-job-note.dto';
import type { ListJobsDto } from './dto/list-jobs.dto';
import type { TransitionStatusDto } from './dto/transition-status.dto';
import type { UpdateJobDto } from './dto/update-job.dto';
import {
  toJobDetail,
  toJobListItem,
  type JobDetail,
  type JobListItem,
} from './types/job.types';
import {
  JobCreatedEvent,
  JobDeletedEvent,
  JobNoteAddedEvent,
  JobSkillAddedEvent,
  JobSkillRemovedEvent,
  JobStatusChangedEvent,
  JobUpdatedEvent,
} from './events/job.events';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly repo: JobsRepository,
    private readonly skillsService: SkillsService,
    private readonly events: EventEmitter2,
    private readonly ctx: AppContextService,
    private readonly fsm: FsmService,
  ) {}

  private actorContext(actor: RequestUser) {
    return {
      actorId: actor.userId,
      actorEmail: actor.email,
      organizationId: actor.organizationId,
      correlationId: this.ctx.requestId,
    };
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async findMany(
    organizationId: string,
    dto: ListJobsDto,
  ): Promise<{ jobs: JobListItem[]; total: number }> {
    const { jobs, total } = await this.repo.findMany(organizationId, dto);
    return { jobs: jobs.map(toJobListItem), total };
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findById(id: string, organizationId: string): Promise<JobDetail> {
    const job = await this.repo.findById(id, organizationId);
    if (!job) throw new NotFoundException(`Job description ${id} not found`);
    return toJobDetail(job);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateJobDto, actor: RequestUser): Promise<JobDetail> {
    const { organizationId } = actor;

    // Generate org-scoped req_id: REQ-0001, REQ-0002, …
    const count = await this.repo.countForOrg(organizationId);
    const reqId = `REQ-${String(count + 1).padStart(4, '0')}`;

    const job = await this.repo.create({
      organizationId,
      reqId,
      title: dto.title.trim(),
      department: dto.department?.trim(),
      employmentType: dto.employmentType ?? 'FULL_TIME',
      workMode: dto.workMode ?? 'ONSITE',
      status: 'DRAFT',
      hiringPriority: dto.hiringPriority ?? 'NORMAL',
      hiringManagerId: dto.hiringManagerId ?? null,
      hiringManagerName: dto.hiringManagerName?.trim() ?? null,
      openPositions: dto.openPositions ?? 1,
      filledPositions: 0,
      experienceMin: dto.experienceMin ?? null,
      experienceMax: dto.experienceMax ?? null,
      salaryMin: dto.salaryMin ?? null,
      salaryMax: dto.salaryMax ?? null,
      salaryCurrency: dto.salaryCurrency?.toUpperCase() ?? null,
      salaryType: dto.salaryType ?? 'ANNUAL',
      city: dto.city?.trim() ?? null,
      stateProvince: dto.stateProvince?.trim() ?? null,
      country: dto.country?.trim() ?? null,
      timezone: dto.timezone ?? null,
      description: dto.description?.trim() ?? null,
      requirements: dto.requirements?.trim() ?? null,
      niceToHave: dto.niceToHave?.trim() ?? null,
      benefits: dto.benefits?.trim() ?? null,
      targetHireDate: dto.targetHireDate ? new Date(dto.targetHireDate) : null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    this.logger.log({ msg: 'Job created', jobId: job.id, reqId, orgId: organizationId });

    this.events.emit(
      EventNames.JOB_CREATED,
      new JobCreatedEvent(this.actorContext(actor), {
        jobId: job.id,
        reqId: job.reqId,
        title: job.title,
      }),
    );

    return toJobDetail(job);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateJobDto, actor: RequestUser): Promise<JobDetail> {
    await this.assertExists(id, actor.organizationId);

    const updated = await this.repo.update(id, actor.organizationId, {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.department !== undefined ? { department: dto.department?.trim() ?? null } : {}),
      ...(dto.employmentType !== undefined ? { employmentType: dto.employmentType } : {}),
      ...(dto.workMode !== undefined ? { workMode: dto.workMode } : {}),
      ...(dto.hiringPriority !== undefined ? { hiringPriority: dto.hiringPriority } : {}),
      ...(dto.hiringManagerId !== undefined ? { hiringManagerId: dto.hiringManagerId ?? null } : {}),
      ...(dto.hiringManagerName !== undefined
        ? { hiringManagerName: dto.hiringManagerName?.trim() ?? null }
        : {}),
      ...(dto.openPositions !== undefined ? { openPositions: dto.openPositions } : {}),
      ...(dto.experienceMin !== undefined ? { experienceMin: dto.experienceMin ?? null } : {}),
      ...(dto.experienceMax !== undefined ? { experienceMax: dto.experienceMax ?? null } : {}),
      ...(dto.salaryMin !== undefined ? { salaryMin: dto.salaryMin ?? null } : {}),
      ...(dto.salaryMax !== undefined ? { salaryMax: dto.salaryMax ?? null } : {}),
      ...(dto.salaryCurrency !== undefined
        ? { salaryCurrency: dto.salaryCurrency?.toUpperCase() ?? null }
        : {}),
      ...(dto.salaryType !== undefined ? { salaryType: dto.salaryType } : {}),
      ...(dto.city !== undefined ? { city: dto.city?.trim() ?? null } : {}),
      ...(dto.stateProvince !== undefined ? { stateProvince: dto.stateProvince?.trim() ?? null } : {}),
      ...(dto.country !== undefined ? { country: dto.country?.trim() ?? null } : {}),
      ...(dto.timezone !== undefined ? { timezone: dto.timezone ?? null } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() ?? null } : {}),
      ...(dto.requirements !== undefined ? { requirements: dto.requirements?.trim() ?? null } : {}),
      ...(dto.niceToHave !== undefined ? { niceToHave: dto.niceToHave?.trim() ?? null } : {}),
      ...(dto.benefits !== undefined ? { benefits: dto.benefits?.trim() ?? null } : {}),
      ...(dto.targetHireDate !== undefined
        ? { targetHireDate: dto.targetHireDate ? new Date(dto.targetHireDate) : null }
        : {}),
      updatedBy: actor.userId,
    });

    this.events.emit(
      EventNames.JOB_UPDATED,
      new JobUpdatedEvent(this.actorContext(actor), {
        jobId: id,
        changedFields: Object.keys(dto),
      }),
    );

    return toJobDetail(updated);
  }

  // ── Status transition ─────────────────────────────────────────────────────

  async transitionStatus(
    id: string,
    dto: TransitionStatusDto,
    actor: RequestUser,
  ): Promise<JobDetail> {
    const job = await this.assertExists(id, actor.organizationId);
    const fromStatus = job.status;
    const toStatus = dto.status;

    this.fsm.validate(JOB_FSM, fromStatus, toStatus);

    const now = new Date();
    const updated = await this.repo.update(id, actor.organizationId, {
      status: toStatus,
      ...(toStatus === JobStatus.OPEN && !job.openedAt ? { openedAt: now } : {}),
      ...(toStatus === JobStatus.FILLED || toStatus === JobStatus.CANCELLED
        ? { closedAt: now }
        : {}),
      ...(toStatus === JobStatus.ARCHIVED
        ? { deletedAt: now, deletedBy: actor.userId }
        : {}),
      updatedBy: actor.userId,
    });

    this.logger.log({ msg: 'Job status changed', jobId: id, fromStatus, toStatus });

    this.events.emit(
      EventNames.JOB_STATUS_CHANGED,
      new JobStatusChangedEvent(this.actorContext(actor), { jobId: id, fromStatus, toStatus }),
    );

    if (toStatus === JobStatus.ARCHIVED) {
      this.events.emit(
        EventNames.JOB_DELETED,
        new JobDeletedEvent(this.actorContext(actor), { jobId: id }),
      );
    }

    return toJobDetail(updated);
  }

  // ── Skills ────────────────────────────────────────────────────────────────

  async assignSkill(
    jobId: string,
    dto: AssignJobSkillDto,
    actor: RequestUser,
  ) {
    await this.assertExists(jobId, actor.organizationId);

    let skill: Awaited<ReturnType<SkillsService['findById']>>;

    if (dto.skillId) {
      skill = await this.skillsService.findById(dto.skillId);
      if (!skill) throw new NotFoundException(`Skill ${dto.skillId} not found`);
    } else if (dto.skillName) {
      skill = await this.skillsService.getOrCreate(dto.skillName, undefined, actor.organizationId);
    } else {
      throw new BadRequestException('Provide either skillId or skillName');
    }

    const existing = await this.repo.findJobSkill(jobId, skill.id);

    if (existing) {
      return this.repo.updateSkill(existing.id, {
        isRequired: dto.isRequired ?? existing.isRequired,
        importanceLevel: dto.importanceLevel ?? existing.importanceLevel,
        minimumYears: dto.minimumYears ?? existing.minimumYears,
      });
    }

    const assigned = await this.repo.assignSkill({
      jobDescriptionId: jobId,
      skillId: skill.id,
      isRequired: dto.isRequired ?? true,
      importanceLevel: dto.importanceLevel ?? 'MEDIUM',
      minimumYears: dto.minimumYears ?? null,
      addedBy: actor.userId,
    });

    this.events.emit(
      EventNames.JOB_SKILL_ADDED,
      new JobSkillAddedEvent(this.actorContext(actor), {
        jobId,
        skillId: skill.id,
        skillName: skill.name,
        isRequired: assigned.isRequired,
      }),
    );

    return assigned;
  }

  async removeSkill(jobId: string, skillId: string, actor: RequestUser): Promise<void> {
    await this.assertExists(jobId, actor.organizationId);
    const existing = await this.repo.findJobSkill(jobId, skillId);
    if (!existing) throw new NotFoundException('Skill assignment not found');
    await this.repo.removeSkill(jobId, skillId);
    this.events.emit(
      EventNames.JOB_SKILL_REMOVED,
      new JobSkillRemovedEvent(this.actorContext(actor), { jobId, skillId }),
    );
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  async addNote(jobId: string, dto: CreateJobNoteDto, actor: RequestUser) {
    await this.assertExists(jobId, actor.organizationId);

    const note = await this.repo.createNote({
      content: dto.content.trim(),
      noteType: dto.noteType ?? NoteType.NOTE,
      authorId: actor.userId,
      authorEmail: actor.email,
      authorName: actor.email,
      jobDescriptionId: jobId,
      organizationId: actor.organizationId,
    });

    this.events.emit(
      EventNames.JOB_NOTE_ADDED,
      new JobNoteAddedEvent(this.actorContext(actor), {
        jobId,
        noteId: note.id,
        noteType: note.noteType,
      }),
    );

    return note;
  }

  async getNotes(jobId: string, actor: RequestUser) {
    await this.assertExists(jobId, actor.organizationId);
    return this.repo.findNotes(jobId, actor.organizationId);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async assertExists(id: string, organizationId: string) {
    const job = await this.repo.findByIdRaw(id, organizationId);
    if (!job) throw new NotFoundException(`Job description ${id} not found`);
    return job;
  }
}
