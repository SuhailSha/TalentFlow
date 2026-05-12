'use client';

import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  useFailedJobs,
  useRemoveFailedJob,
  useRetryFailedJob,
} from '@/hooks/use-queue';
import type { QueueName } from '@/types/queue';
import { getApiErrorMessage } from '@/lib/api/client';

interface FailedJobsCardProps {
  queueName: QueueName;
  /** When the parent already knows Redis is off, pass false to skip the fetch. */
  enabled?: boolean;
}

export function FailedJobsCard({ queueName, enabled = true }: FailedJobsCardProps) {
  const { data: jobs = [], isLoading, error } = useFailedJobs(queueName, 10, enabled);
  const retry  = useRetryFailedJob();
  const remove = useRemoveFailedJob();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!enabled) return null;

  const handleRetry = (jobId: string) => {
    setBusyId(jobId);
    retry.mutate(
      { queueName, jobId },
      {
        onSuccess: () => toast.success('Job re-queued'),
        onError:   (err) => toast.error(getApiErrorMessage(err)),
        onSettled: () => setBusyId(null),
      },
    );
  };
  const handleRemove = (jobId: string) => {
    if (!window.confirm('Permanently remove this failed job?')) return;
    setBusyId(jobId);
    remove.mutate(
      { queueName, jobId },
      {
        onSuccess: () => toast.success('Job removed'),
        onError:   (err) => toast.error(getApiErrorMessage(err)),
        onSettled: () => setBusyId(null),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          Failed jobs <span className="text-xs font-normal text-muted-foreground">({queueName})</span>
          {jobs.length > 0 && (
            <Badge variant="outline" className="border-red-300 text-[10px] text-red-700">
              {jobs.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16" />
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : jobs.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">No failed jobs. 🎯</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="space-y-1 rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{job.name}</span>
                      <Badge variant="outline" className="text-[10px]">id {job.id}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        attempts: {job.attemptsMade}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Failed {formatDistanceToNow(new Date(job.finishedOn ?? job.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleRetry(job.id)}
                      disabled={busyId === job.id}
                    >
                      {busyId === job.id
                        ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        : <RefreshCw className="mr-1 h-3 w-3" />}
                      Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleRemove(job.id)}
                      disabled={busyId === job.id}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {job.failedReason && (
                  <p className="rounded bg-red-50 p-2 text-[11px] text-red-800">
                    {job.failedReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
