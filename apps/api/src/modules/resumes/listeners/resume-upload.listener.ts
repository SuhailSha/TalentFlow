import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventNames } from '../../../common/events/event-names.constant';
import { ParsingJobsService } from '../parsing-jobs.service';

interface ResumeUploadRequestedPayload {
  resumeId:        string;
  versionId:       string | null;
  organizationId:  string;
  actorId:         string;
  candidateId:     string;
  draftCreated:    boolean;
  requestId?:      string;
}

/**
 * Auto-enqueue a ParsingJob whenever a resume is uploaded.
 *
 * Wired via @nestjs/event-emitter's wildcard listener pattern. The R1 upload
 * code already emits RESUME_UPLOAD_REQUESTED; this listener is the R2 bridge
 * that turns those events into parsing work.
 *
 * Failure here MUST NOT block the upload response — exceptions are swallowed
 * with a warning so the resume row stays in the DB and an operator can
 * manually reparse later via POST /resumes/:id/versions/:vid/reparse.
 */
@Injectable()
export class ResumeUploadListener {
  private readonly logger = new Logger(ResumeUploadListener.name);

  constructor(private readonly parsing: ParsingJobsService) {}

  @OnEvent(EventNames.RESUME_UPLOAD_REQUESTED, { async: true })
  async onUpload(payload: ResumeUploadRequestedPayload): Promise<void> {
    if (!payload?.versionId) return;
    try {
      await this.parsing.enqueue({
        resumeVersionId: payload.versionId,
        organizationId:  payload.organizationId,
      });
      this.logger.debug({ resumeId: payload.resumeId, versionId: payload.versionId }, 'Parsing enqueued post-upload');
    } catch (e: unknown) {
      this.logger.warn(
        { err: (e as Error).message, resumeId: payload.resumeId, versionId: payload.versionId },
        'Failed to enqueue parse — recruiter can reparse manually',
      );
    }
  }
}
