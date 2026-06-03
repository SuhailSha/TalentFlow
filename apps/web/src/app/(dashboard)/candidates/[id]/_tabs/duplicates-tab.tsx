'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, Search, XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeferDuplicateMatch, useDuplicateMatches, useManualDuplicateScan, useMarkNotDuplicate,
} from '@/hooks/use-duplicates';
import { TIER_LABELS, MATCH_STATUS_LABELS } from '@/types/duplicates';
import type {
  DuplicateConfidenceTier, DuplicateMatchListItem, DuplicateMatchStatus,
} from '@/types/duplicates';

const TIER_TONE: Record<DuplicateConfidenceTier, string> = {
  EXACT:    'bg-red-100 text-red-800',
  PROBABLE: 'bg-amber-100 text-amber-800',
  POSSIBLE: 'bg-blue-100 text-blue-800',
};

const STATUS_TONE: Record<DuplicateMatchStatus, string> = {
  PENDING:             'bg-amber-100 text-amber-800',
  CONFIRMED_DUPLICATE: 'bg-red-100 text-red-800',
  NOT_DUPLICATE:       'bg-green-100 text-green-800',
  DEFERRED:            'bg-blue-100 text-blue-800',
  SUPERSEDED:          'bg-gray-100 text-gray-700',
};

interface DuplicatesTabProps {
  candidateId: string;
  canUpdate:   boolean;
}

export function DuplicatesTab({ candidateId, canUpdate }: DuplicatesTabProps) {
  const { data: pending, isLoading: pendingLoading } = useDuplicateMatches({
    sourceCandidateId: candidateId,
    status: 'PENDING',
    limit: 50,
  });
  const { data: history } = useDuplicateMatches({
    sourceCandidateId: candidateId,
    limit: 100,
  });

  const scan = useManualDuplicateScan();

  const pendingMatches = pending?.data ?? [];
  const allMatches = history?.data ?? [];
  const decidedMatches = allMatches.filter((m) => m.status !== 'PENDING');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4" /> Pending duplicates
            <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">{pendingMatches.length}</span>
          </CardTitle>
          {canUpdate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => scan.mutate(candidateId)}
              disabled={scan.isPending}
            >
              {scan.isPending
                ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
              Re-scan
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingLoading && <Skeleton className="h-20 w-full" />}
          {!pendingLoading && pendingMatches.length === 0 && (
            <p className="flex items-center gap-1.5 py-3 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              No pending duplicates to review.
            </p>
          )}
          {pendingMatches.map((m) => (
            <PendingMatchRow key={m.id} match={m} canUpdate={canUpdate} />
          ))}
        </CardContent>
      </Card>

      {decidedMatches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" /> Decision history
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{decidedMatches.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {decidedMatches.slice(0, 20).map((m) => (
              <Link
                key={m.id}
                href={`/duplicates/${m.id}`}
                className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs hover:border-foreground/20"
              >
                <Badge className={STATUS_TONE[m.status]}>{MATCH_STATUS_LABELS[m.status]}</Badge>
                <Badge className={TIER_TONE[m.confidenceTier]}>{TIER_LABELS[m.confidenceTier]}</Badge>
                <span className="font-medium">{m.targetName}</span>
                <span className="text-muted-foreground">conf {Math.round(m.confidenceScore * 100)}%</span>
                <span className="ml-auto text-muted-foreground">
                  {m.decidedAt ? formatDistanceToNow(new Date(m.decidedAt), { addSuffix: true }) : '—'}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PendingMatchRow({ match, canUpdate }: { match: DuplicateMatchListItem; canUpdate: boolean }) {
  const [reason, setReason] = useState('');
  const notDup = useMarkNotDuplicate(match.id);
  const defer = useDeferDuplicateMatch(match.id);
  const [showDecide, setShowDecide] = useState(false);

  return (
    <div className="rounded-md border bg-background p-3 text-sm space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={TIER_TONE[match.confidenceTier]}>{TIER_LABELS[match.confidenceTier]}</Badge>
        <Link href={`/candidates/${match.targetCandidateId}`} className="font-medium hover:text-primary">
          {match.targetName}
        </Link>
        <span className="text-xs text-muted-foreground">conf {Math.round(match.confidenceScore * 100)}%</span>
        <span className="text-xs text-muted-foreground">· {match.reasonCount} signal{match.reasonCount === 1 ? '' : 's'}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })}
        </span>
      </div>
      {match.matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {match.matchReasons.slice(0, 6).map((r, i) => (
            <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground/80">
              {r.label}
              {r.similarity !== undefined && (
                <span className="ml-1 text-muted-foreground">{Math.round(r.similarity * 100)}%</span>
              )}
            </span>
          ))}
        </div>
      )}
      {canUpdate && !showDecide && (
        <div className="flex items-center gap-2 pt-1">
          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
            <Link href={`/duplicates/${match.id}`}>
              <Search className="mr-1 h-3 w-3" /> Compare side by side
            </Link>
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowDecide(true)}>
            Decide here
          </Button>
        </div>
      )}
      {canUpdate && showDecide && (
        <div className="space-y-2 rounded-md border bg-muted/40 p-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Decision reason (required for not-duplicate)"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => notDup.mutate(reason)}
              disabled={!reason.trim() || notDup.isPending}
            >
              {notDup.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              <XCircle className="mr-1 h-3 w-3" /> Not duplicate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => defer.mutate(reason || undefined)}
              disabled={defer.isPending}
            >
              {defer.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Defer
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => setShowDecide(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
