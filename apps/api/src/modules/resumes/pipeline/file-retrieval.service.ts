import { Injectable } from '@nestjs/common';

import { AppContextService } from '../../../common/context/app-context.service';
import { StorageService } from '../../../storage';
import { ResumesRepository } from '../resumes.repository';
import { ParsingError } from '../parsers/parser-errors';

export interface FileRetrievalResult {
  bytes:       Buffer;
  mimeType:    string;
  fileName:    string;
  sizeBytes:   number;
  sha256:      string;
  storageKey:  string;
}

/**
 * Stage 1 of the parsing pipeline.
 *
 * Loads the file bytes for a given ResumeVersion via the existing
 * StorageProvider abstraction, and writes a PARSE_READ entry to the audit log
 * so every parse attempt is traceable.
 *
 * NOT in this stage:
 *   - text extraction (Stage 2)
 *   - provider invocation (Stage 3)
 */
@Injectable()
export class FileRetrievalService {
  constructor(
    private readonly storage: StorageService,
    private readonly resumes: ResumesRepository,
    private readonly ctx:     AppContextService,
  ) {}

  async fetch(versionId: string, organizationId: string, actorId: string | null): Promise<FileRetrievalResult> {
    const version = await this.resumes.findVersionById(versionId, organizationId);
    if (!version) {
      throw new ParsingError('permanent', `Resume version ${versionId} not found`);
    }

    const dl = await this.storage.download(version.storageKey);

    await this.resumes.logAccess({
      organizationId,
      resumeVersionId: version.id,
      actorId,
      action:          'PARSE_READ',
      ipAddress:       null,
      userAgent:       'ResumeParseWorker',
      requestId:       this.ctx.requestId,
      metadata:        { storageKey: version.storageKey },
    });

    return {
      bytes:      dl.data,
      mimeType:   version.mimeType,
      fileName:   version.fileName,
      sizeBytes:  Number(version.sizeBytes),
      sha256:     version.sha256,
      storageKey: version.storageKey,
    };
  }

}
