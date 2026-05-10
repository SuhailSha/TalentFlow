/**
 * IStorageProvider — the contract all storage backends must implement.
 *
 * Design principles:
 *
 *  1. Provider-agnostic keys:
 *     Files are addressed by a string `key` (e.g. "orgs/abc/resumes/xyz.pdf").
 *     The key format is determined by the application layer, NOT the provider.
 *     This allows switching from local → S3 → GCS without changing call sites.
 *
 *  2. Signed URLs:
 *     Direct file downloads should NEVER go through the API process for large
 *     files (resumes, documents). The client receives a time-limited signed URL
 *     and downloads directly from the storage backend. This is a critical
 *     scalability requirement — keeps the API stateless and small.
 *
 *  3. Metadata:
 *     Providers must return a UploadResult with the stored key, content type,
 *     and size. The application layer persists these to the DB.
 *
 *  4. Error handling:
 *     Providers throw typed StorageError subclasses. Callers catch
 *     StorageNotFoundError, StorageQuotaError, etc. — not raw S3/FS errors.
 */

export interface UploadOptions {
  /** Override the content-type stored with the file. Detected from buffer if omitted. */
  contentType?: string;
  /** Additional provider-specific metadata (S3 object tags, GCS custom metadata). */
  metadata?: Record<string, string>;
  /** If true, the file is publicly readable without a signed URL (not recommended for PII). */
  isPublic?: boolean;
}

export interface UploadResult {
  /** The storage key under which the file was stored. */
  key: string;
  /** Content-type as stored. */
  contentType: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** ISO timestamp of when the file was stored. */
  storedAt: string;
  /** Provider name for debugging. */
  provider: string;
}

export interface DownloadResult {
  data: Buffer;
  contentType: string;
  sizeBytes: number;
}

export interface SignedUrlOptions {
  /** Expiry in seconds from now. Default: 900 (15 minutes). */
  expiresInSeconds?: number;
  /** Override content-disposition header (e.g. force download with a filename). */
  contentDisposition?: string;
}

export interface IStorageProvider {
  /** Human-readable provider name (e.g. "local", "s3", "gcs"). */
  readonly providerName: string;

  /**
   * Upload a file from an in-memory Buffer.
   * The `key` must be globally unique within the storage backend.
   * If a file already exists at `key`, it is overwritten.
   */
  upload(key: string, data: Buffer, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Download a file into memory.
   * Throws StorageNotFoundError if the key does not exist.
   */
  download(key: string): Promise<DownloadResult>;

  /**
   * Generate a time-limited pre-signed URL for direct client download.
   * The URL bypasses the API for the download itself (S3/GCS direct).
   * LocalStorageProvider returns an API-proxied URL instead.
   */
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;

  /**
   * Permanently delete a file.
   * Silently succeeds if the key does not exist (idempotent).
   */
  delete(key: string): Promise<void>;

  /**
   * Check whether a key exists.
   * Use sparingly — prefer upload/download with error handling.
   */
  exists(key: string): Promise<boolean>;
}

// ── Error types ───────────────────────────────────────────────────────────────

export class StorageError extends Error {
  constructor(message: string, public readonly provider: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export class StorageNotFoundError extends StorageError {
  constructor(key: string, provider: string) {
    super(`File not found: ${key}`, provider);
    this.name = 'StorageNotFoundError';
  }
}

export class StorageUploadError extends StorageError {
  constructor(key: string, provider: string, cause?: unknown) {
    super(`Upload failed for key: ${key}. ${cause instanceof Error ? cause.message : ''}`, provider);
    this.name = 'StorageUploadError';
  }
}

export class StorageQuotaError extends StorageError {
  constructor(provider: string) {
    super('Storage quota exceeded', provider);
    this.name = 'StorageQuotaError';
  }
}
