import type {
  Resume,
  ResumeAccessAction,
  ResumeIntakeBatch,
  ResumeSource,
  ResumeStatus,
  ResumeVersion,
} from '@repo/database';

// ── Wire types — what the API returns to the web ────────────────────────────

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
  id:                 string;
  organizationId:     string;
  candidateId:        string;
  intakeBatchId:      string | null;
  source:             ResumeSource;
  status:             ResumeStatus;
  label:              string | null;
  currentVersion:     ResumeVersionView | null;
  versionCount:       number;
  createdAt:          string;
  updatedAt:          string;
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

// ── Mappers — DB row → wire shape ────────────────────────────────────────────

type ResumeWithVersions = Resume & {
  versions: ResumeVersion[];
  currentVersion: ResumeVersion | null;
};

function toVersionView(v: ResumeVersion, currentVersionId: string | null): ResumeVersionView {
  return {
    id:              v.id,
    versionNumber:   v.versionNumber,
    storageProvider: v.storageProvider,
    fileName:        v.fileName,
    mimeType:        v.mimeType,
    sizeBytes:       Number(v.sizeBytes),
    sha256:          v.sha256,
    pageCount:       v.pageCount,
    uploadedBy:      v.uploadedBy,
    uploadedAt:      v.uploadedAt.toISOString(),
    supersededAt:    v.supersededAt?.toISOString() ?? null,
    isCurrent:       v.id === currentVersionId,
  };
}

export function toResumeListItem(r: ResumeWithVersions): ResumeListItem {
  return {
    id:             r.id,
    organizationId: r.organizationId,
    candidateId:    r.candidateId,
    intakeBatchId:  r.intakeBatchId,
    source:         r.source,
    status:         r.status,
    label:          r.label,
    currentVersion: r.currentVersion ? toVersionView(r.currentVersion, r.currentVersionId) : null,
    versionCount:   r.versions.length,
    createdAt:      r.createdAt.toISOString(),
    updatedAt:      r.updatedAt.toISOString(),
  };
}

export function toResumeDetail(r: ResumeWithVersions): ResumeDetail {
  return {
    ...toResumeListItem(r),
    versions: r.versions
      .slice()
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((v) => toVersionView(v, r.currentVersionId)),
  };
}

// ── Intake batches ──────────────────────────────────────────────────────────

export interface ResumeIntakeBatchView {
  id:             string;
  label:          string;
  sourceVendorId: string | null;
  status:         'OPEN' | 'CLOSED';
  resumeCount:    number;
  createdAt:      string;
  updatedAt:      string;
  closedAt:       string | null;
}

export function toIntakeBatchView(
  b: ResumeIntakeBatch & { _count?: { resumes: number } },
): ResumeIntakeBatchView {
  return {
    id:             b.id,
    label:          b.label,
    sourceVendorId: b.sourceVendorId,
    status:         b.status,
    resumeCount:    b._count?.resumes ?? 0,
    createdAt:      b.createdAt.toISOString(),
    updatedAt:      b.updatedAt.toISOString(),
    closedAt:       b.closedAt?.toISOString() ?? null,
  };
}
