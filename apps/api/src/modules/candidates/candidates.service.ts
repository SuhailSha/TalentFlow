import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NoteType } from '@repo/database';

import type { RequestUser } from '../../auth/types/request-user.interface';
import { AppContextService } from '../../common/context/app-context.service';
import { EventNames } from '../../common/events/event-names.constant';
import { FsmService, CANDIDATE_FSM } from '../../common/workflow';
import { CandidatesRepository } from './candidates.repository';
import { SkillsService } from './skills.service';
import type { AssignSkillDto } from './dto/assign-skill.dto';
import type { CreateCandidateDto } from './dto/create-candidate.dto';
import type { CreateNoteDto } from './dto/create-note.dto';
import type { ListCandidatesDto } from './dto/list-candidates.dto';
import type { TransitionCandidateStatusDto } from './dto/transition-status.dto';
import type { UpdateCandidateDto } from './dto/update-candidate.dto';
import {
  toCandidateDetail,
  toCandidateListItem,
  type CandidateDetail,
  type CandidateListItem,
  type PotentialDuplicate,
} from './types/candidate.types';
import {
  CandidateCreatedEvent,
  CandidateDeletedEvent,
  CandidateNoteAddedEvent,
  CandidateSkillAddedEvent,
  CandidateSkillRemovedEvent,
  CandidateStatusChangedEvent,
  CandidateUpdatedEvent,
} from './events/candidate.events';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    private readonly repo: CandidatesRepository,
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
    dto: ListCandidatesDto,
  ): Promise<{ candidates: CandidateListItem[]; total: number }> {
    const { candidates, total } = await this.repo.findMany(organizationId, dto);
    return { candidates: candidates.map(toCandidateListItem), total };
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findById(id: string, organizationId: string): Promise<CandidateDetail> {
    const candidate = await this.repo.findById(id, organizationId);

    if (!candidate) {
      throw new NotFoundException(`Candidate ${id} not found`);
    }

    return toCandidateDetail(candidate);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(
    dto: CreateCandidateDto,
    actor: RequestUser,
  ): Promise<{ candidate: CandidateDetail; potentialDuplicates: PotentialDuplicate[] }> {
    const organizationId = actor.organizationId;
    const email = dto.email.toLowerCase().trim();

    // Level-1: hard duplicate check
    const existing = await this.repo.findByEmail(email, organizationId);
    if (existing) {
      throw new ConflictException({
        message: `A candidate with email "${email}" already exists in this organization.`,
        code: 'DUPLICATE_CANDIDATE_EMAIL',
        duplicateCandidateId: existing.id,
      });
    }

    // Level-2: fuzzy duplicate warning (non-blocking)
    const fuzzyDuplicates = await this.repo.findPotentialDuplicates(
      dto.firstName,
      dto.lastName,
      dto.phone,
      organizationId,
    );

    const candidate = await this.repo.create({
      email,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone?.trim(),
      linkedinUrl: dto.linkedinUrl,
      githubUrl: dto.githubUrl,
      portfolioUrl: dto.portfolioUrl,
      city: dto.city?.trim(),
      stateProvince: dto.stateProvince?.trim(),
      country: dto.country?.trim(),
      timezone: dto.timezone,
      isRemote: dto.isRemote ?? false,
      currentTitle: dto.currentTitle?.trim(),
      currentCompany: dto.currentCompany?.trim(),
      careerStartDate: dto.careerStartDate ? new Date(dto.careerStartDate) : undefined,
      summary: dto.summary?.trim(),
      salaryExpectationMin: dto.salaryExpectationMin,
      salaryExpectationMax: dto.salaryExpectationMax,
      salaryCurrency: dto.salaryCurrency?.toUpperCase(),
      status: dto.status ?? 'ACTIVE',
      availabilityStatus: dto.availabilityStatus ?? 'NOT_LOOKING',
      availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
      source: dto.source ?? 'MANUAL',
      sourceDetail: dto.sourceDetail,
      createdBy: actor.userId,
      updatedBy: actor.userId,
      lastActivityAt: new Date(),
      organization: { connect: { id: organizationId } },
    });

    this.logger.log({
      msg: 'Candidate created',
      candidateId: candidate.id,
      orgId: organizationId,
      actorId: actor.userId,
    });

    this.events.emit(
      EventNames.CANDIDATE_CREATED,
      new CandidateCreatedEvent(this.actorContext(actor), {
        candidateId: candidate.id,
        email: candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
      }),
    );

    return {
      candidate: toCandidateDetail(candidate),
      potentialDuplicates: fuzzyDuplicates.map((d) => ({
        id: d.id,
        fullName: `${d.firstName} ${d.lastName}`,
        email: d.email,
        currentTitle: d.currentTitle,
      })),
    };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateCandidateDto,
    actor: RequestUser,
  ): Promise<CandidateDetail> {
    const organizationId = actor.organizationId;

    await this.assertExists(id, organizationId);

    // Email uniqueness check when email is being changed
    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      const conflict = await this.repo.findByEmail(email, organizationId, id);
      if (conflict) {
        throw new ConflictException({
          message: `Email "${email}" is already used by another candidate.`,
          code: 'DUPLICATE_CANDIDATE_EMAIL',
          duplicateCandidateId: conflict.id,
        });
      }
    }

    const updated = await this.repo.update(id, organizationId, {
      ...(dto.email ? { email: dto.email.toLowerCase().trim() } : {}),
      ...(dto.firstName ? { firstName: dto.firstName.trim() } : {}),
      ...(dto.lastName ? { lastName: dto.lastName.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() } : {}),
      ...(dto.linkedinUrl !== undefined ? { linkedinUrl: dto.linkedinUrl } : {}),
      ...(dto.githubUrl !== undefined ? { githubUrl: dto.githubUrl } : {}),
      ...(dto.portfolioUrl !== undefined ? { portfolioUrl: dto.portfolioUrl } : {}),
      ...(dto.city !== undefined ? { city: dto.city?.trim() } : {}),
      ...(dto.stateProvince !== undefined ? { stateProvince: dto.stateProvince?.trim() } : {}),
      ...(dto.country !== undefined ? { country: dto.country?.trim() } : {}),
      ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
      ...(dto.isRemote !== undefined ? { isRemote: dto.isRemote } : {}),
      ...(dto.currentTitle !== undefined ? { currentTitle: dto.currentTitle?.trim() } : {}),
      ...(dto.currentCompany !== undefined ? { currentCompany: dto.currentCompany?.trim() } : {}),
      ...(dto.careerStartDate !== undefined
        ? { careerStartDate: dto.careerStartDate ? new Date(dto.careerStartDate) : null }
        : {}),
      ...(dto.summary !== undefined ? { summary: dto.summary?.trim() } : {}),
      ...(dto.salaryExpectationMin !== undefined ? { salaryExpectationMin: dto.salaryExpectationMin } : {}),
      ...(dto.salaryExpectationMax !== undefined ? { salaryExpectationMax: dto.salaryExpectationMax } : {}),
      ...(dto.salaryCurrency !== undefined ? { salaryCurrency: dto.salaryCurrency?.toUpperCase() } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.availabilityStatus ? { availabilityStatus: dto.availabilityStatus } : {}),
      ...(dto.availableFrom !== undefined
        ? { availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null }
        : {}),
      ...(dto.source ? { source: dto.source } : {}),
      ...(dto.sourceDetail !== undefined ? { sourceDetail: dto.sourceDetail } : {}),
      updatedBy: actor.userId,
    });

    this.events.emit(
      EventNames.CANDIDATE_UPDATED,
      new CandidateUpdatedEvent(this.actorContext(actor), {
        candidateId: id,
        changedFields: Object.keys(dto),
      }),
    );

    return toCandidateDetail(updated);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async softDelete(id: string, actor: RequestUser): Promise<void> {
    await this.assertExists(id, actor.organizationId);
    await this.repo.softDelete(id, actor.organizationId, actor.userId);
    this.logger.log({ msg: 'Candidate soft-deleted', candidateId: id, actorId: actor.userId });
    this.events.emit(
      EventNames.CANDIDATE_DELETED,
      new CandidateDeletedEvent(this.actorContext(actor), { candidateId: id }),
    );
  }

  // ── Status transition ─────────────────────────────────────────────────────

  async transitionStatus(
    id: string,
    dto: TransitionCandidateStatusDto,
    actor: RequestUser,
  ): Promise<CandidateDetail> {
    const candidate = await this.assertExists(id, actor.organizationId);
    const fromStatus = candidate.status;
    const toStatus = dto.status;

    this.fsm.validate(CANDIDATE_FSM, fromStatus, toStatus);

    const updated = await this.repo.update(id, actor.organizationId, {
      status: toStatus,
    });

    this.logger.log({ msg: 'Candidate status changed', candidateId: id, fromStatus, toStatus });

    this.events.emit(
      EventNames.CANDIDATE_STATUS_CHANGED,
      new CandidateStatusChangedEvent(this.actorContext(actor), {
        candidateId: id,
        fromStatus,
        toStatus,
      }),
    );

    return toCandidateDetail(updated);
  }

  // ── Skills ────────────────────────────────────────────────────────────────

  async assignSkill(
    candidateId: string,
    dto: AssignSkillDto,
    actor: RequestUser,
  ) {
    await this.assertExists(candidateId, actor.organizationId);

    // Resolve skill: by ID or get-or-create by name
    let skill: Awaited<ReturnType<SkillsService['findById']>>;

    if (dto.skillId) {
      skill = await this.skillsService.findById(dto.skillId);
      if (!skill) throw new NotFoundException(`Skill ${dto.skillId} not found`);
    } else if (dto.skillName) {
      skill = await this.skillsService.getOrCreate(dto.skillName, undefined, actor.organizationId);
    } else {
      throw new BadRequestException('Provide either skillId or skillName');
    }

    // Check if already assigned
    const existing = await this.repo.findCandidateSkill(candidateId, skill.id);

    if (existing) {
      // Update proficiency/years/isPrimary if already assigned
      return this.repo.updateSkill(existing.id, {
        proficiencyLevel: dto.proficiencyLevel ?? existing.proficiencyLevel,
        yearsOfExperience: dto.yearsOfExperience ?? existing.yearsOfExperience,
        isPrimary: dto.isPrimary ?? existing.isPrimary,
      });
    }

    const assigned = await this.repo.assignSkill({
      candidate: { connect: { id: candidateId } },
      skill: { connect: { id: skill.id } },
      proficiencyLevel: dto.proficiencyLevel ?? 'INTERMEDIATE',
      yearsOfExperience: dto.yearsOfExperience,
      isPrimary: dto.isPrimary ?? false,
      assignedBy: actor.userId,
    });

    await this.repo.touchActivityAt(candidateId, actor.organizationId);

    this.events.emit(
      EventNames.CANDIDATE_SKILL_ADDED,
      new CandidateSkillAddedEvent(this.actorContext(actor), {
        candidateId,
        skillId: skill.id,
        skillName: skill.name,
      }),
    );

    return assigned;
  }

  async removeSkill(candidateId: string, skillId: string, actor: RequestUser): Promise<void> {
    await this.assertExists(candidateId, actor.organizationId);
    const existing = await this.repo.findCandidateSkill(candidateId, skillId);
    if (!existing) throw new NotFoundException('Skill assignment not found');
    await this.repo.removeSkill(candidateId, skillId);
    this.events.emit(
      EventNames.CANDIDATE_SKILL_REMOVED,
      new CandidateSkillRemovedEvent(this.actorContext(actor), { candidateId, skillId }),
    );
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  async addNote(
    candidateId: string,
    dto: CreateNoteDto,
    actor: RequestUser,
  ) {
    await this.assertExists(candidateId, actor.organizationId);

    const note = await this.repo.createNote({
      content: dto.content.trim(),
      noteType: dto.noteType ?? NoteType.NOTE,
      authorId: actor.userId,
      authorEmail: actor.email,
      authorName: actor.email, // replaced with full name when User profile is available
      candidateId,
      organizationId: actor.organizationId,
    });

    await this.repo.touchActivityAt(candidateId, actor.organizationId);

    this.events.emit(
      EventNames.CANDIDATE_NOTE_ADDED,
      new CandidateNoteAddedEvent(this.actorContext(actor), {
        candidateId,
        noteId: note.id,
        noteType: note.noteType,
      }),
    );

    return note;
  }

  async getNotes(candidateId: string, actor: RequestUser) {
    await this.assertExists(candidateId, actor.organizationId);
    return this.repo.findNotes(candidateId, actor.organizationId);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async assertExists(id: string, organizationId: string) {
    const candidate = await this.repo.findById(id, organizationId);
    if (!candidate) throw new NotFoundException(`Candidate ${id} not found`);
    return candidate;
  }
}
