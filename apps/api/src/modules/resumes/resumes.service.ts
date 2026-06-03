import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

import type { RequestUser } from '../../auth/types/request-user.interface';
import { AppContextService } from '../../common/context/app-context.service';
import { EventNames } from '../../common/events/event-names.constant';
import { StorageService, StorageKeys } from '../../storage';
import { ResumesRepository } from './resumes.repository';
import type { ListResumesDto } from './dto/list-resumes.dto';
import type { UpdateResumeDto } from './dto/update-resume.dto';
import type { UploadResumeDto } from './dto/upload-resume.dto';
import type { CreateIntakeBatchDto } from './dto/create-intake-batch.dto';
import {
  toIntakeBatchView,
  toResumeDetail,
  toResumeListItem,
  type ResumeDetail,
  type ResumeIntakeBatchView,
  type ResumeListItem,
} from './types/resume.types';

/**
 * ResumesService — Phase C R1: upload + retrieve + download.
 *
 * Responsibilities:
 *   1. Validate tenant ownership of any referenced candidate / batch.
 *   2. Create a draft candidate when the recruiter doesn't supply candidateId.
 *   3. Compute sha256, dedupe via existing version match.
 *   4. Hand the file to StorageService (which enforces MIME + size).
 *   5. Persist Resume + ResumeVersion in a single transaction.
 *   6. Emit lifecycle events for downstream listeners (R2+ parsing pipeline).
 *
 * NOT in scope for R1:
 *   - parsing, extraction, review, merge, AI features
 *   - virus scanning beyond the existing StorageService MIME/size checks
 *   - presigned uploads (proxied only)
 */
@Injectable()
export class ResumesService {
  constructor(
    private readonly repo:    ResumesRepository,
    private readonly storage: StorageService,
    private readonly events:  EventEmitter2,
    private readonly ctx:     AppContextService,
  ) {}

  // ── List + detail ─────────────────────────────────────────────────────────

  async findMany(
    organizationId: string,
    dto: ListResumesDto,
  ): Promise<{ resumes: ResumeListItem[]; total: number }> {
    const { resumes, total } = await this.repo.findMany(organizationId, dto);
    return { resumes: resumes.map(toResumeListItem), total };
  }

  async findById(id: string, organizationId: string): Promise<ResumeDetail> {
    const r = await this.repo.findById(id, organizationId);
    if (!r) throw new NotFoundException(`Resume ${id} not found`);
    return toResumeDetail(r);
  }

  // ── Upload (proxied) ──────────────────────────────────────────────────────

  /**
   * Proxied upload: API receives the file buffer, validates MIME + size via
   * StorageService, writes through the active StorageProvider, and persists
   * Resume + ResumeVersion in a single DB transaction.
   *
   * Either `candidateId` is provided (bind to existing) OR a draft candidate
   * is created from `firstName`/`lastName`/`email` (per architecture decision).
   */
  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    dto: UploadResumeDto,
    actor: RequestUser,
  ): Promise<{ resume: ResumeDetail; draftCandidateCreated: boolean }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file uploaded');
    }

    // ── 1. Resolve candidate (existing OR create draft) ────────────────────
    let candidateId: string;
    let draftCreated = false;

    if (dto.candidateId) {
      const ok = await this.repo.candidateBelongsToOrg(dto.candidateId, actor.organizationId);
      if (!ok) {
        throw new NotFoundException(`Candidate ${dto.candidateId} not found in this organization`);
      }
      candidateId = dto.candidateId;
    } else {
      if (!dto.firstName || !dto.lastName || !dto.email) {
        throw new BadRequestException(
          'firstName, lastName, and email are required when candidateId is not provided',
        );
      }
      const email = dto.email.toLowerCase().trim();

      const existing = await this.repo.findCandidateByEmail(email, actor.organizationId);
      if (existing) {
        throw new ConflictException({
          message: `A candidate with email "${email}" already exists. Use candidateId instead.`,
          code: 'DUPLICATE_CANDIDATE_EMAIL',
          duplicateCandidateId: existing.id,
        });
      }
      const candidate = await this.repo.createDraftCandidate({
        organizationId: actor.organizationId,
        firstName:      dto.firstName.trim(),
        lastName:       dto.lastName.trim(),
        email,
        createdBy:      actor.userId,
      });
      candidateId   = candidate.id;
      draftCreated  = true;
    }

    // ── 2. Validate batch (if provided) ────────────────────────────────────
    if (dto.intakeBatchId) {
      const batch = await this.repo.findBatchById(dto.intakeBatchId, actor.organizationId);
      if (!batch) throw new NotFoundException(`Intake batch ${dto.intakeBatchId} not found`);
      if (batch.status === 'CLOSED') {
        throw new BadRequestException(`Intake batch ${dto.intakeBatchId} is closed`);
      }
    }

    // ── 3. Compute sha256 (used for storage key and dedup) ─────────────────
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // ── 4. Build a content-addressed storage key under the org prefix ──────
    const ext      = this.guessExtension(file.originalname, file.mimetype);
    const filename = `${sha256}${ext ? `.${ext}` : ''}`;
    const key      = StorageKeys.resume(actor.organizationId, candidateId, filename);

    // ── 5. Hand to StorageService — enforces MIME + size validation ────────
    const stored = await this.storage.uploadResume(key, file.buffer, file.mimetype);

    // ── 6. Persist Resume + initial ResumeVersion in one transaction ───────
    const resume = await this.repo.createResumeWithVersion({
      organizationId:  actor.organizationId,
      candidateId,
      intakeBatchId:   dto.intakeBatchId ?? null,
      label:           dto.label ?? null,
      storageProvider: stored.provider,
      storageKey:      stored.key,
      fileName:        file.originalname,
      mimeType:        stored.contentType,
      sizeBytes:       stored.sizeBytes,
      sha256,
      uploadedBy:      actor.userId,
    });

    // ── 7. Emit lifecycle event (listener-empty in R1; R2+ parsers attach) ─
    this.events.emit(EventNames.RESUME_UPLOAD_REQUESTED, {
      resumeId:       resume.id,
      versionId:      resume.currentVersionId,
      organizationId: actor.organizationId,
      actorId:        actor.userId,
      candidateId,
      draftCreated,
      requestId:      this.ctx.requestId,
    });

    if (!resume) throw new Error('Failed to load resume after creation');
    return {
      resume: toResumeDetail(resume),
      draftCandidateCreated: draftCreated,
    };
  }

  /**
   * Upload a new version of an existing resume. Same validation surface; new
   * versionNumber generated under row lock. Previous current version's
   * supersededAt is stamped.
   */
  async uploadNewVersion(
    resumeId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    actor: RequestUser,
  ): Promise<ResumeDetail> {
    if (!file?.buffer?.length) throw new BadRequestException('No file uploaded');

    const resume = await this.repo.findById(resumeId, actor.organizationId);
    if (!resume) throw new NotFoundException(`Resume ${resumeId} not found`);

    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Dedup: same bytes for the same resume → return as-is (no new version).
    const dup = await this.repo.findVersionBySha(resumeId, sha256, actor.organizationId);
    if (dup) {
      throw new ConflictException({
        message: 'This file is identical to an existing version of this resume.',
        code: 'DUPLICATE_RESUME_VERSION',
        existingVersionId: dup.id,
      });
    }

    const ext      = this.guessExtension(file.originalname, file.mimetype);
    const filename = `${sha256}${ext ? `.${ext}` : ''}`;
    const key      = StorageKeys.resume(actor.organizationId, resume.candidateId, filename);

    const stored = await this.storage.uploadResume(key, file.buffer, file.mimetype);

    const updated = await this.repo.addVersion({
      resumeId,
      organizationId:  actor.organizationId,
      storageProvider: stored.provider,
      storageKey:      stored.key,
      fileName:        file.originalname,
      mimeType:        stored.contentType,
      sizeBytes:       stored.sizeBytes,
      sha256,
      uploadedBy:      actor.userId,
    });

    if (!updated) throw new Error('Failed to load resume after version add');

    this.events.emit(EventNames.RESUME_UPLOAD_REQUESTED, {
      resumeId:       updated.id,
      versionId:      updated.currentVersionId,
      organizationId: actor.organizationId,
      actorId:        actor.userId,
      candidateId:    updated.candidateId,
      draftCreated:   false,
      requestId:      this.ctx.requestId,
    });

    return toResumeDetail(updated);
  }

  // ── Update + delete ───────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateResumeDto,
    actor: RequestUser,
  ): Promise<ResumeDetail> {
    const existing = await this.repo.findById(id, actor.organizationId);
    if (!existing) throw new NotFoundException(`Resume ${id} not found`);

    // R1 limits status transitions to recruiter archive/restore. PROCESSING /
    // NEEDS_REVIEW / REJECTED are managed by R2+ pipelines.
    if (dto.status && dto.status !== 'ACTIVE' && dto.status !== 'ARCHIVED' && dto.status !== 'DRAFT') {
      throw new ForbiddenException(
        `Status transition to ${dto.status} is not allowed in R1; only ACTIVE/ARCHIVED/DRAFT.`,
      );
    }

    const updated = await this.repo.update(
      id,
      actor.organizationId,
      { label: dto.label, status: dto.status },
      actor.userId,
    );
    if (!updated) throw new NotFoundException(`Resume ${id} not found`);
    return toResumeDetail(updated);
  }

  async softDelete(id: string, actor: RequestUser): Promise<void> {
    const existing = await this.repo.findById(id, actor.organizationId);
    if (!existing) throw new NotFoundException(`Resume ${id} not found`);
    await this.repo.softDelete(id, actor.organizationId, actor.userId);
  }

  // ── Download (audit-logged) ───────────────────────────────────────────────

  async download(
    resumeId: string,
    versionId: string,
    actor: RequestUser,
    request: { ip?: string; userAgent?: string },
  ): Promise<{ data: Buffer; contentType: string; fileName: string }> {
    // ─── Security-sensitive operation (TF-PRE-10) ──────────────────────────
    // This method returns raw resume bytes. Three guards apply:
    //   1. Repository query is tenant-scoped via findVersionById(versionId, orgId).
    //      A version belonging to another tenant returns null and we 404.
    //   2. Parent resume id must match, preventing version-id smuggling
    //      across different resumes within the same tenant.
    //   3. Storage key prefix is asserted to start with the tenant id, a
    //      defense-in-depth check against storage-layer misconfiguration
    //      (e.g. a backfill that produced cross-tenant keys).
    // The access is always recorded via repo.logAccess regardless of caller
    // success; downstream OpenTelemetry spans will tag the tenant + actor
    // for compliance correlation. See ADR-002 §application-layer guard.

    const version = await this.repo.findVersionById(versionId, actor.organizationId);
    if (!version || version.resumeId !== resumeId) {
      throw new NotFoundException(`Resume version ${versionId} not found on resume ${resumeId}`);
    }

    // Defense in depth: storage keys are produced by StorageKeys.resume()
    // and must begin with the tenant identifier. A mismatch indicates either
    // a corrupted DB row or a misconfigured storage migration — either way,
    // refuse to serve the bytes rather than risk cross-tenant leakage.
    if (!version.storageKey.startsWith(`${actor.organizationId}/`)) {
      throw new NotFoundException(`Resume version ${versionId} not found on resume ${resumeId}`);
    }

    const download = await this.storage.download(version.storageKey);

    await this.repo.logAccess({
      organizationId:  actor.organizationId,
      resumeVersionId: version.id,
      actorId:         actor.userId,
      action:          'DOWNLOAD',
      ipAddress:       request.ip ?? null,
      userAgent:       request.userAgent ?? null,
      requestId:       this.ctx.requestId,
      metadata:        { fileName: version.fileName },
    });

    return {
      data:        download.data,
      contentType: download.contentType,
      fileName:    version.fileName,
    };
  }

  async getAccessLog(versionId: string, organizationId: string) {
    const version = await this.repo.findVersionById(versionId, organizationId);
    if (!version) throw new NotFoundException(`Resume version ${versionId} not found`);
    return this.repo.findAccessLog(organizationId, versionId);
  }

  // ── Intake batches ────────────────────────────────────────────────────────

  async createBatch(dto: CreateIntakeBatchDto, actor: RequestUser): Promise<ResumeIntakeBatchView> {
    const batch = await this.repo.createIntakeBatch({
      organizationId:  actor.organizationId,
      label:           dto.label.trim(),
      sourceVendorId:  dto.sourceVendorId ?? null,
      createdBy:       actor.userId,
    });
    return toIntakeBatchView(batch);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private guessExtension(fileName: string, mimeType: string): string | null {
    const fromName = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? null : null;
    if (fromName && fromName.length <= 5) return fromName;
    switch (mimeType) {
      case 'application/pdf': return 'pdf';
      case 'application/msword': return 'doc';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return 'docx';
      case 'text/plain': return 'txt';
      case 'application/rtf': return 'rtf';
      default: return null;
    }
  }
}
