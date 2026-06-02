'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { Archive, Download, FileText, Upload, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ActivityTimeline,
  MetricTile,
  WorkspaceFact,
  WorkspaceHeader,
  WorkspaceShell,
} from '@/components/workspace';
import {
  useDeleteResume,
  useResume,
  useResumeAccessLog,
  useUpdateResume,
  useUploadNewVersion,
} from '@/hooks';
import { downloadResumeBlob } from '@/lib/api/resumes';
import { getApiErrorMessage } from '@/lib/api';
import { RESUME_SOURCE_LABELS, RESUME_STATUS_LABELS } from '@/types';
import type { ActivityEntry } from '@/types/activity';
import type { ResumeAccessLogView, ResumeDetail, ResumeStatus, ResumeVersionView } from '@/types';

const STATUS_STYLES: Record<ResumeStatus, string> = {
  DRAFT:        'bg-slate-100 text-slate-700',
  PROCESSING:   'bg-blue-100 text-blue-800',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
  ACTIVE:       'bg-green-100 text-green-800',
  ARCHIVED:     'bg-gray-100 text-gray-500',
  REJECTED:     'bg-red-100 text-red-800',
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function triggerDownload(resumeId: string, version: ResumeVersionView): Promise<void> {
  const { blob, fileName } = await downloadResumeBlob(resumeId, version.id);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function buildTimeline(
  resume: ResumeDetail,
  accessLogs: ResumeAccessLogView[] | undefined,
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  // Each version upload becomes a `created` entry on the timeline.
  for (const v of resume.versions) {
    entries.push({
      id:           `v-${v.id}`,
      action:       `Uploaded v${v.versionNumber}`,
      verb:         'created',
      actorId:      v.uploadedBy,
      actorEmail:   null,
      resourceType: 'resume_version',
      resourceId:   v.id,
      occurredAt:   v.uploadedAt,
      metadata: {
        fileName:  v.fileName,
        sizeBytes: v.sizeBytes,
        sha256:    v.sha256.slice(0, 12),
      },
      before: null,
      after:  null,
    });
  }

  // Each access log row becomes an `updated` entry. Older entries are noisy;
  // cap at 25 most recent.
  if (accessLogs) {
    for (const log of accessLogs.slice(0, 25)) {
      entries.push({
        id:           `a-${log.id}`,
        action:       log.action === 'DOWNLOAD' ? 'Downloaded' : log.action,
        verb:         log.action === 'DOWNLOAD' ? 'updated' : 'updated',
        actorId:      log.actorId,
        actorEmail:   null,
        resourceType: 'resume_access_log',
        resourceId:   log.id,
        occurredAt:   log.createdAt,
        metadata:     log.metadata,
        before:       null,
        after:        null,
      });
    }
  }

  entries.sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  return entries;
}

export default function ResumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }            = use(params);
  const { data: resume, isLoading, isError } = useResume(id);
  const currentVersionId  = resume?.currentVersion?.id ?? null;
  const { data: accessLogs } = useResumeAccessLog(id, currentVersionId);
  const update            = useUpdateResume(id);
  const addVersion        = useUploadNewVersion(id);
  const remove            = useDeleteResume();
  const [versionFile, setVersionFile] = useState<File | null>(null);

  const timeline = useMemo(
    () => (resume ? buildTimeline(resume, accessLogs) : []),
    [resume, accessLogs],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (isError || !resume) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-destructive">Failed to load resume.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/resumes">Back to resumes</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const v          = resume.currentVersion;
  const candidate  = resume.candidateId;
  const totalSize  = resume.versions.reduce((sum, x) => sum + x.sizeBytes, 0);

  const onDownload = async (ver: ResumeVersionView) => {
    try { await triggerDownload(resume.id, ver); }
    catch (e) { toast.error(getApiErrorMessage(e)); }
  };

  const onAddVersion = async () => {
    if (!versionFile) return;
    try {
      await addVersion.mutateAsync(versionFile);
      setVersionFile(null);
      toast.success('New version uploaded');
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const onArchive = async () => {
    try {
      await update.mutateAsync({ status: resume.status === 'ARCHIVED' ? 'DRAFT' : 'ARCHIVED' });
      toast.success(resume.status === 'ARCHIVED' ? 'Restored' : 'Archived');
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const onDelete = async () => {
    if (!confirm('Soft-delete this resume? The file is retained but hidden from the library.')) return;
    try {
      await remove.mutateAsync(resume.id);
      toast.success('Resume deleted');
      window.location.href = '/resumes';
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  return (
    <WorkspaceShell
      rail={
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-medium">Quick stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricTile label="Versions"  value={resume.versionCount} />
                <MetricTile label="Total size" value={formatBytes(totalSize)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="text-sm font-medium">Candidate</h3>
              <Link
                href={`/candidates/${candidate}`}
                className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm hover:bg-muted"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono truncate">{candidate.slice(0, 8)}…</span>
              </Link>
            </CardContent>
          </Card>
        </div>
      }
    >
      <WorkspaceHeader
        eyebrow="Resume"
        title={v?.fileName ?? 'No file'}
        subtitle={resume.label ?? undefined}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Resumes',   href: '/resumes' },
          { title: v?.fileName ?? id.slice(0, 8) },
        ]}
        badges={
          <>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[resume.status]}`}>
              {RESUME_STATUS_LABELS[resume.status]}
            </span>
            <Badge variant="secondary" className="text-xs">{RESUME_SOURCE_LABELS[resume.source]}</Badge>
            {v && <Badge variant="outline" className="text-xs">v{v.versionNumber}</Badge>}
          </>
        }
        actions={
          <>
            {v && (
              <Button size="sm" onClick={() => onDownload(v)}>
                <Download className="mr-1.5 h-4 w-4" />
                Download
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onArchive}>
              <Archive className="mr-1.5 h-4 w-4" />
              {resume.status === 'ARCHIVED' ? 'Restore' : 'Archive'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete}>Delete</Button>
          </>
        }
        facts={
          v && (
            <>
              <WorkspaceFact label="MIME">{v.mimeType}</WorkspaceFact>
              <WorkspaceFact label="Size">{formatBytes(v.sizeBytes)}</WorkspaceFact>
              <WorkspaceFact label="Uploaded">{formatDistanceToNow(new Date(v.uploadedAt), { addSuffix: true })}</WorkspaceFact>
              <WorkspaceFact label="SHA-256"><span className="font-mono">{v.sha256.slice(0, 16)}…</span></WorkspaceFact>
            </>
          )
        }
      />

      {/* Version history */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Version history</h3>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf"
                onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)}
                className="text-xs"
              />
              <Button size="sm" disabled={!versionFile || addVersion.isPending} onClick={onAddVersion}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {addVersion.isPending ? 'Uploading…' : 'Add version'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {resume.versions.map((ver) => (
              <div key={ver.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      v{ver.versionNumber} · {ver.fileName}
                      {ver.isCurrent && <Badge variant="secondary" className="ml-2 text-[10px]">current</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(ver.sizeBytes)} · {ver.mimeType} ·{' '}
                      uploaded {formatDistanceToNow(new Date(ver.uploadedAt), { addSuffix: true })}
                      {ver.supersededAt && ` · superseded ${formatDistanceToNow(new Date(ver.supersededAt), { addSuffix: true })}`}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onDownload(ver)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity timeline */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Activity</h3>
          <ActivityTimeline entries={timeline} emptyMessage="No activity yet." />
        </CardContent>
      </Card>
    </WorkspaceShell>
  );
}
