'use client';

import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCancelParsingJob, useParsingJobs, useReparseResume } from '@/hooks';
import { getApiErrorMessage } from '@/lib/api';
import { PARSING_STATUS_LABELS, PROVIDER_LABELS } from '@/types';
import type { ParsingJobStatus, ParsingJobView } from '@/types/parsing';

const STATUS_STYLES: Record<ParsingJobStatus, string> = {
  QUEUED:     'bg-slate-100 text-slate-700',
  RUNNING:    'bg-blue-100 text-blue-800',
  SUCCEEDED:  'bg-green-100 text-green-800',
  FAILED:     'bg-red-100 text-red-800',
  CANCELLED:  'bg-gray-100 text-gray-500',
  SUPERSEDED: 'bg-gray-100 text-gray-400',
};

const STATUS_ICON: Record<ParsingJobStatus, React.ComponentType<{ className?: string }>> = {
  QUEUED:     Clock,
  RUNNING:    Loader2,
  SUCCEEDED:  CheckCircle2,
  FAILED:     XCircle,
  CANCELLED:  XCircle,
  SUPERSEDED: AlertCircle,
};

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function ParsingJobRow({
  job, onCancel,
}: {
  job: ParsingJobView;
  onCancel: (id: string) => void;
}) {
  const Icon = STATUS_ICON[job.status];
  const isLive = job.status === 'QUEUED' || job.status === 'RUNNING';
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status]}`}>
            <Icon className={`h-3 w-3 ${job.status === 'RUNNING' ? 'animate-spin' : ''}`} />
            {PARSING_STATUS_LABELS[job.status]}
          </span>
          <Badge variant="outline" className="text-[10px]">attempt {job.attempt}</Badge>
          <span className="text-xs text-muted-foreground">{PROVIDER_LABELS[job.provider]}</span>
          {job.providerVersion && (
            <span className="text-[11px] text-muted-foreground font-mono">{job.providerVersion}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Started {job.startedAt ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true }) : '—'}</span>
          <span>Duration {formatDuration(job.durationMs)}</span>
          {job.inputTokens != null && <span>{job.inputTokens.toLocaleString()} in / {job.outputTokens?.toLocaleString() ?? '—'} out tokens</span>}
          {job.costUsd != null && <span>${job.costUsd.toFixed(4)}</span>}
          {job.extractionResult && <span>confidence {(job.extractionResult.overallConfidence * 100).toFixed(0)}%</span>}
        </div>
        {job.status === 'FAILED' && job.errorCode && (
          <div className="mt-1 text-xs text-red-700">
            <span className="font-mono">{job.errorCode}</span>
            {job.errorMessage && <>: {job.errorMessage}</>}
          </div>
        )}
      </div>
      {isLive && (
        <Button size="sm" variant="ghost" onClick={() => onCancel(job.id)}>Cancel</Button>
      )}
    </div>
  );
}

export function ParsingCard({ resumeId, versionId }: { resumeId: string; versionId: string }) {
  const { data: jobs, isLoading } = useParsingJobs(resumeId, versionId);
  const reparse = useReparseResume(resumeId, versionId);
  const cancel  = useCancelParsingJob(resumeId, versionId);

  const onReparse = async () => {
    try {
      await reparse.mutateAsync(undefined);
      toast.success('Reparse queued');
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const onCancel = async (id: string) => {
    try {
      await cancel.mutateAsync(id);
      toast.success('Parsing job cancelled');
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Parsing</h3>
            <p className="text-xs text-muted-foreground">
              {jobs && jobs.length > 0
                ? `${jobs.length} attempt${jobs.length === 1 ? '' : 's'}`
                : 'No parsing attempts yet.'}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onReparse} disabled={reparse.isPending}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${reparse.isPending ? 'animate-spin' : ''}`} />
            {reparse.isPending ? 'Queuing…' : 'Reparse'}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !jobs || jobs.length === 0 ? (
          <p className="rounded-md border border-dashed py-4 text-center text-sm text-muted-foreground">
            Click "Reparse" to extract structured data from this resume.
          </p>
        ) : (
          <div className="space-y-2">
            {jobs.map((j) => (
              <ParsingJobRow key={j.id} job={j} onCancel={onCancel} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
