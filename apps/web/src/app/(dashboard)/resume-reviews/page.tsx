'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClipboardList, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useReviews } from '@/hooks';
import {
  REVIEW_PRIORITY_LABELS, REVIEW_STATUS_LABELS,
} from '@/types';
import type {
  ListReviewsParams, ReviewPriority, ReviewTaskListItem, ReviewTaskStatus,
} from '@/types';

const STATUS_FILTERS: Array<{ value: ReviewTaskStatus | 'ALL'; label: string }> = [
  { value: 'ALL',       label: 'All' },
  { value: 'PENDING',   label: 'Pending' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'APPROVED',  label: 'Approved' },
  { value: 'REJECTED',  label: 'Rejected' },
];

const STATUS_STYLES: Record<ReviewTaskStatus, string> = {
  PENDING:           'bg-amber-100 text-amber-800',
  IN_REVIEW:         'bg-blue-100 text-blue-800',
  APPROVED:          'bg-green-100 text-green-800',
  REJECTED:          'bg-red-100 text-red-800',
  REPARSE_REQUESTED: 'bg-slate-100 text-slate-700',
  SUPERSEDED:        'bg-gray-100 text-gray-400',
};

const PRIORITY_STYLES: Record<ReviewPriority, string> = {
  LOW:    'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-50 text-blue-700',
  HIGH:   'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

function ReviewRow({ task }: { task: ReviewTaskListItem }) {
  const slaPast = task.slaDueAt && new Date(task.slaDueAt) < new Date() && task.status === 'PENDING';
  return (
    <Link
      href={`/resume-reviews/${task.id}`}
      className="block rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate">{task.resumeFileName || '(no file)'}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
              {REVIEW_STATUS_LABELS[task.status]}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
              {REVIEW_PRIORITY_LABELS[task.priority]}
            </span>
            {slaPast && <Badge variant="destructive" className="text-[10px]">SLA breached</Badge>}
            <Badge variant="outline" className="text-[10px]">
              confidence {(task.overallConfidence * 100).toFixed(0)}%
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {task.candidateName && <span>Candidate: {task.candidateName}</span>}
            {task.assigneeId    && <span>Claimed by: {task.assigneeId.slice(0, 8)}…</span>}
            <span>Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
            {task.slaDueAt && (
              <span className={slaPast ? 'text-red-700 font-medium' : ''}>
                SLA {formatDistanceToNow(new Date(task.slaDueAt), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function RowSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export default function ResumeReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<ReviewTaskStatus | 'ALL'>('PENDING');
  const [mineOnly, setMineOnly]         = useState(false);
  const [page, setPage]                 = useState(1);

  const params: ListReviewsParams = {
    page,
    limit: 20,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    mineOnly,
  };

  const { data, isLoading, isError } = useReviews(params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume reviews"
        description="Approve, edit, or reject extractions before they become full candidate profiles."
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Resume reviews' }]}
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                statusFilter === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => { setMineOnly(e.target.checked); setPage(1); }}
            className="h-4 w-4"
          />
          Mine only
        </label>
      </div>

      {isError ? (
        <Card><CardContent className="py-12 text-center"><p className="text-sm text-destructive">Failed to load reviews.</p></CardContent></Card>
      ) : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}</div>
      ) : data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No reviews matching filters</p>
            <p className="text-xs text-muted-foreground">When a resume is uploaded, an extraction is parsed and queued here for review.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data?.data.map((t) => <ReviewRow key={t.id} task={t} />)}
          </div>
          {(data?.meta?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{data?.meta?.total} total · page {page} of {data?.meta?.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= (data?.meta?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
