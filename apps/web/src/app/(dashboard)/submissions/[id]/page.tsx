'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity, AlertCircle, ArrowRight, Bell, Briefcase, Building2,
  Calendar, CheckCircle2, ChevronDown, Clock, FileText, MessageSquare,
  PauseCircle, PlayCircle, Send, Sparkles, Trash2, User, XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ActivityTimeline,
  NextActionsPanel,
  OverdueIndicator,
  RelatedEntityCard,
  StaleIndicator,
  WorkspaceFact,
  WorkspaceHeader,
  WorkspaceShell,
  type NextAction,
} from '@/components/workspace';
import {
  useSubmission,
  useChangeSubmissionStatus,
  useAddSubmissionNote,
  useDeleteSubmission,
} from '@/hooks/use-submissions';
import { useInterviews } from '@/hooks/use-interviews';
import { useReminders } from '@/hooks/use-reminders';
import { useEntityActivity } from '@/hooks/use-activity';
import type { SubmissionStatus } from '@/types/submissions';
import type { InterviewStatus } from '@/types/interviews';
import type { ReminderStatus } from '@/types/reminders';
import { cn } from '@/lib/utils';

// ── Lookups ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview', OFFERED: 'Offered',
  PLACED: 'Placed', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
  ON_HOLD: 'On Hold', CLOSED: 'Closed',
};

const STATUS_TONE: Record<SubmissionStatus, string> = {
  DRAFT:        'bg-gray-100 text-gray-700',
  SUBMITTED:    'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  SHORTLISTED:  'bg-purple-100 text-purple-700',
  INTERVIEW:    'bg-indigo-100 text-indigo-700',
  OFFERED:      'bg-orange-100 text-orange-700',
  PLACED:       'bg-green-100 text-green-700',
  REJECTED:     'bg-red-100 text-red-700',
  WITHDRAWN:    'bg-gray-100 text-gray-500',
  ON_HOLD:      'bg-amber-100 text-amber-700',
  CLOSED:       'bg-slate-100 text-slate-600',
};

const TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  DRAFT:        ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED:    ['UNDER_REVIEW', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  UNDER_REVIEW: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  SHORTLISTED:  ['INTERVIEW', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  INTERVIEW:    ['OFFERED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  OFFERED:      ['PLACED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  ON_HOLD:      ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN'],
  PLACED:       ['CLOSED'],
  REJECTED:     ['CLOSED'],
  WITHDRAWN:    ['CLOSED'],
  CLOSED:       [],
};

const PIPELINE_STAGES: SubmissionStatus[] = [
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'PLACED',
];

const TERMINAL_STATUSES: SubmissionStatus[] = ['PLACED', 'REJECTED', 'WITHDRAWN', 'CLOSED'];

const INTERVIEW_STATUS_TONE: Record<InterviewStatus, 'gray' | 'amber' | 'indigo' | 'green' | 'red' | 'blue'> = {
  SCHEDULED: 'blue',
  CONFIRMED: 'indigo',
  RESCHEDULED: 'amber',
  IN_PROGRESS: 'indigo',
  COMPLETED: 'gray',
  FEEDBACK_PENDING: 'amber',
  PASSED: 'green',
  FAILED: 'red',
  NO_SHOW: 'red',
  CANCELLED: 'gray',
};

const REMINDER_TONE: Record<ReminderStatus, 'gray' | 'amber' | 'blue' | 'green' | 'red'> = {
  PENDING: 'blue',
  ACKNOWLEDGED: 'amber',
  SNOOZED: 'gray',
  COMPLETED: 'green',
  DISMISSED: 'gray',
  EXPIRED: 'red',
};

// ── Pipeline progress bar ─────────────────────────────────────────────────────

function PipelineProgress({ status }: { status: SubmissionStatus }) {
  // Terminal non-PLACED statuses don't live on the linear pipeline.
  const currentIndex = PIPELINE_STAGES.indexOf(status);
  const isTerminalNonPlaced = TERMINAL_STATUSES.includes(status) && status !== 'PLACED' && status !== 'CLOSED';
  const isOnHold = status === 'ON_HOLD';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Pipeline stage</CardTitle>
      </CardHeader>
      <CardContent>
        {isTerminalNonPlaced ? (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <XCircle className="h-4 w-4" />
            Closed at <strong>{STATUS_LABELS[status]}</strong>. No further progression.
          </div>
        ) : isOnHold ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <PauseCircle className="h-4 w-4" />
            Pipeline is on hold. Resume to continue.
          </div>
        ) : (
          <ol className="grid grid-cols-7 gap-1.5">
            {PIPELINE_STAGES.map((s, i) => {
              const reached = currentIndex >= i;
              const isCurrent = currentIndex === i;
              return (
                <li key={s} className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'h-1.5 w-full rounded-full',
                      reached ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                  <span className={cn(
                    'text-[10px] uppercase tracking-wide',
                    isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}>
                    {STATUS_LABELS[s]}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function SkeletonDetail() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-20" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-60" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-60" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubmissionWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: submission, isLoading, isError } = useSubmission(id);
  const { data: interviewsResp } = useInterviews({ submissionId: id, limit: 50 });
  const { data: remindersResp } = useReminders({ submissionId: id, limit: 20 });
  const { data: activity = [], isLoading: activityLoading } = useEntityActivity('submission', id, 30);

  const changeStatus = useChangeSubmissionStatus(id);
  const addNote = useAddSubmissionNote(id);
  const deleteSubmission = useDeleteSubmission();

  const [noteText, setNoteText] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const interviews = interviewsResp?.data ?? [];
  const reminders = remindersResp?.data ?? [];

  const allowedTransitions = useMemo(
    () => (submission ? TRANSITIONS[submission.status] : []),
    [submission],
  );

  // Find interviews needing recruiter attention
  const pendingFeedbackInterview = interviews.find(
    (i) => i.status === 'FEEDBACK_PENDING' || i.status === 'COMPLETED',
  );
  const upcomingInterview = interviews.find(
    (i) => (i.status === 'SCHEDULED' || i.status === 'CONFIRMED' || i.status === 'RESCHEDULED')
      && i.scheduledAt && new Date(i.scheduledAt).getTime() > Date.now(),
  );
  const openReminders = reminders.filter(
    (r) => r.status === 'PENDING' || r.status === 'ACKNOWLEDGED' || r.status === 'SNOOZED',
  );
  const overdueReminders = openReminders.filter(
    (r) => r.dueAt && new Date(r.dueAt).getTime() < Date.now(),
  );

  // ── Next actions logic ──────────────────────────────────────────────────────
  const nextActions: NextAction[] = useMemo(() => {
    if (!submission) return [];
    const actions: NextAction[] = [];
    const s = submission.status;

    if (s === 'DRAFT') {
      actions.push({
        id: 'submit', label: 'Submit to client', icon: Send, primary: true,
        hint: 'Mark as formally submitted',
        onClick: () => changeStatus.mutate({ status: 'SUBMITTED' }),
      });
    }
    if (s === 'SUBMITTED') {
      actions.push({
        id: 'review', label: 'Mark as under review', icon: PlayCircle, primary: true,
        hint: 'Client has begun reviewing',
        onClick: () => changeStatus.mutate({ status: 'UNDER_REVIEW' }),
      });
    }
    if (s === 'UNDER_REVIEW') {
      actions.push({
        id: 'shortlist', label: 'Shortlist candidate', icon: CheckCircle2, primary: true,
        hint: 'Client wants to interview',
        onClick: () => changeStatus.mutate({ status: 'SHORTLISTED' }),
      });
    }
    if (s === 'SHORTLISTED') {
      actions.push({
        id: 'schedule', label: 'Schedule interview', icon: Calendar, primary: true,
        hint: 'Move forward to the interview round',
        href: `/interviews/new?submissionId=${id}&candidateId=${submission.candidate.id}&jobId=${submission.job.id}`,
      });
    }
    if (s === 'INTERVIEW') {
      if (pendingFeedbackInterview) {
        actions.push({
          id: 'feedback', label: 'Submit interview feedback', icon: FileText, urgent: true,
          hint: `${pendingFeedbackInterview.roundLabel ?? `Round ${pendingFeedbackInterview.round}`} is awaiting feedback`,
          href: `/interviews/${pendingFeedbackInterview.id}`,
        });
      } else if (!upcomingInterview) {
        actions.push({
          id: 'schedule-next', label: 'Schedule next round', icon: Calendar, primary: true,
          href: `/interviews/new?submissionId=${id}&candidateId=${submission.candidate.id}&jobId=${submission.job.id}`,
        });
      } else {
        actions.push({
          id: 'view-interview', label: 'Open scheduled interview', icon: Calendar,
          hint: `Scheduled for ${new Date(upcomingInterview.scheduledAt!).toLocaleString()}`,
          href: `/interviews/${upcomingInterview.id}`,
        });
      }
      actions.push({
        id: 'offer', label: 'Extend offer', icon: Sparkles,
        hint: 'Candidate cleared interviews',
        onClick: () => changeStatus.mutate({ status: 'OFFERED' }),
      });
    }
    if (s === 'OFFERED') {
      actions.push({
        id: 'place', label: 'Confirm placement', icon: CheckCircle2, primary: true,
        hint: 'Offer accepted',
        onClick: () => changeStatus.mutate({ status: 'PLACED' }),
      });
    }
    if (s === 'ON_HOLD') {
      actions.push({
        id: 'resume', label: 'Resume submission', icon: PlayCircle, primary: true,
        hint: 'Return to active pipeline',
        onClick: () => changeStatus.mutate({ status: 'SUBMITTED' }),
      });
    }
    if (s === 'PLACED' || s === 'REJECTED' || s === 'WITHDRAWN') {
      actions.push({
        id: 'close', label: 'Close submission', icon: XCircle,
        hint: 'Mark engagement as complete',
        onClick: () => changeStatus.mutate({ status: 'CLOSED' }),
      });
    }
    if (overdueReminders.length > 0) {
      actions.unshift({
        id: 'overdue-reminders',
        label: `${overdueReminders.length} overdue reminder${overdueReminders.length > 1 ? 's' : ''}`,
        icon: Bell, urgent: true,
        hint: 'Address overdue items',
        href: `/reminders?submissionId=${id}`,
      });
    }
    return actions;
  }, [submission, id, pendingFeedbackInterview, upcomingInterview, overdueReminders, changeStatus]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) return <SkeletonDetail />;
  if (isError || !submission) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-sm text-destructive">Submission not found.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/submissions">Back to submissions</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const c = submission.candidate;
  const j = submission.job;

  function handleAddNote() {
    if (!noteText.trim()) return;
    addNote.mutate({ content: noteText.trim() }, { onSuccess: () => setNoteText('') });
  }

  function handleDelete() {
    deleteSubmission.mutate(id, { onSuccess: () => router.push('/submissions') });
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Submission"
        title={`${c.firstName} ${c.lastName}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            <Link href={`/jobs/${j.id}`} className="hover:underline">{j.reqId} · {j.title}</Link>
            {j.department && <span className="text-muted-foreground">— {j.department}</span>}
          </span>
        }
        breadcrumbs={[
          { title: 'Submissions', href: '/submissions' },
          { title: `${c.firstName} ${c.lastName} → ${j.reqId}` },
        ]}
        badges={
          <>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', STATUS_TONE[submission.status])}>
              {STATUS_LABELS[submission.status]}
            </span>
            <StaleIndicator lastActivityAt={submission.updatedAt} thresholdDays={7} />
            {pendingFeedbackInterview && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                <AlertCircle className="h-3 w-3" />
                Feedback pending
              </span>
            )}
            {overdueReminders.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                <Bell className="h-3 w-3" />
                {overdueReminders.length} overdue
              </span>
            )}
          </>
        }
        actions={
          <>
            {allowedTransitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    Advance status <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Move to</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allowedTransitions.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => changeStatus.mutate({ status: s, reason: statusReason || undefined })}
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      {STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteSubmission.isPending}>
              <Trash2 className="mr-1 h-4 w-4" /> Archive
            </Button>
          </>
        }
        facts={
          <>
            <WorkspaceFact label="Owner">
              {submission.owner.firstName} {submission.owner.lastName}
            </WorkspaceFact>
            <WorkspaceFact label="Submitted">
              {submission.submittedAt
                ? new Date(submission.submittedAt).toLocaleDateString()
                : '—'}
            </WorkspaceFact>
            <WorkspaceFact label="Last activity">
              {formatDistanceToNow(new Date(submission.updatedAt), { addSuffix: true })}
            </WorkspaceFact>
            <WorkspaceFact label="Bill / Pay rate">
              {submission.billRate !== null || submission.payRate !== null
                ? `${submission.currency} ${submission.billRate ?? '—'} / ${submission.payRate ?? '—'}`
                : '—'}
            </WorkspaceFact>
          </>
        }
      />

      <WorkspaceShell
        rail={
          <>
            <NextActionsPanel
              actions={nextActions}
              emptyMessage={submission.status === 'CLOSED' ? 'Engagement is closed.' : 'No actions required.'}
            />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <RelatedEntityCard
                  eyebrow="Candidate"
                  icon={User}
                  title={`${c.firstName} ${c.lastName}`}
                  subtitle={c.currentTitle ?? c.email}
                  href={`/candidates/${c.id}`}
                />
                <RelatedEntityCard
                  eyebrow="Job"
                  icon={Briefcase}
                  title={j.title}
                  subtitle={j.reqId + (j.department ? ` · ${j.department}` : '')}
                  href={`/jobs/${j.id}`}
                />
                {submission.vendor && (
                  <RelatedEntityCard
                    eyebrow="Vendor"
                    icon={Building2}
                    title={submission.vendor.companyName}
                    href={`/vendors/${submission.vendor.id}`}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Activity</CardTitle>
                <span className="text-xs text-muted-foreground">{activity.length}</span>
              </CardHeader>
              <CardContent>
                <ActivityTimeline
                  entries={activity}
                  loading={activityLoading}
                  emptyMessage="No recorded activity yet."
                />
              </CardContent>
            </Card>
          </>
        }
      >
        <PipelineProgress status={submission.status} />

        {/* Interviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              Interviews
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{interviews.length}</span>
            </CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link href={`/interviews/new?submissionId=${id}&candidateId=${c.id}&jobId=${j.id}`}>
                <Calendar className="mr-1 h-3.5 w-3.5" />
                Schedule
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {interviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
            ) : (
              interviews.map((iv) => (
                <RelatedEntityCard
                  key={iv.id}
                  eyebrow={iv.roundLabel ?? `Round ${iv.round}`}
                  icon={Calendar}
                  title={`${iv.type} · ${iv.interviewerName ?? 'No interviewer'}`}
                  subtitle={
                    iv.scheduledAt
                      ? new Date(iv.scheduledAt).toLocaleString()
                      : 'Not scheduled'
                  }
                  status={iv.status}
                  statusTone={INTERVIEW_STATUS_TONE[iv.status]}
                  href={`/interviews/${iv.id}`}
                  meta={
                    iv.status === 'FEEDBACK_PENDING' || iv.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertCircle className="h-3 w-3" />
                        Feedback
                      </span>
                    ) : undefined
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Reminders */}
        {openReminders.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bell className="h-4 w-4" />
                Open reminders
                <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{openReminders.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {openReminders.map((r) => (
                <RelatedEntityCard
                  key={r.id}
                  eyebrow={r.priority}
                  icon={Bell}
                  title={r.title}
                  subtitle={r.description ?? undefined}
                  status={r.status}
                  statusTone={REMINDER_TONE[r.status]}
                  href={`/reminders?id=${r.id}`}
                  meta={<OverdueIndicator dueAt={r.dueAt} />}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Add note + notes list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              Notes
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{submission.notes.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Textarea
                placeholder="Add a note about this submission…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
              />
              <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || addNote.isPending}>
                {addNote.isPending ? 'Saving…' : 'Add note'}
              </Button>
            </div>

            {submission.notes.length > 0 && (
              <div className="space-y-3 border-t pt-3">
                {submission.notes.map((n) => (
                  <div key={n.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{n.authorName ?? n.authorEmail ?? 'System'}</span>
                      <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status reason input — only shown when a status change is in flight */}
        {allowedTransitions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                Status change reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Optional context for the next status change (e.g., 'Client confirmed shortlist on call')"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows={2}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                If set, the next status transition (via Advance status) will record this reason.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Status history (compact) */}
        {submission.statusHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Status history
                <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{submission.statusHistory.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {submission.statusHistory.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {new Date(h.createdAt).toLocaleDateString()}
                  </span>
                  {h.fromStatus && (
                    <>
                      <span className={cn('inline-flex rounded px-1.5 py-0.5 font-medium', STATUS_TONE[h.fromStatus])}>
                        {STATUS_LABELS[h.fromStatus]}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                  <span className={cn('inline-flex rounded px-1.5 py-0.5 font-medium', STATUS_TONE[h.toStatus])}>
                    {STATUS_LABELS[h.toStatus]}
                  </span>
                  <span className="ml-auto text-muted-foreground">{h.changedByName}</span>
                  {h.reason && (
                    <p className="basis-full pl-1 text-xs italic text-muted-foreground">{h.reason}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </WorkspaceShell>
    </div>
  );
}
