import * as fs   from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';

import type { EnvConfig } from '../../config';
import {
  type DownloadResult,
  type IStorageProvider,
  type SignedUrlOptions,
  type UploadOptions,
  type UploadResult,
  StorageNotFoundError,
  StorageUploadError,
} from '../storage.interface';

/**
 * LocalStorageProvider — filesystem-backed storage for development.
 *
 * Files are stored under STORAGE_LOCAL_PATH (default: ./uploads) with
 * the same key structure as S3: orgs/<orgId>/resumes/<candidateId>/<file>.
 *
 * Signed URL simulation:
 *   Real S3 signed URLs embed the AWS signature in the URL and are validated
 *   by S3. Locally, we simulate this with an HMAC token that the API's
 *   /files/:token endpoint validates. This lets frontend code use the same
 *   signedUrl pattern in dev as it will in production.
 *   NOTE: The /files proxy endpoint is NOT implemented in this phase —
 *   it will be added in Phase 2 when resume downloads are needed.
 *
 * NOT suitable for production:
 *   - No redundancy (single disk)
 *   - No CDN
 *   - No access control beyond filesystem permissions
 *   - "Signed URLs" are app-validated, not storage-validated
 *
 * Switching to S3:
 *   Set STORAGE_DRIVER=s3 in env. StorageModule will inject S3StorageProvider
 *   instead. All call sites remain identical.
 */
@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  readonly providerName = 'local';
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly basePath: string;
  private readonly signedUrlSecret: string;
  private readonly appUrl: string;

  constructor(config: ConfigService<EnvConfig, true>) {
    this.basePath = path.resolve(config.get('STORAGE_LOCAL_PATH', { infer: true }));
    this.signedUrlSecret = config.get('JWT_SECRET', { infer: true });
    this.appUrl = `http://localhost:${config.get('PORT', { infer: true })}`;
  }

  async upload(key: string, data: Buffer, options?: UploadOptions): Promise<UploadResult> {
    const filePath = this.keyToPath(key);

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, data);
    } catch (err: unknown) {
      throw new StorageUploadError(key, this.providerName, err);
    }

    const result: UploadResult = {
      key,
      contentType: options?.contentType ?? 'application/octet-stream',
      sizeBytes:   data.length,
      storedAt:    new Date().toISOString(),
      provider:    this.providerName,
    };

    this.logger.debug({ key, sizeBytes: result.sizeBytes }, 'File uploaded');
    return result;
  }

  async download(key: string): Promise<DownloadResult> {
    const filePath = this.keyToPath(key);

    try {
      const data  = await fs.readFile(filePath);
      const stats = await fs.stat(filePath);
      return { data, contentType: 'application/octet-stream', sizeBytes: stats.size };
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StorageNotFoundError(key, this.providerName);
      }
      throw err;
    }
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const expiresIn = options?.expiresInSeconds ?? 900;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    // HMAC-SHA256 token: prevents key enumeration / tampering
    const payload = `${key}:${expiresAt}`;
    const token   = crypto
      .createHmac('sha256', this.signedUrlSecret)
      .update(payload)
      .digest('hex');

    const params = new URLSearchParams({ key, exp: String(expiresAt), sig: token });
    return `${this.appUrl}/api/v1/files/download?${params.toString()}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.keyToPath(key);
    try {
      await fs.unlink(filePath);
      this.logger.debug({ key }, 'File deleted');
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      // Silently succeed if file doesn't exist (idempotent)
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.keyToPath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /** Convert storage key to absolute filesystem path. */
  private keyToPath(key: string): string {
    // Prevent path traversal attacks
    const normalised = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.basePath, normalised);
  }
}
