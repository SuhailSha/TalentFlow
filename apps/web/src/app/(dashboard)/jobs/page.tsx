'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Briefcase } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useJobs } from '@/hooks/use-jobs';
import { useDebounce } from '@/hooks/use-debounce';
import type { JobListItem, JobStatus, JobPriority, ListJobsParams } from '@/types/jobs';

const STATUS_COLORS: Record<JobStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-700',
  OPEN:      'bg-green-100 text-green-800',
  ON_HOLD:   'bg-yellow-100 text-yellow-800',
  FILLED:    'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-700',
  ARCHIVED:  'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<JobPriority, string> = {
  LOW:    'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-50 text-blue-700',
  HIGH:   'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const WORK_MODE_LABELS = { ONSITE: 'On-site', REMOTE: 'Remote', HYBRID: 'Hybrid' };
const EMPLOYMENT_LABELS = {
  FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract',
  CONTRACT_TO_HIRE: 'Contract-to-hire', FREELANCE: 'Freelance', INTERNSHIP: 'Internship',
};

function JobRow({ job }: { job: JobListItem }) {
  const location = [job.city, job.country].filter(Boolean).join(', ');
  const expRange = job.experienceMin !== null || job.experienceMax !== null
    ? `${job.experienceMin ?? 0}–${job.experienceMax ?? '∞'} yrs`
    : null;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">{job.reqId}</span>
            <span className="font-medium text-sm">{job.title}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status]}`}>
              {job.status}
            </span>
            {job.hiringPriority !== 'NORMAL' && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[job.hiringPriority]}`}>
                {job.hiringPriority}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
            {job.department && <span>{job.department}</span>}
            <span>{WORK_MODE_LABELS[job.workMode]}</span>
            <span>{EMPLOYMENT_LABELS[job.employmentType]}</span>
            {location && <span>{location}</span>}
            {expRange && <span>{expRange} exp</span>}
          </div>
        </div>

        <div className="shrink-0 text-right space-y-1 text-xs text-muted-foreground">
          {job.openPositions > 1 && (
            <p>{job.filledPositions}/{job.openPositions} filled</p>
          )}
          {job.targetHireDate && (
            <p>Target: {new Date(job.targetHireDate).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {job.topSkills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.topSkills.slice(0, 5).map((js) => (
            <Badge key={js.id} variant={js.isRequired ? 'default' : 'secondary'} className="text-xs">
              {js.skill.displayName}
            </Badge>
          ))}
        </div>
      )}
    </Link>
  );
}

function JobRowSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex gap-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

// Quick status filter chips
const STATUS_FILTERS: { label: string; value: JobStatus }[] = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'On Hold', value: 'ON_HOLD' },
  { label: 'Filled', value: 'FILLED' },
];

export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<JobStatus[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const params: ListJobsParams = {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusFilter.length ? statusFilter : undefined,
  };

  const { data, isLoading, isError } = useJobs(params);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const toggleStatus = (s: JobStatus) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
    setPage(1);
  };

  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Manage open positions and requisitions"
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Jobs' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/jobs/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New job
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, department, requirements..."
            value={search}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => toggleStatus(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                statusFilter.includes(value)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">Failed to load jobs. Please try again.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <JobRowSkeleton key={i} />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No jobs found</p>
            {search || statusFilter.length ? (
              <button
                onClick={() => { setSearch(''); setStatusFilter([]); }}
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/jobs/new">Create your first job</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data?.data.map((j) => <JobRow key={j.id} job={j} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data?.meta?.total} total &bull; page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
