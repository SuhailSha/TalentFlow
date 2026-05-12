'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Activity, AlertCircle, AlertTriangle, CheckCircle2, Cpu, PowerOff, RefreshCw,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueueHealth } from '@/hooks/use-queue';
import { cn } from '@/lib/utils';
import type {
  QueueCounts, QueueStats, RedisConnectionState, RedisConnectionStatus,
} from '@/types/queue';

const QUEUE_DISPLAY_NAMES: Record<string, string> = {
  'notification-email': 'Email',
  'notification-push':  'Push',
  'resume-parse':       'Resume parse',
  'report-generate':    'Reports',
  'cleanup-scheduled':  'Cleanup',
};

const STATE_TONE: Record<RedisConnectionState, string> = {
  ready:        'border-green-300 bg-green-50 text-green-700',
  connect:      'border-blue-300 bg-blue-50 text-blue-700',
  connecting:   'border-blue-300 bg-blue-50 text-blue-700',
  wait:         'border-gray-300 bg-gray-50 text-gray-700',
  reconnecting: 'border-amber-300 bg-amber-50 text-amber-700',
  end:          'border-red-300 bg-red-50 text-red-700',
  close:        'border-red-300 bg-red-50 text-red-700',
  unknown:      'border-gray-300 bg-gray-50 text-gray-600',
};

const STATE_LABEL: Record<RedisConnectionState, string> = {
  ready:        'Connected',
  connect:      'Connecting',
  connecting:   'Connecting',
  wait:         'Waiting',
  reconnecting: 'Reconnecting',
  end:          'Disconnected',
  close:        'Disconnected',
  unknown:      'Unknown',
};

function ConnectionPill({ status }: { status: RedisConnectionStatus }) {
  const Icon =
    status.state === 'ready' ? CheckCircle2 :
    status.state === 'reconnecting' ? RefreshCw :
    status.state === 'end' || status.state === 'close' ? AlertTriangle :
    Activity;
  const titleParts = [
    status.lastConnectedAt && `Last connected: ${new Date(status.lastConnectedAt).toLocaleString()}`,
    status.lastDisconnectedAt && `Last disconnected: ${new Date(status.lastDisconnectedAt).toLocaleString()}`,
    status.reconnectCount > 0 && `Reconnect attempts: ${status.reconnectCount}`,
    status.lastErrorMessage && `Last error: ${status.lastErrorMessage}`,
  ].filter(Boolean).join('\n');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        STATE_TONE[status.state],
      )}
      title={titleParts}
    >
      <Icon className={cn('h-3 w-3', status.state === 'reconnecting' && 'animate-spin')} />
      Redis: {STATE_LABEL[status.state]}
      {status.reconnectCount > 0 && (
        <span className="opacity-70">· {status.reconnectCount} reconnects</span>
      )}
    </span>
  );
}

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
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          {data?.enabled && data.connection && (
            <ConnectionPill status={data.connection} />
          )}
        </div>
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              API process · Node {data.process.nodeVersion}
            </span>
            <span>·</span>
            <span>Up {Math.floor(data.process.uptimeSeconds / 60)}m</span>
            <span>·</span>
            <span>Heap {data.process.memoryHeapMB} MB</span>
            {data.enabled && data.connection.lastConnectedAt && (
              <>
                <span>·</span>
                <span>
                  Redis last connected {formatDistanceToNow(new Date(data.connection.lastConnectedAt), { addSuffix: true })}
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
