/** DI injection token for the active IStorageProvider implementation. */
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/**
 * Key prefix builder — enforces a consistent key namespace.
 *
 * Structure:  <orgId>/<entity>/<entityId>/<filename>
 *
 * Examples:
 *   orgs/abc-123/resumes/cand-456/resume_v1.pdf
 *   orgs/abc-123/documents/cand-456/offer_letter.pdf
 *   orgs/abc-123/avatars/user-789/avatar.jpg
 *
 * Why org-prefixed? Enables:
 *   - S3 prefix-based IAM policies per org (enterprise data isolation)
 *   - Cost allocation tags by org
 *   - Bulk deletion on org offboarding: deleteByPrefix(orgId)
 */
export const StorageKeys = {
  resume: (orgId: string, candidateId: string, filename: string) =>
    `orgs/${orgId}/resumes/${candidateId}/${filename}`,

  document: (orgId: string, candidateId: string, filename: string) =>
    `orgs/${orgId}/documents/${candidateId}/${filename}`,

  avatar: (orgId: string, userId: string, filename: string) =>
    `orgs/${orgId}/avatars/${userId}/${filename}`,

  jobAttachment: (orgId: string, jobId: string, filename: string) =>
    `orgs/${orgId}/jobs/${jobId}/${filename}`,

  reportExport: (orgId: string, reportId: string, filename: string) =>
    `orgs/${orgId}/reports/${reportId}/${filename}`,
};

/**
 * Allowed MIME types for resume uploads.
 * Virus-scanned before processing; additional validation in Phase 2.
 */
export const ALLOWED_RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
]);

/**
 * Max resume file size (bytes). Checked BEFORE uploading to storage.
 * Configurable via STORAGE_MAX_FILE_SIZE_MB env var.
 */
export const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
