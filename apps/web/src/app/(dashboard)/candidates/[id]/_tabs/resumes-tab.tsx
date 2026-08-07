'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useParsingJobs, useReparseResume } from '@/hooks/use-parsing';
import { useResume, useResumes, useUploadNewVersion, useUploadResume } from '@/hooks/use-resumes';
import { RESUME_SOURCE_LABELS, RESUME_STATUS_LABELS } from '@/types/resumes';
import type { ResumeListItem, ResumeStatus, ResumeVersionView } from '@/types/resumes';
import { PARSING_STATUS_LABELS } from '@/types/parsing';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<ResumeStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PROCESSING: 'bg-blue-100 text-blue-800',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-500',
  REJECTED: 'bg-red-100 text-red-800',
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

interface ResumesTabProps {
  candidateId: string;
  canUpdate: boolean;
}

export function ResumesTab({ candidateId, canUpdate }: ResumesTabProps) {
  const { data: resp, isLoading, isError } = useResumes({ candidateId });
  const upload = useUploadResume();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const resumes = resp?.data ?? [];

  function onUpload(file: File) {
    upload.mutate({ file, candidateId });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" /> Resumes
            <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">
              {resumes.length}
            </span>
          </CardTitle>
          {canUpdate && (
            <>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = '';
                }}
              />
              <Button
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={upload.isPending}
              >
                {upload.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1 h-3.5 w-3.5" />
                )}
                Upload new
              </Button>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {isError && <p className="text-sm text-destructive">Failed to load resumes.</p>}
          {isLoading &&
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          {!isLoading && !isError && resumes.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No resumes attached yet. Upload one to start parsing.
            </p>
          )}
          {!isLoading &&
            resumes.map((r) => (
              <ResumeRow
                key={r.id}
                resume={r}
                isOpen={expanded === r.id}
                onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                canUpdate={canUpdate}
              />
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Resume row with version history + parsing state ──────────────────────────

interface ResumeRowProps {
  resume: ResumeListItem;
  isOpen: boolean;
  onToggle: () => void;
  canUpdate: boolean;
}

function ResumeRow({ resume, isOpen, onToggle, canUpdate }: ResumeRowProps) {
  const v = resume.currentVersion;
  const { data: detail } = useResume(isOpen ? resume.id : null);
  const newVersion = useUploadNewVersion(resume.id);
  const versionFileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between gap-3 p-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">{v?.fileName ?? 'No file'}</span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  STATUS_STYLES[resume.status],
                )}
              >
                {RESUME_STATUS_LABELS[resume.status]}
              </span>
              {resume.label && (
                <Badge variant="secondary" className="text-[10px]">
                  {resume.label}
                </Badge>
              )}
              {v && (
                <Badge variant="outline" className="text-[10px]">
                  v{v.versionNumber}
                </Badge>
              )}
              {resume.versionCount > 1 && (
                <span className="text-[10px] text-muted-foreground">
                  {resume.versionCount} versions
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span>{RESUME_SOURCE_LABELS[resume.source]}</span>
              {v && (
                <span>
                  {v.mimeType} · {formatBytes(v.sizeBytes)}
                </span>
              )}
              <span>{formatDistanceToNow(new Date(resume.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="outline">
            <Link href={`/resumes/${resume.id}`}>
              <Download className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t bg-muted/30 px-3 py-3 space-y-3">
          {/* Versions */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Versions
              </span>
              {canUpdate && (
                <>
                  <input
                    ref={versionFileRef}
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) newVersion.mutate(f);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => versionFileRef.current?.click()}
                    disabled={newVersion.isPending}
                  >
                    {newVersion.isPending ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-1 h-3.5 w-3.5" />
                    )}
                    Upload new version
                  </Button>
                </>
              )}
            </div>
            <div className="space-y-1">
              {(detail?.versions ?? (v ? [v] : [])).map((ver) => (
                <VersionRow key={ver.id} resumeId={resume.id} version={ver} canUpdate={canUpdate} />
              ))}
              {!detail?.versions && !v && (
                <p className="text-xs text-muted-foreground">No version metadata.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VersionRow({
  resumeId,
  version,
  canUpdate,
}: {
  resumeId: string;
  version: ResumeVersionView;
  canUpdate: boolean;
}) {
  const { data: jobs = [] } = useParsingJobs(resumeId, version.id);
  const reparse = useReparseResume(resumeId, version.id);

  const latest = jobs[0];
  const isLive = latest?.status === 'QUEUED' || latest?.status === 'RUNNING';

  return (
    <div className="flex flex-col gap-1 rounded-md border bg-background px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={version.isCurrent ? 'default' : 'outline'} className="text-[10px]">
          v{version.versionNumber}
          {version.isCurrent && ' · current'}
        </Badge>
        <span className="truncate font-medium">{version.fileName}</span>
        <span className="text-[10px] text-muted-foreground">{formatBytes(version.sizeBytes)}</span>
        {version.pageCount !== null && (
          <span className="text-[10px] text-muted-foreground">{version.pageCount}p</span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(version.uploadedAt), { addSuffix: true })}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {latest ? (
          <span className="flex items-center gap-1">
            {latest.status === 'SUCCEEDED' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
            {latest.status === 'FAILED' && <AlertCircle className="h-3 w-3 text-red-600" />}
            {(latest.status === 'QUEUED' || latest.status === 'RUNNING') && (
              <Clock className="h-3 w-3 text-blue-600" />
            )}
            <span>{PARSING_STATUS_LABELS[latest.status]}</span>
            <span className="text-muted-foreground">via {latest.provider}</span>
            {latest.extractionResult && (
              <span className="text-muted-foreground">
                conf {(latest.extractionResult.overallConfidence * 100).toFixed(0)}%
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">No parsing job yet.</span>
        )}
        {latest?.errorMessage && (
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">
            {latest.errorCode ?? 'error'}: {latest.errorMessage}
          </span>
        )}
        {canUpdate && version.isCurrent && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-6 px-2 text-[11px]"
            onClick={() => reparse.mutateAsync(undefined).catch(() => {})}
            disabled={isLive || reparse.isPending}
            title={isLive ? 'Parsing already in progress' : 'Trigger re-parse'}
          >
            {reparse.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Re-parse
          </Button>
        )}
      </div>
    </div>
  );
}
