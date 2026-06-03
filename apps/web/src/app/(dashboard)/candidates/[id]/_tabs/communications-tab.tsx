'use client';

import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, Mail } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmailDeliveries } from '@/hooks/use-communications';

interface CommunicationsTabProps {
  candidateEmail: string;
  candidateId:    string;
}

export function CommunicationsTab({ candidateEmail, candidateId }: CommunicationsTabProps) {
  // Two queries — by direct email match, and by resource link if the API
  // tagged the delivery against a candidate resource. Both filters are
  // server-side; we display whichever returns data.
  const { data: byEmail, isLoading: byEmailLoading } = useEmailDeliveries({
    recipientEmail: candidateEmail,
    limit: 50,
  });
  const { data: byResource } = useEmailDeliveries({
    resourceType: 'candidate',
    limit: 50,
  });

  const seen = new Set<string>();
  const merged = [...(byEmail?.data ?? []), ...(byResource?.data ?? [])]
    .filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return d.recipientEmail === candidateEmail || d.resourceId === candidateId;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4" /> Communications log
          <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{merged.length}</span>
        </CardTitle>
        <p className="pt-1 text-xs text-muted-foreground">
          Read-only delivery log for emails sent to or about this candidate.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {byEmailLoading && Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
        {!byEmailLoading && merged.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No emails sent to this candidate yet.
          </p>
        )}
        {merged.map((d) => (
          <div key={d.id} className="rounded-md border bg-background p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={d.status} />
              <Badge variant="outline" className="text-[10px]">{d.template}</Badge>
              <span className="truncate font-medium">{d.subject}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span>to {d.recipientEmail}</span>
              <span>via {d.provider}</span>
              {d.attempts > 1 && <span>{d.attempts} attempts</span>}
              {d.sentAt && <span>sent {new Date(d.sentAt).toLocaleString()}</span>}
            </div>
            {d.failureReason && (
              <p className="mt-1 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700">
                {d.failureReason}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: typeof Mail; class: string }> = {
    SENT:   { icon: CheckCircle2, class: 'bg-green-100 text-green-800' },
    QUEUED: { icon: Clock,        class: 'bg-blue-100 text-blue-800' },
    PENDING:{ icon: Clock,        class: 'bg-blue-100 text-blue-800' },
    FAILED: { icon: AlertCircle,  class: 'bg-red-100 text-red-800'   },
  };
  const cfg = map[status] ?? { icon: Mail, class: 'bg-gray-100 text-gray-700' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.class}`}>
      <Icon className="h-3 w-3" /> {status}
    </span>
  );
}
