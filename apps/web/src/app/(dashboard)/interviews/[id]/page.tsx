'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { differenceInHours, formatDistanceToNow } from 'date-fns';
import {
  AlertCircle, Briefcase, Calendar, CheckCircle2, ChevronDown, ChevronRight,
  Clock, FileText, Loader2, MapPin, MessageSquare, PlayCircle, Send, Trash2,
  User as UserIcon, Users, XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  ActivityTimeline,
  DueSoonIndicator,
  NextActionsPanel,
  RelatedEntityCard,
  WorkspaceFact,
  WorkspaceHeader,
  WorkspaceShell,
  type NextAction,
} from '@/components/workspace';
import {
  useInterview,
  useChangeInterviewStatus,
  useAddInterviewNote,
  useAddInterviewFeedback,
  useSubmitInterviewFeedback,
  useDeleteInterview,
} from '@/hooks/use-interviews';
import { useEntityActivity } from '@/hooks/use-activity';
import type {
  ChangeInterviewStatusDto,
  CreateFeedbackDto,
  FeedbackRecommendation,
  InterviewDetail,
  InterviewFeedbackView,
  InterviewStatus,
} from '@/types/interviews';
import {
  FSM_TRANSITIONS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  TERMINAL_STATUSES,
} from '@/types/interviews';
import { cn } from '@/lib/utils';

// ── Lookups ───────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<InterviewStatus, string> = {
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

const RECOMMENDATION_LABELS: Record<FeedbackRecommendation, string> = {
  STRONG_YES: 'Strong Yes', YES: 'Yes', NEUTRAL: 'Neutral', NO: 'No', STRONG_NO: 'Strong No',
};

const RECOMMENDATION_TONE: Record<FeedbackRecommendation, string> = {
  STRONG_YES: 'bg-emerald-100 text-emerald-800',
  YES:        'bg-green-100 text-green-800',
  NEUTRAL:    'bg-gray-100 text-gray-700',
  NO:         'bg-orange-100 text-orange-800',
  STRONG_NO:  'bg-red-100 text-red-800',
};

const SCORE_LABELS = ['', 'Poor', 'Below avg', 'Average', 'Good', 'Excellent'];

// ── Feedback card (mostly preserved, refactored to use shadcn Textarea) ──────

function FeedbackCard({
  interviewId,
  feedback,
}: {
  interviewId: string;
  feedback: InterviewFeedbackView[];
}) {
  const addFeedback = useAddInterviewFeedback(interviewId);
  const [showForm, setShowForm] = useState(false);
  const [recommendation, setRecommendation] = useState<FeedbackRecommendation>('NEUTRAL');
  const [technicalScore, setTechnicalScore] = useState('');
  const [communicationScore, setCommunicationScore] = useState('');
  const [cultureFitScore, setCultureFitScore] = useState('');
  const [overallScore, setOverallScore] = useState('');
  const [strengths, setStrengths] = useState('');
  const [concerns, setConcerns] = useState('');
  const [notes, setNotes] = useState('');

  const firstFeedbackId = feedback[0]?.id ?? '';
  const submitFeedbackHook = useSubmitInterviewFeedback(interviewId, firstFeedbackId);

  const handleAddFeedback = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const dto: CreateFeedbackDto = {
      recommendation,
      ...(technicalScore     && { technicalScore:     parseInt(technicalScore, 10) }),
      ...(communicationScore && { communicationScore: parseInt(communicationScore, 10) }),
      ...(cultureFitScore    && { cultureFitScore:    parseInt(cultureFitScore, 10) }),
      ...(overallScore       && { overallScore:       parseInt(overallScore, 10) }),
      ...(strengths && { strengths }),
      ...(concerns  && { concerns }),
      ...(notes     && { notes }),
    };
    addFeedback.mutate(dto, {
      onSuccess: () => {
        setShowForm(false); setRecommendation('NEUTRAL');
        setTechnicalScore(''); setCommunicationScore('');
        setCultureFitScore(''); setOverallScore('');
        setStrengths(''); setConcerns(''); setNotes('');
      },
    });
  }, [recommendation, technicalScore, communicationScore, cultureFitScore, overallScore, strengths, concerns, notes, addFeedback]);

  const isPendingFeedback = feedback.length === 0;

  return (
    <Card className={cn(isPendingFeedback && 'border-amber-300 bg-amber-50/30')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            Feedback
            <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{feedback.length}</span>
            {isPendingFeedback && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Pending
              </span>
            )}
          </CardTitle>
          {!showForm && (
            <Button size="sm" variant={isPendingFeedback ? 'default' : 'outline'} onClick={() => setShowForm(true)}>
              Add feedback
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground">No feedback submitted yet.</p>
        )}

        {feedback.map((f) => (
          <div key={f.id} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{f.submitterName ?? f.submitterEmail ?? 'Unknown'}</span>
                {f.recommendation && (
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', RECOMMENDATION_TONE[f.recommendation])}>
                    {RECOMMENDATION_LABELS[f.recommendation]}
                  </span>
                )}
                {f.isSubmitted ? (
                  <Badge variant="secondary" className="text-[10px]">Submitted</Badge>
                ) : (
                  <Badge variant="outline" className="border-yellow-300 text-[10px] text-yellow-700">Draft</Badge>
                )}
              </div>
              {!f.isSubmitted && firstFeedbackId && (
                <Button size="sm" variant="outline" onClick={() => submitFeedbackHook.mutate()} disabled={submitFeedbackHook.isPending}>
                  {submitFeedbackHook.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Submit
                </Button>
              )}
            </div>

            {(f.technicalScore !== null || f.communicationScore !== null || f.cultureFitScore !== null || f.overallScore !== null) && (
              <div className="grid grid-cols-2 gap-1 text-xs">
                {f.technicalScore     !== null && <span className="text-muted-foreground">Technical: <strong>{SCORE_LABELS[f.technicalScore]}</strong></span>}
                {f.communicationScore !== null && <span className="text-muted-foreground">Communication: <strong>{SCORE_LABELS[f.communicationScore]}</strong></span>}
                {f.cultureFitScore    !== null && <span className="text-muted-foreground">Culture fit: <strong>{SCORE_LABELS[f.cultureFitScore]}</strong></span>}
                {f.overallScore       !== null && <span className="text-muted-foreground">Overall: <strong>{SCORE_LABELS[f.overallScore]}</strong></span>}
              </div>
            )}
            {f.strengths && <p className="text-xs"><strong>Strengths:</strong> {f.strengths}</p>}
            {f.concerns  && <p className="text-xs"><strong>Concerns:</strong> {f.concerns}</p>}
            {f.notes     && <p className="text-xs text-muted-foreground">{f.notes}</p>}
          </div>
        ))}

        {showForm && (
          <form onSubmit={handleAddFeedback} className="space-y-3 rounded-md border p-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Recommendation</label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value as FeedbackRecommendation)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(RECOMMENDATION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['technicalScore', 'communicationScore', 'cultureFitScore', 'overallScore'] as const).map((field) => {
                const vals = {
                  technicalScore:     [technicalScore,     setTechnicalScore],
                  communicationScore: [communicationScore, setCommunicationScore],
                  cultureFitScore:    [cultureFitScore,    setCultureFitScore],
                  overallScore:       [overallScore,       setOverallScore],
                } as const;
                const labels = { technicalScore: 'Technical', communicationScore: 'Communication', cultureFitScore: 'Culture Fit', overallScore: 'Overall' };
                return (
                  <div key={field} className="space-y-1">
                    <label className="text-xs font-medium">{labels[field]} (1-5)</label>
                    <input
                      type="number" min="1" max="5"
                      value={vals[field][0] as string}
                      onChange={(e) => (vals[field][1] as (v: string) => void)(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                );
              })}
            </div>

            {(['strengths', 'concerns', 'notes'] as const).map((field) => {
              const vals = { strengths: [strengths, setStrengths], concerns: [concerns, setConcerns], notes: [notes, setNotes] } as const;
              const labels = { strengths: 'Strengths', concerns: 'Concerns', notes: 'Notes' };
              return (
                <div key={field} className="space-y-1.5">
                  <label className="text-xs font-medium">{labels[field]}</label>
                  <Textarea
                    rows={2}
                    value={vals[field][0] as string}
                    onChange={(e) => (vals[field][1] as (v: string) => void)(e.target.value)}
                  />
                </div>
              );
            })}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={addFeedback.isPending}>
                {addFeedback.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Save feedback
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}
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

// ── Workspace content ─────────────────────────────────────────────────────────

function InterviewWorkspaceContent({ interview }: { interview: InterviewDetail }) {
  const router = useRouter();
  const changeStatus     = useChangeInterviewStatus(interview.id);
  const addNote          = useAddInterviewNote(interview.id);
  const deleteInterview  = useDeleteInterview();
  const { data: activity = [], isLoading: activityLoading } =
    useEntityActivity('interview', interview.id, 30);

  const [noteContent, setNoteContent] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const c = interview.candidate;
  const j = interview.job;

  const isTerminal     = TERMINAL_STATUSES.includes(interview.status);
  const nextStatuses   = FSM_TRANSITIONS[interview.status] ?? [];
  const hasFeedback    = interview.feedback.length > 0;
  const allSubmittedFb = hasFeedback && interview.feedback.every((f) => f.isSubmitted);

  const hoursUntilStart = interview.scheduledAt
    ? differenceInHours(new Date(interview.scheduledAt), new Date())
    : null;
  const startsSoon = hoursUntilStart !== null && hoursUntilStart >= 0 && hoursUntilStart < 24;
  const isPastDue  = hoursUntilStart !== null && hoursUntilStart < -1 &&
    (interview.status === 'SCHEDULED' || interview.status === 'CONFIRMED' || interview.status === 'RESCHEDULED');

  // ── Next actions ────────────────────────────────────────────────────────────
  const nextActions: NextAction[] = useMemo(() => {
    const actions: NextAction[] = [];
    const s = interview.status;

    if (s === 'SCHEDULED' && startsSoon) {
      actions.push({
        id: 'confirm', icon: CheckCircle2, urgent: true,
        label: 'Confirm interview',
        hint: `Starts in ${hoursUntilStart} hour${hoursUntilStart === 1 ? '' : 's'}`,
        onClick: () => changeStatus.mutate({ status: 'CONFIRMED' }),
      });
    }
    if (s === 'SCHEDULED' && !startsSoon) {
      actions.push({
        id: 'confirm', icon: CheckCircle2, primary: true,
        label: 'Confirm interview',
        onClick: () => changeStatus.mutate({ status: 'CONFIRMED' }),
      });
    }
    if (isPastDue) {
      actions.push({
        id: 'in-progress', icon: PlayCircle, urgent: true,
        label: 'Mark as in progress',
        hint: 'Interview was scheduled in the past',
        onClick: () => changeStatus.mutate({ status: 'IN_PROGRESS' }),
      });
    }
    if (s === 'IN_PROGRESS') {
      actions.push({
        id: 'complete', icon: CheckCircle2, primary: true,
        label: 'Mark completed',
        onClick: () => changeStatus.mutate({ status: 'COMPLETED' }),
      });
    }
    if (s === 'COMPLETED' || s === 'FEEDBACK_PENDING') {
      if (!hasFeedback) {
        actions.push({
          id: 'feedback', icon: FileText, urgent: true,
          label: 'Submit interview feedback',
          hint: 'Required to complete the round',
        });
      } else if (!allSubmittedFb) {
        actions.push({
          id: 'submit-fb', icon: FileText, urgent: true,
          label: 'Submit draft feedback',
          hint: 'Feedback drafted but not yet submitted',
        });
      } else {
        actions.push({
          id: 'pass', icon: CheckCircle2, primary: true,
          label: 'Mark passed',
          onClick: () => changeStatus.mutate({ status: 'PASSED' }),
        });
        actions.push({
          id: 'fail', icon: XCircle,
          label: 'Mark failed',
          onClick: () => changeStatus.mutate({ status: 'FAILED' }),
        });
      }
    }
    if ((s === 'PASSED' || s === 'FAILED') && interview.submissionId) {
      actions.push({
        id: 'open-submission', icon: Send,
        label: 'Advance submission',
        hint: 'Open the parent submission to act on the result',
        href: `/submissions/${interview.submissionId}`,
      });
    }
    return actions;
  }, [interview, hasFeedback, allSubmittedFb, hoursUntilStart, startsSoon, isPastDue, changeStatus]);

  function handleAddNote() {
    if (!noteContent.trim()) return;
    addNote.mutate({ content: noteContent.trim() }, { onSuccess: () => setNoteContent('') });
  }

  function handleDelete() {
    if (!window.confirm('Cancel this interview?')) return;
    deleteInterview.mutate(interview.id, { onSuccess: () => router.push('/interviews') });
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow={`Interview · ${interview.roundLabel ?? `Round ${interview.round}`}`}
        title={`${c.firstName} ${c.lastName}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5 text-sm">
            <Briefcase className="h-3.5 w-3.5" />
            <Link href={`/jobs/${j.id}`} className="hover:underline">{j.reqId} · {j.title}</Link>
            <span className="text-muted-foreground">— {INTERVIEW_TYPE_LABELS[interview.type]}</span>
          </span>
        }
        breadcrumbs={[
          { title: 'Interviews', href: '/interviews' },
          { title: `${c.firstName} ${c.lastName} · ${interview.roundLabel ?? `Round ${interview.round}`}` },
        ]}
        badges={
          <>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', STATUS_TONE[interview.status])}>
              {INTERVIEW_STATUS_LABELS[interview.status]}
            </span>
            <DueSoonIndicator dueAt={interview.scheduledAt} thresholdHours={24} />
            {isPastDue && (
              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                <AlertCircle className="h-3 w-3" />
                Past due
              </span>
            )}
            {(interview.status === 'COMPLETED' || interview.status === 'FEEDBACK_PENDING') && !hasFeedback && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                <AlertCircle className="h-3 w-3" />
                Feedback pending
              </span>
            )}
          </>
        }
        actions={
          <>
            {!isTerminal && nextStatuses.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    Advance status <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Move to</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {nextStatuses.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => {
                        const dto: ChangeInterviewStatusDto = {
                          status: s,
                          ...(statusReason && { reason: statusReason }),
                        };
                        changeStatus.mutate(dto);
                      }}
                    >
                      {INTERVIEW_STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!isTerminal && (
              <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteInterview.isPending}>
                <Trash2 className="mr-1 h-4 w-4" /> Cancel
              </Button>
            )}
          </>
        }
        facts={
          <>
            <WorkspaceFact label="Scheduled">
              {interview.scheduledAt ? new Date(interview.scheduledAt).toLocaleString() : '—'}
            </WorkspaceFact>
            <WorkspaceFact label="Duration">
              {interview.durationMinutes ? `${interview.durationMinutes} min` : '—'}
            </WorkspaceFact>
            <WorkspaceFact label="Interviewer">
              {interview.interviewerName ?? '—'}
            </WorkspaceFact>
            <WorkspaceFact label="Owner">
              {interview.owner.firstName} {interview.owner.lastName}
            </WorkspaceFact>
          </>
        }
      />

      <WorkspaceShell
        rail={
          <>
            <NextActionsPanel
              actions={nextActions}
              emptyMessage={isTerminal ? 'Round complete.' : 'No actions required.'}
            />

            {/* Context */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <RelatedEntityCard
                  eyebrow="Candidate"
                  icon={UserIcon}
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
                <RelatedEntityCard
                  eyebrow="Submission"
                  icon={Send}
                  title={`Stage: ${interview.submission.status}`}
                  href={`/submissions/${interview.submissionId}`}
                />
              </CardContent>
            </Card>

            {/* Participants */}
            {interview.participants.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    Participants
                    <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{interview.participants.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {interview.participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.role}</p>
                      </div>
                      {p.hasConfirmed ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle2 className="h-3 w-3" /> Confirmed
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">Pending</span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Activity */}
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
        {/* Interview details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              Interview details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Type</dt>
                <dd>{INTERVIEW_TYPE_LABELS[interview.type]}</dd>
              </div>
              {interview.scheduledAt && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">When</dt>
                  <dd>
                    {new Date(interview.scheduledAt).toLocaleString()}
                    {interview.timezone && <span className="text-muted-foreground"> ({interview.timezone})</span>}
                    {hoursUntilStart !== null && hoursUntilStart > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(interview.scheduledAt), { addSuffix: true })}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {interview.location && (
                <div className="col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Location</dt>
                  <dd className="flex items-center gap-1 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {interview.location}
                  </dd>
                </div>
              )}
              {interview.interviewerEmail && (
                <div className="col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Interviewer contact</dt>
                  <dd>
                    <a href={`mailto:${interview.interviewerEmail}`} className="text-primary hover:underline">
                      {interview.interviewerEmail}
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            {interview.briefingNotes && (
              <>
                <Separator />
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Briefing notes</p>
                  <p className="whitespace-pre-line text-sm">{interview.briefingNotes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Feedback (critical workflow surface) */}
        <FeedbackCard interviewId={interview.id} feedback={interview.feedback} />

        {/* Status change reason (optional) */}
        {!isTerminal && nextStatuses.length > 0 && (nextStatuses.includes('CANCELLED') || nextStatuses.includes('NO_SHOW')) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Status change reason</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Optional context (required for CANCELLED / NO_SHOW transitions)"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows={2}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Applied to the next status transition via &quot;Advance status&quot;.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              Notes
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{interview.notes.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Textarea
                placeholder="Add a note..."
                rows={2}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
              <Button size="sm" onClick={handleAddNote} disabled={!noteContent.trim() || addNote.isPending}>
                {addNote.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Add note
              </Button>
            </div>

            {interview.notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="space-y-3 border-t pt-3">
                {interview.notes.map((note) => (
                  <div key={note.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {note.isSystem ? 'System' : (note.authorName ?? note.authorEmail ?? 'Unknown')}
                      </span>
                      <span>{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status history (compact) */}
        {interview.statusHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Status history
                <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{interview.statusHistory.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {interview.statusHistory.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {new Date(h.createdAt).toLocaleDateString()}
                  </span>
                  {h.fromStatus && (
                    <>
                      <span className={cn('inline-flex rounded px-1.5 py-0.5 font-medium', STATUS_TONE[h.fromStatus])}>
                        {INTERVIEW_STATUS_LABELS[h.fromStatus]}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                  <span className={cn('inline-flex rounded px-1.5 py-0.5 font-medium', STATUS_TONE[h.toStatus])}>
                    {INTERVIEW_STATUS_LABELS[h.toStatus]}
                  </span>
                  <span className="ml-auto text-muted-foreground">{h.changedByName}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </WorkspaceShell>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InterviewWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { data: interview, isLoading, isError } = useInterview(id);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !interview) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-sm text-destructive">Interview not found.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/interviews">Back to interviews</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  return <InterviewWorkspaceContent interview={interview} />;
}
