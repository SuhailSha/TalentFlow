'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle, Bell, Briefcase, Calendar, Clock, FileText, Send,
  TrendingUp, Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MetricTile,
  OverdueIndicator,
  RelatedEntityCard,
} from '@/components/workspace';
import { useCommandCenter } from '@/hooks/use-dashboard';

export default function DashboardPage() {
  const { data, isLoading, isError } = useCommandCenter();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-sm text-destructive">Failed to load dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  const m = data.metrics;
  const hasUrgentWork =
    m.overdueReminders.count > 0 ||
    m.pendingFeedback.count > 0 ||
    m.stalledSubmissions.count > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Command center</h1>
        <p className="text-sm text-muted-foreground">
          {hasUrgentWork
            ? 'Action-required items across the platform.'
            : 'All caught up. No urgent items.'}
        </p>
      </header>

      {/* Metric tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricTile
          label="Overdue reminders"
          value={m.overdueReminders.count}
          icon={Bell}
          tone={m.overdueReminders.count > 0 ? 'danger' : 'default'}
          href="/reminders?status=PENDING"
        />
        <MetricTile
          label="Feedback pending"
          value={m.pendingFeedback.count}
          icon={FileText}
          tone={m.pendingFeedback.count > 0 ? 'warning' : 'default'}
          href="/interviews?status=FEEDBACK_PENDING"
        />
        <MetricTile
          label="Upcoming interviews"
          value={m.upcomingInterviews.count}
          hint={m.upcomingInterviews.next24h > 0
            ? `${m.upcomingInterviews.next24h} in next 24h`
            : 'Next 7 days'}
          icon={Calendar}
          tone={m.upcomingInterviews.next24h > 0 ? 'info' : 'default'}
          href="/interviews"
        />
        <MetricTile
          label="Stalled submissions"
          value={m.stalledSubmissions.count}
          hint="No activity in 7+ days"
          icon={Clock}
          tone={m.stalledSubmissions.count > 0 ? 'warning' : 'default'}
          href="/submissions"
        />
        <MetricTile
          label="Open jobs"
          value={m.activeJobs.count}
          icon={Briefcase}
          tone="info"
          href="/jobs?status=OPEN"
        />
        <MetricTile
          label="Active candidates"
          value={m.activeCandidates.count}
          icon={Users}
          href="/candidates"
        />
      </div>

      {/* Two-column action lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent reminders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Urgent reminders
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">
                {data.urgentReminders.length}
              </span>
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/reminders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.urgentReminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No urgent reminders.</p>
            ) : (
              data.urgentReminders.map((r) => {
                const href = r.submissionId
                  ? `/submissions/${r.submissionId}`
                  : r.interviewId
                    ? `/interviews/${r.interviewId}`
                    : r.candidateId
                      ? `/candidates/${r.candidateId}`
                      : r.jobId
                        ? `/jobs/${r.jobId}`
                        : '/reminders';
                return (
                  <RelatedEntityCard
                    key={r.id}
                    eyebrow={r.priority}
                    icon={Bell}
                    title={r.title}
                    status={r.status}
                    statusTone={r.priority === 'CRITICAL' ? 'red' : 'amber'}
                    href={href}
                    meta={<OverdueIndicator dueAt={r.dueAt} />}
                  />
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Feedback pending */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-amber-600" />
              Feedback pending
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">
                {data.pendingFeedbackList.length}
              </span>
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/interviews?status=FEEDBACK_PENDING">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingFeedbackList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback awaiting submission.</p>
            ) : (
              data.pendingFeedbackList.map((iv) => (
                <RelatedEntityCard
                  key={iv.id}
                  eyebrow={iv.roundLabel ?? `Round ${iv.round}`}
                  icon={FileText}
                  title={iv.candidateName}
                  subtitle={`${iv.jobReqId} · ${iv.jobTitle}`}
                  status={iv.status}
                  statusTone="amber"
                  href={`/interviews/${iv.id}`}
                  meta={
                    iv.completedAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(iv.completedAt), { addSuffix: true })}
                      </span>
                    )
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming interviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-blue-600" />
              Upcoming interviews
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">
                {data.upcomingInterviewList.length}
              </span>
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/interviews">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingInterviewList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No interviews scheduled in the next 7 days.</p>
            ) : (
              data.upcomingInterviewList.map((iv) => (
                <RelatedEntityCard
                  key={iv.id}
                  eyebrow={iv.roundLabel ?? `Round ${iv.round}`}
                  icon={Calendar}
                  title={iv.candidateName}
                  subtitle={`${iv.type} · ${iv.jobTitle}`}
                  status={iv.status}
                  statusTone={iv.status === 'CONFIRMED' ? 'green' : 'blue'}
                  href={`/interviews/${iv.id}`}
                  meta={
                    iv.scheduledAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(iv.scheduledAt), { addSuffix: true })}
                      </span>
                    )
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Stalled submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-600" />
              Stalled submissions
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">
                {data.stalledSubmissionList.length}
              </span>
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/submissions">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.stalledSubmissionList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stalled submissions.</p>
            ) : (
              data.stalledSubmissionList.map((s) => (
                <RelatedEntityCard
                  key={s.id}
                  eyebrow={`Stalled ${s.daysStalled}d`}
                  icon={Send}
                  title={s.candidateName}
                  subtitle={`${s.jobReqId} · ${s.jobTitle}`}
                  status={s.status}
                  statusTone="amber"
                  href={`/submissions/${s.id}`}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recruiter workload */}
      {data.recruiterWorkload.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              Recruiter workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recruiterWorkload.map((r) => {
                const max = Math.max(...data.recruiterWorkload.map((x) => x.activeSubmissions));
                const pct = (r.activeSubmissions / max) * 100;
                return (
                  <div key={r.userId} className="flex items-center gap-3 text-sm">
                    <span className="w-40 truncate font-medium">{r.name}</span>
                    <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded bg-primary/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right tabular-nums">{r.activeSubmissions}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Active submissions per owner. Top 5 shown.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
