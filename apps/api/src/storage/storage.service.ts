import { Inject, Injectable, Logger, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvConfig } from '../config';
import { STORAGE_PROVIDER, ALLOWED_RESUME_MIME_TYPES, DEFAULT_MAX_FILE_SIZE_BYTES } from './storage.constants';
import type {
  IStorageProvider,
  SignedUrlOptions,
  UploadOptions,
  UploadResult,
  DownloadResult,
} from './storage.interface';

/**
 * StorageService — the application-layer facade over IStorageProvider.
 *
 * Responsibilities:
 *   1. File type validation (MIME whitelist) — before any write to storage.
 *   2. File size enforcement — before reading the full buffer.
 *   3. Key generation — delegates to StorageKeys helpers.
 *   4. Audit logging integration (in Phase 2 — placeholder comments below).
 *
 * Services inject StorageService, never IStorageProvider directly.
 * This keeps the provider swap (local → S3) invisible to business logic.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly maxFileSizeBytes: number;

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly provider: IStorageProvider,
    config: ConfigService<EnvConfig, true>,
  ) {
    const maxMb = config.get('STORAGE_MAX_FILE_SIZE_MB', { infer: true });
    this.maxFileSizeBytes = maxMb * 1024 * 1024;
    this.logger.log(`Storage provider: ${provider.providerName} (max ${maxMb} MB)`);
  }

  get providerName(): string {
    return this.provider.providerName;
  }

  /**
   * Upload a resume file with validation.
   * Validates MIME type and file size before writing.
   */
  async uploadResume(
    key: string,
    data: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    this.validateMimeType(contentType, ALLOWED_RESUME_MIME_TYPES);
    this.validateFileSize(data.length);
    return this.provider.upload(key, data, { contentType });
  }

  /**
   * Generic upload — for documents, avatars, exports.
   * Callers are responsible for their own MIME validation.
   */
  async upload(key: string, data: Buffer, options?: UploadOptions): Promise<UploadResult> {
    this.validateFileSize(data.length);
    return this.provider.upload(key, data, options);
  }

  async download(key: string): Promise<DownloadResult> {
    return this.provider.download(key);
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    return this.provider.getSignedUrl(key, options);
  }

  async delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  private validateMimeType(contentType: string, allowed: Set<string>): void {
    // Strip charset and boundary params: "application/pdf; charset=utf-8" → "application/pdf"
    const mime = (contentType.split(';')[0] ?? contentType).trim().toLowerCase();
    if (!allowed.has(mime)) {
      throw new UnsupportedMediaTypeException(
        `File type "${mime}" is not allowed. Accepted types: ${[...allowed].join(', ')}`,
      );
    }
  }

  private validateFileSize(sizeBytes: number): void {
    const maxBytes = this.maxFileSizeBytes || DEFAULT_MAX_FILE_SIZE_BYTES;
    if (sizeBytes > maxBytes) {
      throw new PayloadTooLargeException(
        `File size ${(sizeBytes / 1024 / 1024).toFixed(1)} MB exceeds the ${(maxBytes / 1024 / 1024).toFixed(0)} MB limit`,
      );
    }
  }
}
