'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { differenceInCalendarDays, formatDistanceToNow } from 'date-fns';
import {
  AlertCircle, Archive, Briefcase, Calendar, ChevronDown, Clock, DollarSign,
  Edit, FileText, Loader2, MapPin, MessageSquare, Plus, Send, Target, TrendingUp,
  User as UserIcon, Users, X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
  MetricTile,
  NextActionsPanel,
  RelatedEntityCard,
  StaleIndicator,
  UrgencyIndicator,
  WorkspaceFact,
  WorkspaceHeader,
  WorkspaceShell,
  type NextAction,
} from '@/components/workspace';
import { useJob, useJobNotes, useAddJobNote, useRemoveJobSkill, useTransitionJobStatus } from '@/hooks/use-jobs';
import { useSubmissions } from '@/hooks/use-submissions';
import { useInterviews } from '@/hooks/use-interviews';
import { useEntityActivity } from '@/hooks/use-activity';
import { useAuthContext } from '@/providers/auth-provider';
import type { JobStatus } from '@/types/jobs';
import type { SubmissionStatus } from '@/types/submissions';
import type { InterviewStatus } from '@/types/interviews';
import { cn } from '@/lib/utils';

type NoteType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'STATUS_CHANGE' | 'SYSTEM';

// ── Lookups ───────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<JobStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-700',
  OPEN:      'bg-green-100 text-green-800',
  ON_HOLD:   'bg-yellow-100 text-yellow-800',
  FILLED:    'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-700',
  ARCHIVED:  'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: 'Draft', OPEN: 'Open', ON_HOLD: 'On Hold',
  FILLED: 'Filled', CANCELLED: 'Cancelled', ARCHIVED: 'Archived',
};

const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT:     ['OPEN'],
  OPEN:      ['ON_HOLD', 'FILLED', 'CANCELLED'],
  ON_HOLD:   ['OPEN', 'CANCELLED'],
  FILLED:    ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED:  [],
};

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  NOTE: 'Note', CALL: 'Call', EMAIL: 'Email', MEETING: 'Meeting',
  STATUS_CHANGE: 'Status change', SYSTEM: 'System',
};

const PRIORITY_TO_INDICATOR: Record<string, 'low' | 'normal' | 'high' | 'urgent'> = {
  LOW: 'low', NORMAL: 'normal', HIGH: 'high', URGENT: 'urgent',
};

const PIPELINE_STAGES: SubmissionStatus[] = [
  'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'PLACED',
];

const SUBMISSION_TONE: Record<SubmissionStatus, 'gray' | 'blue' | 'amber' | 'purple' | 'indigo' | 'green' | 'red' | 'teal'> = {
  DRAFT: 'gray', SUBMITTED: 'blue', UNDER_REVIEW: 'amber', SHORTLISTED: 'purple',
  INTERVIEW: 'indigo', OFFERED: 'amber', PLACED: 'green', REJECTED: 'red',
  WITHDRAWN: 'gray', ON_HOLD: 'amber', CLOSED: 'gray',
};

const INTERVIEW_TONE: Record<InterviewStatus, 'gray' | 'amber' | 'indigo' | 'green' | 'red' | 'blue'> = {
  SCHEDULED: 'blue', CONFIRMED: 'indigo', RESCHEDULED: 'amber', IN_PROGRESS: 'indigo',
  COMPLETED: 'gray', FEEDBACK_PENDING: 'amber', PASSED: 'green', FAILED: 'red',
  NO_SHOW: 'red', CANCELLED: 'gray',
};

// ── Pipeline funnel ───────────────────────────────────────────────────────────

function PipelineFunnel({ counts }: { counts: Record<SubmissionStatus, number> }) {
  const max = Math.max(1, ...PIPELINE_STAGES.map((s) => counts[s] ?? 0));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4" />
          Submission funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {PIPELINE_STAGES.map((s) => {
            const n = counts[s] ?? 0;
            const pct = (n / max) * 100;
            return (
              <div key={s} className="flex items-center gap-3 text-xs">
                <span className="w-24 text-muted-foreground">{s.replace('_', ' ')}</span>
                <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className={cn('h-full rounded', n > 0 ? 'bg-primary/70' : 'bg-transparent')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right font-medium tabular-nums">{n}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-20" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuthContext();

  const { data: job, isLoading, isError } = useJob(id);
  const { data: notes } = useJobNotes(id);
  const { data: submissionsResp } = useSubmissions({ jobId: id, limit: 100 });
  const { data: interviewsResp } = useInterviews({ jobId: id, limit: 50 });
  const { data: activity = [], isLoading: activityLoading } = useEntityActivity('job', id, 30);

  const addNoteMutation = useAddJobNote(id);
  const removeSkillMutation = useRemoveJobSkill(id);
  const transitionMutation = useTransitionJobStatus(id);

  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('NOTE');

  const canUpdate = hasPermission('jobs:update');

  const submissions = submissionsResp?.data ?? [];
  const interviews = interviewsResp?.data ?? [];

  const activeSubmissions = submissions.filter(
    (s) => !['CLOSED', 'REJECTED', 'WITHDRAWN'].includes(s.status),
  );
  const upcomingInterviews = interviews.filter(
    (i) =>
      (i.status === 'SCHEDULED' || i.status === 'CONFIRMED' || i.status === 'RESCHEDULED') &&
      i.scheduledAt &&
      new Date(i.scheduledAt).getTime() > Date.now(),
  );
  const feedbackPendingInterviews = interviews.filter(
    (i) => i.status === 'FEEDBACK_PENDING' || i.status === 'COMPLETED',
  );

  // Vendor distribution
  const vendorDistribution = useMemo(() => {
    const map = new Map<string, { name: string; count: number; vendorId: string }>();
    for (const s of activeSubmissions) {
      if (s.vendor) {
        const existing = map.get(s.vendor.id);
        if (existing) existing.count++;
        else map.set(s.vendor.id, { name: s.vendor.companyName, count: 1, vendorId: s.vendor.id });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [activeSubmissions]);

  // Pipeline counts
  const pipelineCounts = useMemo(() => {
    const out: Record<SubmissionStatus, number> = {
      DRAFT: 0, SUBMITTED: 0, UNDER_REVIEW: 0, SHORTLISTED: 0, INTERVIEW: 0,
      OFFERED: 0, PLACED: 0, REJECTED: 0, WITHDRAWN: 0, ON_HOLD: 0, CLOSED: 0,
    };
    for (const s of submissions) out[s.status]++;
    return out;
  }, [submissions]);

  // ── Next actions ────────────────────────────────────────────────────────────
  const nextActions: NextAction[] = useMemo(() => {
    if (!job) return [];
    const actions: NextAction[] = [];

    if (feedbackPendingInterviews.length > 0) {
      actions.push({
        id: 'feedback', icon: FileText, urgent: true,
        label: `${feedbackPendingInterviews.length} interview${feedbackPendingInterviews.length > 1 ? 's' : ''} awaiting feedback`,
        hint: 'Recruiters or interviewers need to submit feedback',
        href: `/interviews?jobId=${id}&status=FEEDBACK_PENDING`,
      });
    }

    if (job.status === 'DRAFT') {
      actions.push({
        id: 'open', icon: Send, primary: true,
        label: 'Open job for sourcing',
        hint: 'Make this requisition active', onClick: () => transitionMutation.mutate('OPEN'),
      });
    }
    if (job.status === 'OPEN') {
      if (activeSubmissions.length === 0) {
        actions.push({
          id: 'source', icon: Users, primary: true,
          label: 'Source candidates',
          hint: 'No active submissions yet',
          href: `/candidates?status=AVAILABLE`,
        });
      } else if (activeSubmissions.length < 3 && job.hiringPriority === 'URGENT') {
        actions.push({
          id: 'source-more', icon: Users, urgent: true,
          label: 'Source more candidates',
          hint: 'Urgent role with thin pipeline',
          href: `/candidates?status=AVAILABLE`,
        });
      }
      const offered = pipelineCounts.OFFERED;
      if (offered > 0) {
        actions.push({
          id: 'track-offers', icon: Target,
          label: `Track ${offered} extended offer${offered > 1 ? 's' : ''}`,
          href: `/submissions?jobId=${id}&status=OFFERED`,
        });
      }
      if (job.filledPositions >= job.openPositions) {
        actions.push({
          id: 'mark-filled', icon: Archive, primary: true,
          label: 'Mark as filled',
          hint: 'All positions are filled', onClick: () => transitionMutation.mutate('FILLED'),
        });
      }
    }
    if (job.status === 'ON_HOLD') {
      actions.push({
        id: 'resume', icon: Send, primary: true,
        label: 'Reopen for sourcing',
        onClick: () => transitionMutation.mutate('OPEN'),
      });
    }
    if (job.status === 'FILLED' || job.status === 'CANCELLED') {
      actions.push({
        id: 'archive', icon: Archive,
        label: 'Archive job',
        hint: 'Hide from active listings', onClick: () => transitionMutation.mutate('ARCHIVED'),
      });
    }
    return actions;
  }, [
    job, id, activeSubmissions.length,
    feedbackPendingInterviews.length, pipelineCounts.OFFERED, transitionMutation,
  ]);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !job) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-sm text-destructive">Job not found.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/jobs">Back to jobs</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const visibleNotes = notes ?? job.notes;
  const requiredSkills = job.allSkills.filter((s) => s.isRequired);
  const niceToHaveSkills = job.allSkills.filter((s) => !s.isRequired);
  const allowedTransitions = ALLOWED_TRANSITIONS[job.status];
  const location = [job.city, job.stateProvince, job.country].filter(Boolean).join(', ');
  const salary = job.salaryMin || job.salaryMax
    ? `${job.salaryCurrency ?? 'USD'} ${job.salaryMin?.toLocaleString() ?? '—'}–${job.salaryMax?.toLocaleString() ?? '∞'} ${job.salaryType === 'HOURLY' ? '/hr' : '/yr'}`
    : null;

  const daysOpen = job.openedAt
    ? differenceInCalendarDays(new Date(), new Date(job.openedAt))
    : null;
  const isOpenAndUnfilled = job.status === 'OPEN' && job.filledPositions < job.openPositions;
  const isStalled = isOpenAndUnfilled && daysOpen !== null && daysOpen > 30;

  function handleAddNote() {
    if (!noteContent.trim()) return;
    addNoteMutation.mutate(
      { content: noteContent.trim(), noteType },
      { onSuccess: () => setNoteContent('') },
    );
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Job"
        title={job.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-mono text-xs">{job.reqId}</span>
            {job.department && <span className="text-muted-foreground">· {job.department}</span>}
          </span>
        }
        breadcrumbs={[
          { title: 'Jobs', href: '/jobs' },
          { title: job.title },
        ]}
        badges={
          <>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', STATUS_TONE[job.status])}>
              {STATUS_LABELS[job.status]}
            </span>
            <UrgencyIndicator level={PRIORITY_TO_INDICATOR[job.hiringPriority] ?? 'normal'} label={job.hiringPriority} />
            <Badge variant="outline" className="text-xs">{job.workMode}</Badge>
            <Badge variant="outline" className="text-xs">{job.employmentType.replace('_', ' ')}</Badge>
            {isStalled && (
              <StaleIndicator lastActivityAt={job.openedAt} thresholdDays={30} label={`Stale ${daysOpen}d`} />
            )}
            {feedbackPendingInterviews.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                <AlertCircle className="h-3 w-3" />
                {feedbackPendingInterviews.length} feedback pending
              </span>
            )}
          </>
        }
        actions={
          <>
            {canUpdate && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/submissions/new?jobId=${id}`}>
                  <Send className="mr-1 h-4 w-4" /> Submit candidate
                </Link>
              </Button>
            )}
            {canUpdate && allowedTransitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    Transition <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Move to</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allowedTransitions.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => transitionMutation.mutate(s)}
                      disabled={transitionMutation.isPending}
                    >
                      {STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canUpdate && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/jobs/${id}/edit`}>
                  <Edit className="mr-1 h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
          </>
        }
        facts={
          <>
            <WorkspaceFact label="Positions">
              <span className="tabular-nums">
                {job.filledPositions}/{job.openPositions} filled
              </span>
            </WorkspaceFact>
            <WorkspaceFact label="Opened">
              {job.openedAt
                ? `${new Date(job.openedAt).toLocaleDateString()} (${daysOpen}d)`
                : '—'}
            </WorkspaceFact>
            <WorkspaceFact label="Target hire">
              {job.targetHireDate ? new Date(job.targetHireDate).toLocaleDateString() : '—'}
            </WorkspaceFact>
            <WorkspaceFact label="Hiring manager">
              {job.hiringManagerName ?? '—'}
            </WorkspaceFact>
          </>
        }
      />

      <WorkspaceShell
        rail={
          <>
            <NextActionsPanel actions={nextActions} />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <MetricTile
                  label="Active submissions"
                  value={activeSubmissions.length}
                  icon={Send}
                  tone={activeSubmissions.length === 0 && job.status === 'OPEN' ? 'danger' : 'info'}
                  href={`/submissions?jobId=${id}`}
                />
                <MetricTile
                  label="Upcoming interviews"
                  value={upcomingInterviews.length}
                  icon={Calendar}
                  tone={upcomingInterviews.length > 0 ? 'info' : 'default'}
                  href={`/interviews?jobId=${id}`}
                />
                <MetricTile
                  label="Feedback pending"
                  value={feedbackPendingInterviews.length}
                  icon={FileText}
                  tone={feedbackPendingInterviews.length > 0 ? 'warning' : 'default'}
                />
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
        <PipelineFunnel counts={pipelineCounts} />

        {/* Active submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Send className="h-4 w-4" />
              Active submissions
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{activeSubmissions.length}</span>
            </CardTitle>
            {canUpdate && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/submissions/new?jobId=${id}`}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Submit
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {job.status === 'OPEN'
                  ? 'No active submissions yet. Start sourcing candidates.'
                  : 'No active submissions.'}
              </p>
            ) : (
              activeSubmissions.slice(0, 12).map((s) => (
                <RelatedEntityCard
                  key={s.id}
                  eyebrow={s.candidate.currentTitle ?? undefined}
                  icon={UserIcon}
                  title={`${s.candidate.firstName} ${s.candidate.lastName}`}
                  subtitle={
                    (s.candidate.email) +
                    (s.vendor ? ` · via ${s.vendor.companyName}` : '')
                  }
                  status={s.status}
                  statusTone={SUBMISSION_TONE[s.status]}
                  href={`/submissions/${s.id}`}
                  meta={
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(s.updatedAt), { addSuffix: true })}
                    </span>
                  }
                />
              ))
            )}
            {activeSubmissions.length > 12 && (
              <Link href={`/submissions?jobId=${id}`} className="block text-center text-xs text-primary hover:underline">
                View all {activeSubmissions.length} active submissions →
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Vendor distribution */}
        {vendorDistribution.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Vendor involvement
                <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{vendorDistribution.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {vendorDistribution.map((v) => (
                <RelatedEntityCard
                  key={v.vendorId}
                  icon={Users}
                  title={v.name}
                  subtitle={`${v.count} active submission${v.count > 1 ? 's' : ''}`}
                  href={`/vendors/${v.vendorId}`}
                  meta={<span className="font-medium tabular-nums">{v.count}</span>}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Upcoming interviews */}
        {upcomingInterviews.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Upcoming interviews
                <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{upcomingInterviews.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingInterviews.map((iv) => (
                <RelatedEntityCard
                  key={iv.id}
                  eyebrow={iv.roundLabel ?? `Round ${iv.round}`}
                  icon={Calendar}
                  title={`${iv.candidate.firstName} ${iv.candidate.lastName} · ${iv.type}`}
                  subtitle={iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleString() : 'Not scheduled'}
                  status={iv.status}
                  statusTone={INTERVIEW_TONE[iv.status]}
                  href={`/interviews/${iv.id}`}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Description / requirements */}
        {(job.description || job.requirements || job.niceToHave || job.benefits) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                Role details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {job.description && (
                <div>
                  <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Description</h3>
                  <p className="whitespace-pre-wrap">{job.description}</p>
                </div>
              )}
              {job.requirements && (
                <div>
                  <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Requirements</h3>
                  <p className="whitespace-pre-wrap">{job.requirements}</p>
                </div>
              )}
              {job.niceToHave && (
                <div>
                  <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Nice to have</h3>
                  <p className="whitespace-pre-wrap">{job.niceToHave}</p>
                </div>
              )}
              {job.benefits && (
                <div>
                  <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Benefits</h3>
                  <p className="whitespace-pre-wrap">{job.benefits}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Skills */}
        {(requiredSkills.length > 0 || niceToHaveSkills.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {requiredSkills.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Required</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSkills.map((js) => (
                      <div key={js.id} className="group flex items-center gap-1">
                        <Badge variant="default" className="text-xs">
                          {js.skill.displayName}
                          {js.minimumYears ? ` · ${js.minimumYears}y+` : ''}
                        </Badge>
                        {canUpdate && (
                          <button
                            onClick={() => removeSkillMutation.mutate(js.skill.id)}
                            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                            aria-label={`Remove ${js.skill.displayName}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {niceToHaveSkills.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Nice to have</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {niceToHaveSkills.map((js) => (
                      <div key={js.id} className="group flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {js.skill.displayName}
                        </Badge>
                        {canUpdate && (
                          <button
                            onClick={() => removeSkillMutation.mutate(js.skill.id)}
                            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                            aria-label={`Remove ${js.skill.displayName}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Compensation + location footer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Compensation & location</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {salary && (
              <div className="flex items-start gap-2">
                <DollarSign className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{salary}</span>
              </div>
            )}
            {location && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{location}</span>
              </div>
            )}
            {(job.experienceMin !== null || job.experienceMax !== null) && (
              <div className="flex items-start gap-2">
                <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{job.experienceMin ?? 0}–{job.experienceMax ?? '∞'} years</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>Updated {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              Notes
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{visibleNotes.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {canUpdate && (
              <div className="space-y-2">
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as NoteType)}
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                >
                  {(['NOTE', 'CALL', 'EMAIL', 'MEETING'] as NoteType[]).map((t) => (
                    <option key={t} value={t}>{NOTE_TYPE_LABELS[t]}</option>
                  ))}
                </select>
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={2}
                  placeholder="Add a note..."
                />
                <Button size="sm" onClick={handleAddNote} disabled={!noteContent.trim() || addNoteMutation.isPending}>
                  {addNoteMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Add note
                </Button>
              </div>
            )}

            <div className="space-y-3 border-t pt-3">
              {visibleNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No notes yet.</p>
              ) : (
                visibleNotes.map((note) => (
                  <div key={note.id} className="rounded-md bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">
                        <Badge variant="outline" className="mr-1.5 text-[10px]">
                          {NOTE_TYPE_LABELS[note.noteType as NoteType]}
                        </Badge>
                        {note.authorName ?? note.authorEmail}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </WorkspaceShell>
    </div>
  );
}
