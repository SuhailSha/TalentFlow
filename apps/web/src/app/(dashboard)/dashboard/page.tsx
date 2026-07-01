'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle, Bell, Briefcase, Calendar, Clock, FileText, Send,
  TrendingUp, Users, Zap,
} from 'lucide-react';
import Link from 'next/link';

import {
  CommandCenter, CommandCenterItem,
  DashboardGreeting,
  KpiStrip, KpiTile,
} from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OverdueIndicator, RelatedEntityCard } from '@/components/workspace';
import { useCommandCenter } from '@/hooks/use-dashboard';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useCommandCenter();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 flex-1 min-w-[160px]" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
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
  const actionCount =
    m.overdueReminders.count +
    m.pendingFeedback.count +
    m.stalledSubmissions.count;

  return (
    <div className="space-y-6">
      <DashboardGreeting
        firstName={user?.firstName}
        actionCount={actionCount}
        workspaceName={user?.organizationName}
      />

      {/* KPI strip */}
      <KpiStrip>
        <KpiTile
          label="Overdue reminders"
          value={m.overdueReminders.count}
          icon={Bell}
          tone={m.overdueReminders.count > 0 ? 'danger' : 'default'}
          href="/reminders?status=PENDING"
        />
        <KpiTile
          label="Feedback pending"
          value={m.pendingFeedback.count}
          icon={FileText}
          tone={m.pendingFeedback.count > 0 ? 'warning' : 'default'}
          href="/interviews?status=FEEDBACK_PENDING"
        />
        <KpiTile
          label="Upcoming interviews"
          value={m.upcomingInterviews.count}
          icon={Calendar}
          tone={m.upcomingInterviews.next24h > 0 ? 'info' : 'default'}
          delta={m.upcomingInterviews.next24h > 0
            ? { text: `${m.upcomingInterviews.next24h} in 24h`, direction: 'neutral' }
            : undefined}
          href="/interviews"
        />
        <KpiTile
          label="Stalled submissions"
          value={m.stalledSubmissions.count}
          icon={Clock}
          tone={m.stalledSubmissions.count > 0 ? 'warning' : 'default'}
          href="/submissions"
        />
        <KpiTile
          label="Open jobs"
          value={m.activeJobs.count}
          icon={Briefcase}
          tone="info"
          href="/jobs?status=OPEN"
        />
        <KpiTile
          label="Active candidates"
          value={m.activeCandidates.count.toLocaleString()}
          icon={Users}
          href="/candidates"
        />
      </KpiStrip>

      {/* AI Command Center — synthesizes action-required items into a single feed */}
      <CommandCenter
        refreshedLabel="Refreshed just now"
        empty="All clear. No action items surfaced right now."
      >
        {data.urgentReminders.length > 0 && (
          <CommandCenterItem
            key="cc:urgent-reminders"
            severity="urgent"
            icon={Zap}
            title={`${data.urgentReminders.length} urgent reminder${data.urgentReminders.length === 1 ? '' : 's'} need action`}
            hint={data.urgentReminders.slice(0, 2).map((r) => r.title).join(' · ')}
            actions={
              <Button asChild size="sm">
                <Link href="/reminders">Triage</Link>
              </Button>
            }
          />
        )}
        {data.pendingFeedbackList.length > 0 && (
          <CommandCenterItem
            key="cc:pending-feedback"
            severity="warning"
            icon={FileText}
            title={`${data.pendingFeedbackList.length} interview feedback${data.pendingFeedbackList.length === 1 ? '' : 's'} awaiting submission`}
            hint="Panelists still owe you feedback — nudge to unblock candidate movement"
            actions={
              <Button asChild size="sm" variant="outline">
                <Link href="/interviews?status=FEEDBACK_PENDING">View</Link>
              </Button>
            }
          />
        )}
        {m.stalledSubmissions.count > 0 && (
          <CommandCenterItem
            key="cc:stalled-submissions"
            severity="warning"
            icon={AlertTriangle}
            title={`${m.stalledSubmissions.count} submission${m.stalledSubmissions.count === 1 ? '' : 's'} stalled (no activity 7d+)`}
            hint="Candidates that don't move go cold — reactivate or archive"
            actions={
              <Button asChild size="sm" variant="outline">
                <Link href="/submissions">Review</Link>
              </Button>
            }
          />
        )}
        {m.upcomingInterviews.next24h > 0 && (
          <CommandCenterItem
            key="cc:next-24h"
            severity="info"
            icon={Calendar}
            title={`${m.upcomingInterviews.next24h} interview${m.upcomingInterviews.next24h === 1 ? '' : 's'} in the next 24 hours`}
            hint="Confirm attendance, panel availability, and interviewer notes"
            actions={
              <Button asChild size="sm" variant="outline">
                <Link href="/interviews">Prep</Link>
              </Button>
            }
          />
        )}
        {actionCount === 0 && m.upcomingInterviews.next24h === 0 && (
          <CommandCenterItem
            key="cc:all-clear"
            severity="info"
            icon={TrendingUp}
            title="You're all caught up"
            hint="Nothing surfaced by the priority feed right now."
          />
        )}
      </CommandCenter>

      {/* Two-column action lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Urgent reminders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-red-600" aria-hidden />
              Urgent reminders
              <span className="rounded bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
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
                const href = r.submissionId ? `/submissions/${r.submissionId}`
                  : r.interviewId  ? `/interviews/${r.interviewId}`
                  : r.candidateId  ? `/candidates/${r.candidateId}`
                  : r.jobId        ? `/jobs/${r.jobId}`
                  :                 '/reminders';
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
              <FileText className="h-4 w-4 text-amber-600" aria-hidden />
              Feedback pending
              <span className="rounded bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
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
                    iv.completedAt
                      ? <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(iv.completedAt), { addSuffix: true })}
                        </span>
                      : undefined
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
              <Calendar className="h-4 w-4 text-blue-600" aria-hidden />
              Upcoming interviews
              <span className="rounded bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
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
                    iv.scheduledAt
                      ? <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(iv.scheduledAt), { addSuffix: true })}
                        </span>
                      : undefined
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
              <Clock className="h-4 w-4 text-amber-600" aria-hidden />
              Stalled submissions
              <span className="rounded bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
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
              <TrendingUp className="h-4 w-4" aria-hidden />
              Recruiter workload
              <span className="text-[11px] font-normal text-muted-foreground">
                · Active submissions per owner
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recruiterWorkload.map((r) => {
                const max = Math.max(...data.recruiterWorkload.map((x) => x.activeSubmissions));
                const pct = max > 0 ? (r.activeSubmissions / max) * 100 : 0;
                return (
                  <div key={r.userId} className="flex items-center gap-3 text-sm">
                    <span className="w-40 truncate font-medium">{r.name}</span>
                    <div className="relative h-3 flex-1 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded bg-brand-500/80"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right tabular-nums text-muted-foreground">
                      {r.activeSubmissions}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
