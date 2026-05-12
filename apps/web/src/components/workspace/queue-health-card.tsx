'use client';

import { Activity, AlertCircle, Cpu, PowerOff } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueueHealth } from '@/hooks/use-queue';
import { cn } from '@/lib/utils';
import type { QueueCounts, QueueStats } from '@/types/queue';

const QUEUE_DISPLAY_NAMES: Record<string, string> = {
  'notification-email': 'Email',
  'notification-push':  'Push',
  'resume-parse':       'Resume parse',
  'report-generate':    'Reports',
  'cleanup-scheduled':  'Cleanup',
};

function CountChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col items-center min-w-[64px]">
      <span className={cn('text-xl font-semibold tabular-nums', tone)}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

function QueueRow({ stat }: { stat: QueueStats }) {
  const c = stat.counts;
  const hasBacklog = c.waiting > 0 || c.delayed > 0;
  const hasFailures = c.failed > 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {QUEUE_DISPLAY_NAMES[stat.queueName] ?? stat.queueName}
          </span>
          {stat.paused && (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
              Paused
            </Badge>
          )}
          {hasFailures && (
            <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">
              {c.failed} failed
            </Badge>
          )}
          {hasBacklog && !hasFailures && (
            <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">
              Active
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{stat.queueName}</span>
      </div>
      <div className="flex flex-shrink-0 items-center gap-4">
        <CountChip label="Waiting"  value={c.waiting}  tone="text-foreground" />
        <CountChip label="Active"   value={c.active}   tone={c.active > 0 ? 'text-blue-700' : 'text-foreground'} />
        <CountChip label="Delayed"  value={c.delayed}  tone="text-foreground" />
        <CountChip label="Failed"   value={c.failed}   tone={c.failed > 0 ? 'text-red-700' : 'text-foreground'} />
        <CountChip label="Done"     value={c.completed} tone="text-muted-foreground" />
      </div>
    </div>
  );
}

function TotalsBar({ totals }: { totals: QueueCounts }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/50 px-3 py-2 text-xs">
      <span className="font-medium uppercase tracking-wide text-muted-foreground">Totals</span>
      <span><span className="font-medium tabular-nums">{totals.waiting}</span> waiting</span>
      <span><span className="font-medium tabular-nums">{totals.active}</span> active</span>
      <span><span className="font-medium tabular-nums">{totals.delayed}</span> delayed</span>
      <span className={cn(totals.failed > 0 && 'font-semibold text-red-700')}>
        <span className="tabular-nums">{totals.failed}</span> failed
      </span>
    </div>
  );
}

export function QueueHealthCard() {
  const { data, isLoading, error } = useQueueHealth();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          Queue health
          {data?.enabled === false && (
            <Badge variant="outline" className="ml-2 text-[10px] border-amber-300 text-amber-700">
              <PowerOff className="mr-1 h-3 w-3" />
              Redis disabled
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load queue health.</p>
        ) : !data ? null : !data.enabled ? (
          <div className="flex items-start gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50/40 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
            <div className="space-y-1">
              <p className="font-medium">Async infrastructure is dormant.</p>
              <p className="text-xs text-muted-foreground">
                Set <code className="rounded bg-muted px-1">REDIS_ENABLED=true</code> and start Redis
                (see <code className="rounded bg-muted px-1">docs/REDIS.md</code>) to activate BullMQ workers.
                Email currently flows via the synchronous fallback.
              </p>
            </div>
          </div>
        ) : (
          <>
            <TotalsBar totals={data.totals} />
            <div className="space-y-2">
              {data.queues.map((q) => (
                <QueueRow key={q.queueName} stat={q} />
              ))}
            </div>
          </>
        )}

        {data && (
          <div className="flex items-center gap-3 border-t pt-2 text-[11px] text-muted-foreground">
            <Cpu className="h-3 w-3" />
            <span>API process · Node {data.process.nodeVersion}</span>
            <span>·</span>
            <span>Up {Math.floor(data.process.uptimeSeconds / 60)}m</span>
            <span>·</span>
            <span>Heap {data.process.memoryHeapMB} MB</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
