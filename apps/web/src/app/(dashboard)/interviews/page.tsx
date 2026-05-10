'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, CalendarClock } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useInterviews, useInterviewStats } from '@/hooks/use-interviews';
import type {
  InterviewListItem,
  InterviewStatus,
  ListInterviewsParams,
} from '@/types/interviews';
import {
  FSM_TRANSITIONS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
} from '@/types/interviews';

const STATUS_COLORS: Record<InterviewStatus, string> = {
  SCHEDULED:        'bg-blue-100 text-blue-800',
  CONFIRMED:        'bg-green-100 text-green-800',
  RESCHEDULED:      'bg-amber-100 text-amber-800',
  IN_PROGRESS:      'bg-indigo-100 text-indigo-800',
  COMPLETED:        'bg-gray-100 text-gray-700',
  FEEDBACK_PENDING: 'bg-orange-100 text-orange-800',
  PASSED:           'bg-emerald-100 text-emerald-800',
  FAILED:           'bg-red-100 text-red-800',
  NO_SHOW:          'bg-rose-100 text-rose-800',
  CANCELLED:        'bg-slate-100 text-slate-600',
};

const NEEDS_ACTION_STATUSES: InterviewStatus[] = ['FEEDBACK_PENDING', 'NO_SHOW'];
const UPCOMING_STATUSES: InterviewStatus[] = ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'];

function InterviewRow({ interview }: { interview: InterviewListItem }) {
  const c = interview.candidate;
  const j = interview.job;
  const hasNextSteps = (FSM_TRANSITIONS[interview.status] ?? []).length > 0;

  return (
    <Link
      href={`/interviews/${interview.id}`}
      className="block rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {c.firstName} {c.lastName}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[interview.status]}`}
            >
              {INTERVIEW_STATUS_LABELS[interview.status]}
            </span>
            {hasNextSteps && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                Action needed
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {j.reqId} · {j.title}
            {j.department ? ` — ${j.department}` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Round {interview.round}
            {interview.roundLabel ? ` · ${interview.roundLabel}` : ''}
            {' · '}
            {INTERVIEW_TYPE_LABELS[interview.type]}
          </p>
        </div>

        <div className="shrink-0 text-right space-y-1">
          <p className="text-xs text-muted-foreground">
            {interview.owner.firstName} {interview.owner.lastName}
          </p>
          {interview.scheduledAt && (
            <p className="text-xs font-medium text-foreground">
              {new Date(interview.scheduledAt).toLocaleDateString()}{' '}
              {new Date(interview.scheduledAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {interview.interviewerName && (
            <p className="text-xs text-muted-foreground">{interview.interviewerName}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function InterviewRowSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="space-y-1 text-right">
          <Skeleton className="h-3 w-24 ml-auto" />
          <Skeleton className="h-3 w-28 ml-auto" />
        </div>
      </div>
    </div>
  );
}

function StatsBar() {
  const { data } = useInterviewStats();
  if (!data) return null;

  return (
    <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
      <span>{data.total} total</span>
      {data.upcoming > 0 && (
        <span className="text-blue-700 font-medium">{data.upcoming} upcoming</span>
      )}
      {data.feedbackPending > 0 && (
        <span className="text-orange-700 font-medium">{data.feedbackPending} feedback pending</span>
      )}
      {data.noShows > 0 && (
        <span className="text-rose-700 font-medium">{data.noShows} no-shows</span>
      )}
      {data.completedToday > 0 && (
        <span className="text-emerald-700 font-medium">{data.completedToday} completed today</span>
      )}
    </div>
  );
}

type TabFilter = 'needs_action' | 'upcoming' | 'all';

export default function InterviewsPage() {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<TabFilter>('needs_action');

  const params: ListInterviewsParams = {
    page,
    limit: 20,
    sortBy: 'scheduledAt',
    sortOrder: 'asc',
    ...(tab === 'needs_action' && { status: NEEDS_ACTION_STATUSES }),
    ...(tab === 'upcoming' && { status: UPCOMING_STATUSES }),
  };

  const { data, isLoading, isError } = useInterviews(params);

  const handleTab = useCallback((t: TabFilter) => {
    setTab(t);
    setPage(1);
  }, []);

  const totalPages = data?.meta.totalPages ?? 1;

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'needs_action', label: 'Needs Action' },
    { key: 'upcoming',     label: 'Upcoming' },
    { key: 'all',          label: 'All' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interviews"
        description="Manage scheduling, feedback, and interview pipeline"
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Interviews' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/interviews/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Schedule interview
            </Link>
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <StatsBar />
        <div className="flex gap-1">
          {tabs.map((t) => (
            <Button
              key={t.key}
              variant={tab === t.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTab(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">Failed to load interviews. Please try again.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <InterviewRowSkeleton key={i} />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">
              {tab === 'needs_action'
                ? 'No interviews need action'
                : tab === 'upcoming'
                ? 'No upcoming interviews'
                : 'No interviews yet'}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/interviews/new">Schedule an interview</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data?.data.map((i) => <InterviewRow key={i.id} interview={i} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data?.meta.total} total &bull; page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
