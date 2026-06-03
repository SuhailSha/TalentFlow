'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, GitMerge, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDuplicateMatches } from '@/hooks';
import {
  MATCH_STATUS_LABELS, TIER_LABELS,
} from '@/types';
import type {
  DuplicateConfidenceTier, DuplicateMatchListItem, DuplicateMatchStatus,
  ListDuplicateMatchesParams,
} from '@/types';

const STATUS_FILTERS: Array<{ value: DuplicateMatchStatus | 'ALL'; label: string }> = [
  { value: 'PENDING',       label: 'Pending' },
  { value: 'DEFERRED',      label: 'Deferred' },
  { value: 'NOT_DUPLICATE', label: 'Resolved' },
  { value: 'ALL',           label: 'All' },
];

const TIER_FILTERS: Array<{ value: DuplicateConfidenceTier | 'ALL'; label: string }> = [
  { value: 'ALL',      label: 'All tiers' },
  { value: 'EXACT',    label: 'Exact' },
  { value: 'PROBABLE', label: 'Probable' },
  { value: 'POSSIBLE', label: 'Possible' },
];

const STATUS_STYLES: Record<DuplicateMatchStatus, string> = {
  PENDING:             'bg-amber-100 text-amber-800',
  DEFERRED:            'bg-slate-100 text-slate-700',
  NOT_DUPLICATE:       'bg-green-100 text-green-800',
  SUPERSEDED:          'bg-gray-100 text-gray-400',
  CONFIRMED_DUPLICATE: 'bg-blue-100 text-blue-800',
};

const TIER_STYLES: Record<DuplicateConfidenceTier, string> = {
  EXACT:    'bg-red-100 text-red-800',
  PROBABLE: 'bg-orange-100 text-orange-700',
  POSSIBLE: 'bg-blue-50  text-blue-700',
};

function MatchRow({ match }: { match: DuplicateMatchListItem }) {
  return (
    <Link
      href={`/duplicate-reviews/${match.id}`}
      className="block rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <GitMerge className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate">{match.sourceName}</span>
            <span className="text-xs text-muted-foreground">↔</span>
            <span className="font-medium text-sm truncate">{match.targetName}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TIER_STYLES[match.confidenceTier]}`}>
              {TIER_LABELS[match.confidenceTier]}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[match.status]}`}>
              {MATCH_STATUS_LABELS[match.status]}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {Math.round(match.confidenceScore * 100)}% match
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{match.reasonCount} reason{match.reasonCount === 1 ? '' : 's'}</span>
            {match.matchReasons.slice(0, 2).map((r, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-700" />
                {r.label}
              </span>
            ))}
            <span>Created {formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })}</span>
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

export default function DuplicateReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<DuplicateMatchStatus | 'ALL'>('PENDING');
  const [tierFilter, setTierFilter]     = useState<DuplicateConfidenceTier | 'ALL'>('ALL');
  const [page, setPage]                 = useState(1);

  const params: ListDuplicateMatchesParams = {
    page,
    limit: 20,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    tier:   tierFilter   === 'ALL' ? undefined : tierFilter,
  };

  const { data, isLoading, isError } = useDuplicateMatches(params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Duplicate reviews"
        description="Potential duplicate candidates surfaced before promotion. Review and decide — no automatic merges in this phase."
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Duplicate reviews' }]}
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
        <div className="flex gap-1.5 flex-wrap">
          {TIER_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setTierFilter(value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                tierFilter === value
                  ? 'bg-primary/10 text-primary border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <Card><CardContent className="py-12 text-center"><p className="text-sm text-destructive">Failed to load duplicate reviews.</p></CardContent></Card>
      ) : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}</div>
      ) : data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No duplicate matches at this filter</p>
            <p className="text-xs text-muted-foreground">Duplicate detection runs automatically before every candidate promotion.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data?.data.map((m) => <MatchRow key={m.id} match={m} />)}
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
