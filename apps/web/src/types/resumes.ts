// Mirror of API wire shapes — keep in sync with apps/api/src/modules/resumes/types/resume.types.ts

export type ResumeSource =
  | 'RECRUITER_UPLOAD'
  | 'VENDOR_SUBMISSION'
  | 'API_IMPORT'
  | 'EMAIL_INTAKE';

export type ResumeStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'NEEDS_REVIEW'
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'REJECTED';

export type ResumeAccessAction =
  | 'DOWNLOAD'
  | 'PREVIEW'
  | 'API_FETCH'
  | 'PARSE_READ'
  | 'RETENTION_PURGE';

export interface ResumeVersionView {
  id:              string;
  versionNumber:   number;
  storageProvider: string;
  fileName:        string;
  mimeType:        string;
  sizeBytes:       number;
  sha256:          string;
  pageCount:       number | null;
  uploadedBy:      string;
  uploadedAt:      string;
  supersededAt:    string | null;
  isCurrent:       boolean;
}

export interface ResumeListItem {
  id:             string;
  organizationId: string;
  candidateId:    string;
  intakeBatchId:  string | null;
  source:         ResumeSource;
  status:         ResumeStatus;
  label:          string | null;
  currentVersion: ResumeVersionView | null;
  versionCount:   number;
  createdAt:      string;
  updatedAt:      string;
}

export interface ResumeDetail extends ResumeListItem {
  versions: ResumeVersionView[];
}

export interface ResumeAccessLogView {
  id:        string;
  action:    ResumeAccessAction;
  actorId:   string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata:  Record<string, unknown>;
  createdAt: string;
}

export interface ListResumesParams {
  candidateId?:   string;
  intakeBatchId?: string;
  status?:        ResumeStatus;
  source?:        ResumeSource;
  search?:        string;
  page?:          number;
  limit?:         number;
}

export interface UploadResumeForm {
  file:           File;
  candidateId?:   string;
  firstName?:     string;
  lastName?:      string;
  email?:         string;
  label?:         string;
  intakeBatchId?: string;
}

export interface UpdateResumeDto {
  label?:  string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
}

// ── Status display ──────────────────────────────────────────────────────────

export const RESUME_STATUS_LABELS: Record<ResumeStatus, string> = {
  DRAFT:        'Draft',
  PROCESSING:   'Processing',
  NEEDS_REVIEW: 'Needs review',
  ACTIVE:       'Active',
  ARCHIVED:     'Archived',
  REJECTED:     'Rejected',
};

export const RESUME_SOURCE_LABELS: Record<ResumeSource, string> = {
  RECRUITER_UPLOAD:  'Recruiter upload',
  VENDOR_SUBMISSION: 'Vendor submission',
  API_IMPORT:        'API import',
  EMAIL_INTAKE:      'Email intake',
};
