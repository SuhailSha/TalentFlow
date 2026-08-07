'use client';

import { use } from 'react';
import Link from 'next/link';
import { Download, FileText, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCandidate, useResumes } from '@/hooks';
import { RESUME_SOURCE_LABELS, RESUME_STATUS_LABELS } from '@/types';
import type { ResumeListItem, ResumeStatus } from '@/types';

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

function ResumeRow({ resume }: { resume: ResumeListItem }) {
  const v = resume.currentVersion;
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <Link
        href={`/resumes/${resume.id}`}
        className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80"
      >
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{v?.fileName ?? 'No file'}</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[resume.status]}`}
            >
              {RESUME_STATUS_LABELS[resume.status]}
            </span>
            {resume.label && (
              <Badge variant="secondary" className="text-xs">
                {resume.label}
              </Badge>
            )}
            {v && (
              <Badge variant="outline" className="text-[10px]">
                v{v.versionNumber}
              </Badge>
            )}
            {resume.versionCount > 1 && (
              <span className="text-xs text-muted-foreground">{resume.versionCount} versions</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{RESUME_SOURCE_LABELS[resume.source]}</span>
            {v && (
              <span>
                {v.mimeType} · {formatBytes(v.sizeBytes)}
              </span>
            )}
            <span>{formatDistanceToNow(new Date(resume.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </Link>
      {v && (
        <Button asChild size="sm" variant="outline">
          <Link href={`/resumes/${resume.id}`}>
            <Download className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}

export default function CandidateResumesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: candidate, isLoading: candLoading } = useCandidate(id);
  const { data: resumes, isLoading, isError } = useResumes({ candidateId: id });

  const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate';

  return (
    <div className="space-y-6">
      <PageHeader
        title={candLoading ? 'Resumes' : `Resumes — ${candidateName}`}
        description="All resume versions attached to this candidate."
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Candidates', href: '/candidates' },
          { title: candidateName, href: `/candidates/${id}` },
          { title: 'Resumes' },
        ]}
        actions={
          <Button asChild size="sm">
            <Link href={`/resumes/upload?candidateId=${id}`}>
              <Plus className="mr-1.5 h-4 w-4" />
              Upload resume
            </Link>
          </Button>
        }
      />

      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">Failed to load resumes.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : resumes?.data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No resumes for this candidate yet</p>
            <Button asChild size="sm" variant="outline">
              <Link href={`/resumes/upload?candidateId=${id}`}>Upload first resume</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {resumes?.data.map((r) => (
            <ResumeRow key={r.id} resume={r} />
          ))}
        </div>
      )}
    </div>
  );
}
