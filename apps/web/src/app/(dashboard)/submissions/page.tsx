'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Briefcase } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SelectionCheckbox, useTableSelection } from '@/components/bulk';
import { useSubmissions, useSubmissionStats } from '@/hooks/use-submissions';
import type { SubmissionListItem, SubmissionStatus, ListSubmissionsParams } from '@/types/submissions';
import { SubmissionBulkActions } from './bulk-actions';

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  DRAFT:        'bg-gray-100 text-gray-700',
  SUBMITTED:    'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  SHORTLISTED:  'bg-purple-100 text-purple-800',
  INTERVIEW:    'bg-indigo-100 text-indigo-800',
  OFFERED:      'bg-orange-100 text-orange-800',
  PLACED:       'bg-green-100 text-green-800',
  REJECTED:     'bg-red-100 text-red-800',
  WITHDRAWN:    'bg-gray-100 text-gray-500',
  ON_HOLD:      'bg-amber-100 text-amber-800',
  CLOSED:       'bg-slate-100 text-slate-600',
};

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  DRAFT:        'Draft',
  SUBMITTED:    'Submitted',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED:  'Shortlisted',
  INTERVIEW:    'Interview',
  OFFERED:      'Offered',
  PLACED:       'Placed',
  REJECTED:     'Rejected',
  WITHDRAWN:    'Withdrawn',
  ON_HOLD:      'On Hold',
  CLOSED:       'Closed',
};

const ACTIVE_STATUSES: SubmissionStatus[] = [
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'ON_HOLD',
];

interface SubmissionRowProps {
  submission:  SubmissionListItem;
  isSelected:  boolean;
  onToggle:    (id: string) => void;
}

function SubmissionRow({ submission, isSelected, onToggle }: SubmissionRowProps) {
  const c = submission.candidate;
  const j = submission.job;

  return (
    <Link
      href={`/submissions/${submission.id}`}
      className={`block rounded-lg border bg-card p-4 transition-colors ${isSelected ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/50'}`}
    >
      <div className="flex items-start gap-3">
        <span className="pt-0.5">
          <SelectionCheckbox
            checked={isSelected}
            onChange={() => onToggle(submission.id)}
            aria-label={`Select submission for ${c.firstName} ${c.lastName}`}
          />
        </span>
        <div className="flex flex-1 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {c.firstName} {c.lastName}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[submission.status]}`}
            >
              {STATUS_LABELS[submission.status]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {j.reqId} · {j.title}
            {j.department ? ` — ${j.department}` : ''}
          </p>
          {submission.vendor && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Via {submission.vendor.companyName}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right space-y-1">
          <p className="text-xs text-muted-foreground">
            {submission.owner.firstName} {submission.owner.lastName}
          </p>
          {submission.billRate !== null && (
            <p className="text-xs text-muted-foreground">
              {submission.currency} {submission.billRate}/hr
            </p>
          )}
          {submission.submittedAt && (
            <p className="text-xs text-muted-foreground">
              {new Date(submission.submittedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      </div>
    </Link>
  );
}

function SubmissionRowSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="space-y-1 text-right">
          <Skeleton className="h-3 w-24 ml-auto" />
          <Skeleton className="h-3 w-16 ml-auto" />
        </div>
      </div>
    </div>
  );
}

function StatsBar() {
  const { data } = useSubmissionStats();
  if (!data) return null;

  const active = data.byStatus
    .filter((s) => ACTIVE_STATUSES.includes(s.status))
    .reduce((sum, s) => sum + s.count, 0);
  const placed = data.byStatus.find((s) => s.status === 'PLACED')?.count ?? 0;

  return (
    <div className="flex gap-4 text-sm text-muted-foreground">
      <span>{data.total} total</span>
      <span className="text-green-700 font-medium">{active} active</span>
      <span className="text-blue-700 font-medium">{placed} placed</span>
    </div>
  );
}

export default function SubmissionsPage() {
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'terminal'>('all');

  const params: ListSubmissionsParams = {
    page,
    limit: 20,
    ...(activeFilter === 'active' && { status: ACTIVE_STATUSES }),
    ...(activeFilter === 'terminal' && {
      status: ['PLACED', 'REJECTED', 'WITHDRAWN', 'CLOSED'] as SubmissionStatus[],
    }),
  };

  const { data, isLoading, isError } = useSubmissions(params);

  const handleFilter = useCallback((f: 'all' | 'active' | 'terminal') => {
    setActiveFilter(f);
    setPage(1);
  }, []);

  const totalPages = data?.meta.totalPages ?? 1;

  const items = data?.data ?? [];
  const selection = useTableSelection<SubmissionListItem>(items);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submissions"
        description="Track candidate pipeline across all jobs"
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Submissions' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/submissions/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New submission
            </Link>
          </Button>
        }
      />

      {/* Stats + filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <StatsBar />
        <div className="flex gap-1">
          {(['all', 'active', 'terminal'] as const).map((f) => (
            <Button
              key={f}
              variant={activeFilter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Closed'}
            </Button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">Failed to load submissions. Please try again.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SubmissionRowSkeleton key={i} />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No submissions found</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/submissions/new">Create your first submission</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {items.length > 0 && (
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <SelectionCheckbox
                checked={selection.isAllSelected}
                indeterminate={selection.isIndeterminate}
                onChange={(c) => (c ? selection.selectAll() : selection.clear())}
                aria-label={selection.isAllSelected ? 'Clear selection' : 'Select all visible'}
                stopPropagation={false}
              />
              <span>
                {selection.selectedCount > 0
                  ? `${selection.selectedCount} of ${items.length} selected`
                  : `Select all ${items.length} on this page`}
              </span>
            </div>
          )}

          <div className="space-y-3">
            {items.map((s) => (
              <SubmissionRow
                key={s.id}
                submission={s}
                isSelected={selection.isSelected(s.id)}
                onToggle={selection.toggle}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data?.meta.total} total &bull; page {page} of {totalPages}
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

      <SubmissionBulkActions
        selectedIds={Array.from(selection.selectedIds)}
        selectedCount={selection.selectedCount}
        onClear={selection.clear}
      />
    </div>
  );
}
