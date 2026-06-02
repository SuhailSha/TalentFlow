import { Injectable } from '@nestjs/common';
import type { Prisma, ResumeAccessAction } from '@repo/database';

import { PrismaService } from '../../database';
import { toSkip } from '../../common/helpers/response.helper';
import type { ListResumesDto } from './dto/list-resumes.dto';

const RESUME_DEFAULT_INCLUDE = {
  versions:       true,
  currentVersion: true,
} satisfies Prisma.ResumeInclude;

@Injectable()
export class ResumesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async findMany(organizationId: string, dto: ListResumesDto) {
    const where: Prisma.ResumeWhereInput = {
      organizationId,
      deletedAt: null,
    };
    if (dto.candidateId)   where.candidateId   = dto.candidateId;
    if (dto.intakeBatchId) where.intakeBatchId = dto.intakeBatchId;
    if (dto.status)        where.status        = dto.status;
    if (dto.source)        where.source        = dto.source;
    if (dto.search) {
      where.label = { contains: dto.search, mode: 'insensitive' };
    }

    const skip = toSkip(dto.page, dto.limit);

    const [resumes, total] = await this.prisma.$transaction([
      this.prisma.resume.findMany({
        where,
        include: RESUME_DEFAULT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: dto.limit,
      }),
      this.prisma.resume.count({ where }),
    ]);

    return { resumes, total };
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findById(id: string, organizationId: string) {
    return this.prisma.resume.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: RESUME_DEFAULT_INCLUDE,
    });
  }

  // ── Version lookup ────────────────────────────────────────────────────────

  async findVersionById(versionId: string, organizationId: string) {
    return this.prisma.resumeVersion.findFirst({
      where: { id: versionId, organizationId },
      include: { resume: true },
    });
  }

  /**
   * Look up an existing version of *this* resume by file sha256. Used to short
   * circuit duplicate uploads — same bytes, same resume → no new version.
   */
  async findVersionBySha(resumeId: string, sha256: string, organizationId: string) {
    return this.prisma.resumeVersion.findFirst({
      where: { resumeId, sha256, organizationId },
    });
  }

  // ── Create resume + initial version (single transaction) ─────────────────

  async createResumeWithVersion(input: {
    organizationId:  string;
    candidateId:     string;
    intakeBatchId?:  string | null;
    label?:          string | null;
    storageProvider: string;
    storageKey:      string;
    fileName:        string;
    mimeType:        string;
    sizeBytes:       number;
    sha256:          string;
    uploadedBy:      string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const resume = await tx.resume.create({
        data: {
          organizationId: input.organizationId,
          candidateId:    input.candidateId,
          intakeBatchId:  input.intakeBatchId ?? null,
          label:          input.label ?? null,
          source:         'RECRUITER_UPLOAD',
          status:         'DRAFT',
          createdBy:      input.uploadedBy,
          updatedBy:      input.uploadedBy,
        },
      });
      const version = await tx.resumeVersion.create({
        data: {
          resumeId:        resume.id,
          organizationId:  input.organizationId,
          versionNumber:   1,
          storageProvider: input.storageProvider,
          storageKey:      input.storageKey,
          fileName:        input.fileName,
          mimeType:        input.mimeType,
          sizeBytes:       BigInt(input.sizeBytes),
          sha256:          input.sha256,
          uploadedBy:      input.uploadedBy,
        },
      });
      const updated = await tx.resume.update({
        where: { id: resume.id },
        data:  { currentVersionId: version.id },
        include: RESUME_DEFAULT_INCLUDE,
      });
      return updated;
    });
  }

  // ── Add new version to existing resume ────────────────────────────────────

  async addVersion(input: {
    resumeId:        string;
    organizationId:  string;
    storageProvider: string;
    storageKey:      string;
    fileName:        string;
    mimeType:        string;
    sizeBytes:       number;
    sha256:          string;
    uploadedBy:      string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Lock the resume row so versionNumber generation is race-free.
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM resumes
        WHERE id = ${input.resumeId}::uuid
          AND organization_id = ${input.organizationId}::uuid
          AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new Error('Resume not found or unavailable for version add');
      }
      const last = await tx.resumeVersion.findFirst({
        where:   { resumeId: input.resumeId },
        orderBy: { versionNumber: 'desc' },
        select:  { id: true, versionNumber: true },
      });
      const nextNumber = (last?.versionNumber ?? 0) + 1;

      const version = await tx.resumeVersion.create({
        data: {
          resumeId:        input.resumeId,
          organizationId:  input.organizationId,
          versionNumber:   nextNumber,
          storageProvider: input.storageProvider,
          storageKey:      input.storageKey,
          fileName:        input.fileName,
          mimeType:        input.mimeType,
          sizeBytes:       BigInt(input.sizeBytes),
          sha256:          input.sha256,
          uploadedBy:      input.uploadedBy,
        },
      });

      // Mark previous current version as superseded
      if (last) {
        await tx.resumeVersion.update({
          where: { id: last.id },
          data:  { supersededAt: new Date() },
        });
      }

      const updated = await tx.resume.update({
        where:  { id: input.resumeId },
        data:   { currentVersionId: version.id, updatedBy: input.uploadedBy },
        include: RESUME_DEFAULT_INCLUDE,
      });
      return updated;
    });
  }

  // ── Updates ───────────────────────────────────────────────────────────────

  async update(
    id: string,
    organizationId: string,
    data: Prisma.ResumeUpdateInput,
    actorId: string,
  ) {
    await this.prisma.resume.updateMany({
      where: { id, organizationId, deletedAt: null },
      data:  { ...data, updatedBy: actorId },
    });
    return this.findById(id, organizationId);
  }

  async softDelete(id: string, organizationId: string, actorId: string) {
    await this.prisma.resume.updateMany({
      where: { id, organizationId, deletedAt: null },
      data:  { deletedAt: new Date(), deletedBy: actorId, status: 'ARCHIVED' },
    });
  }

  // ── Access log ────────────────────────────────────────────────────────────

  async logAccess(input: {
    organizationId:  string;
    resumeVersionId: string;
    actorId:         string | null;
    action:          ResumeAccessAction;
    ipAddress:       string | null;
    userAgent:       string | null;
    requestId:       string | null;
    metadata?:       Prisma.InputJsonValue;
  }) {
    await this.prisma.resumeAccessLog.create({
      data: {
        organizationId:  input.organizationId,
        resumeVersionId: input.resumeVersionId,
        actorId:         input.actorId,
        action:          input.action,
        ipAddress:       input.ipAddress,
        userAgent:       input.userAgent,
        requestId:       input.requestId,
        metadata:        input.metadata ?? {},
      },
    });
  }

  async findAccessLog(organizationId: string, resumeVersionId: string, limit = 50) {
    return this.prisma.resumeAccessLog.findMany({
      where:   { organizationId, resumeVersionId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
  }

  // ── Candidate-tenant validation ───────────────────────────────────────────

  async candidateBelongsToOrg(candidateId: string, organizationId: string): Promise<boolean> {
    const c = await this.prisma.candidate.findFirst({
      where: { id: candidateId, organizationId, deletedAt: null },
      select: { id: true },
    });
    return !!c;
  }

  async findCandidateByEmail(email: string, organizationId: string) {
    return this.prisma.candidate.findFirst({
      where: { email, organizationId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, status: true },
    });
  }

  /** Used only for draft-candidate creation during upload. */
  async createDraftCandidate(input: {
    organizationId: string;
    firstName:      string;
    lastName:       string;
    email:          string;
    createdBy:      string;
  }) {
    return this.prisma.candidate.create({
      data: {
        organizationId:  input.organizationId,
        firstName:       input.firstName,
        lastName:        input.lastName,
        email:           input.email,
        status:          'DRAFT',
        source:          'MANUAL',
        createdBy:       input.createdBy,
        updatedBy:       input.createdBy,
        lastActivityAt:  new Date(),
      },
    });
  }

  // ── Intake batches ────────────────────────────────────────────────────────

  async createIntakeBatch(input: {
    organizationId: string;
    label:          string;
    sourceVendorId?: string | null;
    createdBy:      string;
  }) {
    return this.prisma.resumeIntakeBatch.create({
      data: {
        organizationId:  input.organizationId,
        label:           input.label,
        sourceVendorId:  input.sourceVendorId ?? null,
        createdBy:       input.createdBy,
      },
      include: { _count: { select: { resumes: true } } },
    });
  }

  async findBatchById(id: string, organizationId: string) {
    return this.prisma.resumeIntakeBatch.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { resumes: true } } },
    });
  }
}
