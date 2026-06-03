'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Briefcase, Building2, Plus, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelatedEntityCard } from '@/components/workspace';
import { useSubmissions } from '@/hooks/use-submissions';

import { SUBMISSION_TONE } from './shared';

interface SubmissionsTabProps {
  candidateId: string;
  canCreate:   boolean;
}

export function SubmissionsTab({ candidateId, canCreate }: SubmissionsTabProps) {
  const { data: resp, isLoading } = useSubmissions({ candidateId, limit: 50 });
  const submissions = resp?.data ?? [];

  const active = submissions.filter(
    (s) => !['CLOSED', 'REJECTED', 'WITHDRAWN', 'PLACED'].includes(s.status),
  );
  const placed   = submissions.filter((s) => s.status === 'PLACED');
  const terminal = submissions.filter((s) => ['CLOSED', 'REJECTED', 'WITHDRAWN'].includes(s.status));

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Send className="h-4 w-4" /> Active submissions
            <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{active.length}</span>
          </CardTitle>
          {canCreate && (
            <Button asChild size="sm">
              <Link href={`/submissions/new?candidateId=${candidateId}`}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Submit to job
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {submissions.length === 0
                ? 'No submissions yet.'
                : 'No active submissions — all engagements are terminal.'}
            </p>
          ) : (
            active.map((s) => (
              <RelatedEntityCard
                key={s.id}
                eyebrow={s.job.reqId}
                icon={Briefcase}
                title={s.job.title}
                subtitle={(s.job.department ?? '') + (s.vendor ? ` · via ${s.vendor.companyName}` : '')}
                status={s.status}
                statusTone={SUBMISSION_TONE[s.status]}
                href={`/submissions/${s.id}`}
                meta={
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(s.updatedAt), { addSuffix: true })}
                  </span>
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      {placed.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" /> Placed
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{placed.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {placed.map((s) => (
              <RelatedEntityCard
                key={s.id}
                eyebrow={s.job.reqId}
                icon={Building2}
                title={s.job.title}
                subtitle={s.placedAt ? `Placed ${new Date(s.placedAt).toLocaleDateString()}` : undefined}
                status="PLACED"
                statusTone="green"
                href={`/submissions/${s.id}`}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {terminal.length > 0 && (
        <details className="rounded-md border bg-card/40 p-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Closed / Withdrawn / Rejected ({terminal.length})
          </summary>
          <div className="mt-2 space-y-2">
            {terminal.map((s) => (
              <RelatedEntityCard
                key={s.id}
                eyebrow={s.job.reqId}
                title={s.job.title}
                status={s.status}
                statusTone={SUBMISSION_TONE[s.status]}
                href={`/submissions/${s.id}`}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
