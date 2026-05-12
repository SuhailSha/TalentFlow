'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle, CheckCircle2, Clock, Loader2, Mail, RefreshCw, Send, XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MetricTile } from '@/components/workspace';
import {
  useCommunicationsStats,
  useEmailDeliveries,
} from '@/hooks/use-communications';
import { useDebounce } from '@/hooks/use-debounce';
import type { EmailDeliveryStatus } from '@/types/settings';
import { cn } from '@/lib/utils';

const STATUSES: (EmailDeliveryStatus | 'ALL')[] = [
  'ALL', 'PENDING', 'QUEUED', 'RETRYING', 'SENT', 'FAILED', 'BOUNCED', 'SKIPPED',
];

const STATUS_TONE: Record<EmailDeliveryStatus, string> = {
  PENDING:  'bg-gray-100 text-gray-700',
  QUEUED:   'bg-blue-100 text-blue-700',
  RETRYING: 'bg-amber-100 text-amber-700',
  SENT:     'bg-green-100 text-green-700',
  FAILED:   'bg-red-100 text-red-700',
  BOUNCED:  'bg-red-100 text-red-700',
  SKIPPED:  'bg-gray-100 text-gray-600',
};

const STATUS_ICON: Record<EmailDeliveryStatus, React.ComponentType<{ className?: string }>> = {
  PENDING:  Clock,
  QUEUED:   Clock,
  RETRYING: RefreshCw,
  SENT:     CheckCircle2,
  FAILED:   AlertTriangle,
  BOUNCED:  AlertTriangle,
  SKIPPED:  XCircle,
};

const TEMPLATE_LABELS: Record<string, string> = {
  user_invitation:            'User invitation',
  reminder_due_soon:          'Reminder due soon',
  interview_feedback_pending: 'Interview feedback pending',
  interview_upcoming:         'Upcoming interview',
};

export default function CommunicationsLogPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<EmailDeliveryStatus | 'ALL'>('ALL');
  const [recipientFilter, setRecipientFilter] = useState('');
  const debouncedRecipient = useDebounce(recipientFilter, 300);

  const { data: stats } = useCommunicationsStats();
  const { data, isLoading, error } = useEmailDeliveries({
    page,
    limit: 30,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(debouncedRecipient.trim() && { recipientEmail: debouncedRecipient.trim() }),
  });

  const deliveries = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Communication log</h2>
        <p className="text-sm text-muted-foreground">
          Every outbound email the platform has attempted, with provider response and failure details.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Last 24h"
          value={stats?.total24h ?? 0}
          hint="All attempts"
          icon={Mail}
          loading={!stats}
        />
        <MetricTile
          label="Sent (24h)"
          value={stats?.sent24h ?? 0}
          icon={CheckCircle2}
          tone={(stats?.sent24h ?? 0) > 0 ? 'positive' : 'default'}
          loading={!stats}
        />
        <MetricTile
          label="Failed (24h)"
          value={stats?.failed24h ?? 0}
          icon={AlertTriangle}
          tone={(stats?.failed24h ?? 0) > 0 ? 'danger' : 'default'}
          loading={!stats}
        />
        <MetricTile
          label="In flight"
          value={stats?.pending ?? 0}
          hint="Pending / queued / retrying"
          icon={Send}
          tone={(stats?.pending ?? 0) > 0 ? 'info' : 'default'}
          loading={!stats}
        />
      </div>

      {/* Filters + table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent deliveries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input text-muted-foreground hover:bg-accent',
                  )}
                >
                  {s === 'ALL' ? 'All' : s}
                </button>
              ))}
            </div>
            <Input
              placeholder="Filter by recipient email…"
              value={recipientFilter}
              onChange={(e) => { setRecipientFilter(e.target.value); setPage(1); }}
              className="ml-auto max-w-xs"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-6 text-sm text-destructive">Failed to load deliveries.</p>
          ) : deliveries.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No deliveries match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Sent</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Template</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Recipient</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Subject</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Provider</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deliveries.map((d) => {
                    const Icon = STATUS_ICON[d.status];
                    return (
                      <tr key={d.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            STATUS_TONE[d.status],
                          )}>
                            <Icon className="h-3 w-3" />
                            {d.status}
                          </span>
                          {d.failureReason && (
                            <p className="mt-0.5 max-w-[20ch] truncate text-[10px] text-red-700" title={d.failureReason}>
                              {d.failureReason}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {TEMPLATE_LABELS[d.template] ?? d.template}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {d.recipientEmail}
                        </td>
                        <td className="px-3 py-2 max-w-[28ch] truncate text-xs" title={d.subject}>
                          {d.subject}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Badge variant="outline" className="text-[10px]">{d.provider}</Badge>
                        </td>
                        <td className="px-3 py-2 text-xs tabular-nums">{d.attempts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} deliveries</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={!meta.hasPreviousPage}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!meta.hasNextPage}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
