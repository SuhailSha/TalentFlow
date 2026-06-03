'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntityActivity } from '@/hooks/use-activity';

interface AuditTabProps {
  candidateId: string;
}

export function AuditTab({ candidateId }: AuditTabProps) {
  const { data: entries = [], isLoading } = useEntityActivity('candidate', candidateId, 500);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Audit trail</CardTitle>
        <p className="pt-1 text-xs text-muted-foreground">
          Admin-only view. Shows every recorded action with before / after diffs
          where the activity log captured them.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-32 w-full" />}
        {!isLoading && entries.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No audit entries.
          </p>
        )}
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded-md border bg-background p-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-medium uppercase tracking-wide text-[10px]">
                  {e.verb.replace(/_/g, ' ')}
                </span>
                <span className="text-muted-foreground">{e.action}</span>
                <span className="ml-auto text-muted-foreground">
                  {new Date(e.occurredAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                actor: {e.actorEmail ?? e.actorId ?? 'system'}
              </p>
              {(e.before || e.after || e.metadata) && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                    diff / metadata
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted/50 p-2 text-[10px] leading-snug">
{JSON.stringify({ before: e.before, after: e.after, metadata: e.metadata }, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
