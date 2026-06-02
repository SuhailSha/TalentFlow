'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useResumes } from '@/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { RESUME_STATUS_LABELS, RESUME_SOURCE_LABELS } from '@/types';
import type { ListResumesParams, ResumeListItem, ResumeStatus } from '@/types';

const STATUS_STYLES: Record<ResumeStatus, string> = {
  DRAFT:        'bg-slate-100 text-slate-700',
  PROCESSING:   'bg-blue-100 text-blue-800',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
  ACTIVE:       'bg-green-100 text-green-800',
  ARCHIVED:     'bg-gray-100 text-gray-500',
  REJECTED:     'bg-red-100 text-red-800',
};

const STATUS_FILTERS: ResumeStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function ResumeRow({ resume }: { resume: ResumeListItem }) {
  const v = resume.currentVersion;
  return (
    <Link
      href={`/resumes/${resume.id}`}
      className="block rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate">{v?.fileName ?? 'No file'}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[resume.status]}`}>
              {RESUME_STATUS_LABELS[resume.status]}
            </span>
            {resume.label && <Badge variant="secondary" className="text-xs">{resume.label}</Badge>}
          </div>

          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            <span>{RESUME_SOURCE_LABELS[resume.source]}</span>
            {v && <span>v{v.versionNumber} · {v.mimeType} · {formatBytes(v.sizeBytes)}</span>}
            {resume.versionCount > 1 && <span>{resume.versionCount} versions</span>}
            <span>Uploaded {formatDistanceToNow(new Date(resume.createdAt), { addSuffix: true })}</span>
          </div>
        </div>

        <div className="shrink-0 text-right text-xs text-muted-foreground font-mono">
          {v ? v.sha256.slice(0, 12) : ''}
        </div>
      </div>
    </Link>
  );
}

function ResumeRowSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-72" />
    </div>
  );
}

export default function ResumesPage() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<ResumeStatus | undefined>();
  const [page, setPage]                 = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const params: ListResumesParams = {
    page,
    limit:  20,
    search: debouncedSearch || undefined,
    status: statusFilter,
  };

  const { data, isLoading, isError } = useResumes(params);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const toggleStatus = (s: ResumeStatus) => {
    setStatusFilter((prev) => (prev === s ? undefined : s));
    setPage(1);
  };

  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumes"
        description="Recruiter-uploaded resumes. Parsing and review begin in R2."
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Resumes' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/resumes/upload">
              <Plus className="mr-1.5 h-4 w-4" />
              Upload resume
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by label..."
            value={search}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {RESUME_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">Failed to load resumes. Please try again.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <ResumeRowSkeleton key={i} />)}
        </div>
      ) : data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No resumes uploaded yet</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/resumes/upload">Upload your first resume</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data?.data.map((r) => <ResumeRow key={r.id} resume={r} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{data?.meta?.total} total · page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
