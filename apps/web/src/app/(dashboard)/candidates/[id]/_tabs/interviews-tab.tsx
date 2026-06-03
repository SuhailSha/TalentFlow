'use client';

import { Calendar } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelatedEntityCard } from '@/components/workspace';
import { useInterviews } from '@/hooks/use-interviews';

import { INTERVIEW_TONE } from './shared';

interface InterviewsTabProps {
  candidateId: string;
}

export function InterviewsTab({ candidateId }: InterviewsTabProps) {
  const { data: resp, isLoading } = useInterviews({ candidateId, limit: 100 });
  const interviews = resp?.data ?? [];

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const upcoming = interviews.filter(
    (i) =>
      (i.status === 'SCHEDULED' || i.status === 'CONFIRMED' || i.status === 'RESCHEDULED') &&
      i.scheduledAt &&
      new Date(i.scheduledAt).getTime() > Date.now(),
  );
  const past = interviews.filter((i) => !upcoming.includes(i));

  if (interviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No interviews scheduled yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" /> Upcoming
              <span className="rounded bg-blue-100 px-1.5 text-xs text-blue-700">{upcoming.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((iv) => (
              <RelatedEntityCard
                key={iv.id}
                eyebrow={iv.roundLabel ?? `Round ${iv.round}`}
                icon={Calendar}
                title={`${iv.type} · ${iv.job.title}`}
                subtitle={iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleString() : 'Not scheduled'}
                status={iv.status}
                statusTone={INTERVIEW_TONE[iv.status]}
                href={`/interviews/${iv.id}`}
              />
            ))}
          </CardContent>
        </Card>
      )}
      {past.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" /> History
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{past.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {past.map((iv) => (
              <RelatedEntityCard
                key={iv.id}
                eyebrow={iv.roundLabel ?? `Round ${iv.round}`}
                title={`${iv.type} · ${iv.job.title}`}
                subtitle={iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleString() : 'Not scheduled'}
                status={iv.status}
                statusTone={INTERVIEW_TONE[iv.status]}
                href={`/interviews/${iv.id}`}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
