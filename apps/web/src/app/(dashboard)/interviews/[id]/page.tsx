'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, MessageSquare, ChevronRight } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useInterview,
  useChangeInterviewStatus,
  useAddInterviewNote,
  useAddInterviewFeedback,
  useSubmitInterviewFeedback,
  useDeleteInterview,
} from '@/hooks/use-interviews';
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

// ── Status badge ──────────────────────────────────────────────────────────────

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

const RECOMMENDATION_LABELS: Record<FeedbackRecommendation, string> = {
  STRONG_YES: 'Strong Yes',
  YES:        'Yes',
  NEUTRAL:    'Neutral',
  NO:         'No',
  STRONG_NO:  'Strong No',
};

const RECOMMENDATION_COLORS: Record<FeedbackRecommendation, string> = {
  STRONG_YES: 'bg-emerald-100 text-emerald-800',
  YES:        'bg-green-100 text-green-800',
  NEUTRAL:    'bg-gray-100 text-gray-700',
  NO:         'bg-orange-100 text-orange-800',
  STRONG_NO:  'bg-red-100 text-red-800',
};

// ── Status controls ───────────────────────────────────────────────────────────

function StatusControls({ interview }: { interview: InterviewDetail }) {
  const changeStatus = useChangeInterviewStatus(interview.id);
  const [reason, setReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<InterviewStatus | null>(null);

  const handleTransition = useCallback(() => {
    if (!selectedStatus) return;
    const dto: ChangeInterviewStatusDto = {
      status: selectedStatus,
      ...(reason && { reason }),
    };
    changeStatus.mutate(dto, {
      onSuccess: () => {
        setSelectedStatus(null);
        setReason('');
      },
    });
  }, [selectedStatus, reason, changeStatus]);

  const nextStatuses = FSM_TRANSITIONS[interview.status] ?? [];
  if (nextStatuses.length === 0) return null;

  const needsReason = selectedStatus === 'CANCELLED' || selectedStatus === 'NO_SHOW';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Advance status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((s) => (
            <Button
              key={s}
              variant={selectedStatus === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus(s === selectedStatus ? null : s)}
            >
              {INTERVIEW_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>

        {selectedStatus && (
          <div className="space-y-3 pt-1 border-t">
            {needsReason && (
              <textarea
                placeholder={`Reason for ${INTERVIEW_STATUS_LABELS[selectedStatus].toLowerCase()}…`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleTransition}
                disabled={changeStatus.isPending}
              >
                {changeStatus.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm → {INTERVIEW_STATUS_LABELS[selectedStatus]}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setSelectedStatus(null); setReason(''); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Feedback card ─────────────────────────────────────────────────────────────

const SCORE_LABELS = ['', 'Poor', 'Below avg', 'Average', 'Good', 'Excellent'];

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

  const handleAddFeedback = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const dto: CreateFeedbackDto = {
        recommendation,
        ...(technicalScore && { technicalScore: parseInt(technicalScore, 10) }),
        ...(communicationScore && { communicationScore: parseInt(communicationScore, 10) }),
        ...(cultureFitScore && { cultureFitScore: parseInt(cultureFitScore, 10) }),
        ...(overallScore && { overallScore: parseInt(overallScore, 10) }),
        ...(strengths && { strengths }),
        ...(concerns && { concerns }),
        ...(notes && { notes }),
      };
      addFeedback.mutate(dto, {
        onSuccess: () => {
          setShowForm(false);
          setRecommendation('NEUTRAL');
          setTechnicalScore('');
          setCommunicationScore('');
          setCultureFitScore('');
          setOverallScore('');
          setStrengths('');
          setConcerns('');
          setNotes('');
        },
      });
    },
    [
      recommendation, technicalScore, communicationScore, cultureFitScore,
      overallScore, strengths, concerns, notes, addFeedback,
    ],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Feedback</CardTitle>
          {!showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
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
          <div key={f.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {f.submitterName ?? f.submitterEmail ?? 'Unknown'}
                </span>
                {f.recommendation && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${RECOMMENDATION_COLORS[f.recommendation]}`}
                  >
                    {RECOMMENDATION_LABELS[f.recommendation]}
                  </span>
                )}
                {f.isSubmitted ? (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                    Submitted
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                    Draft
                  </span>
                )}
              </div>
              {!f.isSubmitted && firstFeedbackId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => submitFeedbackHook.mutate()}
                  disabled={submitFeedbackHook.isPending}
                >
                  {submitFeedbackHook.isPending && (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  )}
                  Submit
                </Button>
              )}
            </div>

            {(f.technicalScore !== null ||
              f.communicationScore !== null ||
              f.cultureFitScore !== null ||
              f.overallScore !== null) && (
              <div className="grid grid-cols-2 gap-1 text-xs">
                {f.technicalScore !== null && (
                  <span className="text-muted-foreground">
                    Technical: <strong>{SCORE_LABELS[f.technicalScore]}</strong>
                  </span>
                )}
                {f.communicationScore !== null && (
                  <span className="text-muted-foreground">
                    Communication: <strong>{SCORE_LABELS[f.communicationScore]}</strong>
                  </span>
                )}
                {f.cultureFitScore !== null && (
                  <span className="text-muted-foreground">
                    Culture fit: <strong>{SCORE_LABELS[f.cultureFitScore]}</strong>
                  </span>
                )}
                {f.overallScore !== null && (
                  <span className="text-muted-foreground">
                    Overall: <strong>{SCORE_LABELS[f.overallScore]}</strong>
                  </span>
                )}
              </div>
            )}
            {f.strengths && (
              <p className="text-xs"><strong>Strengths:</strong> {f.strengths}</p>
            )}
            {f.concerns && (
              <p className="text-xs"><strong>Concerns:</strong> {f.concerns}</p>
            )}
            {f.notes && (
              <p className="text-xs text-muted-foreground">{f.notes}</p>
            )}
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
                  technicalScore: [technicalScore, setTechnicalScore],
                  communicationScore: [communicationScore, setCommunicationScore],
                  cultureFitScore: [cultureFitScore, setCultureFitScore],
                  overallScore: [overallScore, setOverallScore],
                } as const;
                const labels = {
                  technicalScore: 'Technical',
                  communicationScore: 'Communication',
                  cultureFitScore: 'Culture Fit',
                  overallScore: 'Overall',
                };
                return (
                  <div key={field} className="space-y-1">
                    <label className="text-xs font-medium">{labels[field]} (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={vals[field][0] as string}
                      onChange={(e) => (vals[field][1] as (v: string) => void)(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Strengths</label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Concerns</label>
              <textarea
                value={concerns}
                onChange={(e) => setConcerns(e.target.value)}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={addFeedback.isPending}>
                {addFeedback.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Save feedback
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ── Notes / activity timeline ─────────────────────────────────────────────────

function NotesTimeline({ interview }: { interview: InterviewDetail }) {
  const addNote = useAddInterviewNote(interview.id);
  const [content, setContent] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!content.trim()) return;
      addNote.mutate({ content }, { onSuccess: () => setContent('') });
    },
    [content, addNote],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Notes &amp; Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Add a note…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" size="sm" disabled={addNote.isPending || !content.trim()}>
            {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
          </Button>
        </form>

        {interview.notes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {interview.notes.map((note) => (
              <div key={note.id} className="flex gap-3">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground">
                    {note.isSystem ? 'System' : (note.authorName ?? note.authorEmail ?? 'Unknown')}
                    {' · '}
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Status history ────────────────────────────────────────────────────────────

function StatusHistory({ interview }: { interview: InterviewDetail }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Status history</CardTitle>
      </CardHeader>
      <CardContent>
        {interview.statusHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">No history.</p>
        ) : (
          <div className="space-y-2">
            {interview.statusHistory.map((h) => (
              <div key={h.id} className="flex items-center gap-2 text-xs">
                {h.fromStatus ? (
                  <>
                    <span className="text-muted-foreground">
                      {INTERVIEW_STATUS_LABELS[h.fromStatus]}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </>
                ) : null}
                <span className="font-medium">{INTERVIEW_STATUS_LABELS[h.toStatus]}</span>
                <span className="text-muted-foreground ml-auto">
                  {h.changedByName} · {new Date(h.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function InterviewDetailContent({ interview }: { interview: InterviewDetail }) {
  const deleteInterview = useDeleteInterview();
  const c = interview.candidate;
  const j = interview.job;
  const isTerminal = TERMINAL_STATUSES.includes(interview.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Round ${interview.round}${interview.roundLabel ? ` · ${interview.roundLabel}` : ''}`}
        description={`${c.firstName} ${c.lastName} · ${j.title}`}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Interviews', href: '/interviews' },
          { title: `${c.firstName} ${c.lastName}` },
        ]}
        actions={
          !isTerminal && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (window.confirm('Cancel this interview?')) {
                  deleteInterview.mutate(interview.id);
                }
              }}
              disabled={deleteInterview.isPending}
            >
              Delete
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interview info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Interview details</CardTitle>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[interview.status]}`}
                >
                  {INTERVIEW_STATUS_LABELS[interview.status]}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid gap-2 text-sm">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-28 shrink-0">Type</dt>
                  <dd>{INTERVIEW_TYPE_LABELS[interview.type]}</dd>
                </div>
                {interview.scheduledAt && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-28 shrink-0">Scheduled</dt>
                    <dd>
                      {new Date(interview.scheduledAt).toLocaleString()}{' '}
                      {interview.timezone ? `(${interview.timezone})` : ''}
                    </dd>
                  </div>
                )}
                {interview.durationMinutes && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-28 shrink-0">Duration</dt>
                    <dd>{interview.durationMinutes} min</dd>
                  </div>
                )}
                {interview.location && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-28 shrink-0">Location</dt>
                    <dd className="truncate">{interview.location}</dd>
                  </div>
                )}
                {interview.interviewerName && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-28 shrink-0">Interviewer</dt>
                    <dd>
                      {interview.interviewerName}
                      {interview.interviewerEmail ? ` — ${interview.interviewerEmail}` : ''}
                    </dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-28 shrink-0">Owner</dt>
                  <dd>
                    {interview.owner.firstName} {interview.owner.lastName}
                  </dd>
                </div>
              </dl>

              {interview.briefingNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Briefing notes
                    </p>
                    <p className="text-sm whitespace-pre-line">{interview.briefingNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Candidate + submission context */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Candidate &amp; job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                  {c.currentTitle && (
                    <p className="text-xs text-muted-foreground">{c.currentTitle}</p>
                  )}
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/candidates/${c.id}`}>View</Link>
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{j.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {j.reqId}
                    {j.department ? ` — ${j.department}` : ''}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/jobs/${j.id}`}>View</Link>
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Submission</p>
                  <p className="text-xs font-medium">{interview.submission.status}</p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/submissions/${interview.submissionId}`}>View</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <FeedbackCard interviewId={interview.id} feedback={interview.feedback} />
          <NotesTimeline interview={interview} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {!isTerminal && <StatusControls interview={interview} />}
          <StatusHistory interview={interview} />

          {/* Participants */}
          {interview.participants.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Participants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {interview.participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-xs">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.role}</p>
                    </div>
                    {p.hasConfirmed && (
                      <span className="text-xs text-green-600 font-medium">Confirmed</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: interview, isLoading, isError } = useInterview(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !interview) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-destructive">Interview not found.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/interviews">Back to interviews</Link>
        </Button>
      </div>
    );
  }

  return <InterviewDetailContent interview={interview} />;
}
