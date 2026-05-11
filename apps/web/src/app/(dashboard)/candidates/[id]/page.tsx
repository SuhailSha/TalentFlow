'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { differenceInCalendarDays, formatDistanceToNow } from 'date-fns';
import {
  Bell, Briefcase, Building2, Calendar, ExternalLink, FileText, Loader2, Mail,
  MapPin, MessageSquare, Phone, Plus, RefreshCw, Send, Sparkles, Trash2,
  TrendingUp, X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  useCandidate, useCandidateNotes, useDeleteCandidate, useAddNote, useRemoveSkill,
} from '@/hooks/use-candidates';
import { useSubmissions } from '@/hooks/use-submissions';
import { useInterviews } from '@/hooks/use-interviews';
import { useReminders } from '@/hooks/use-reminders';
import { useEntityActivity } from '@/hooks/use-activity';
import { useAuthContext } from '@/providers/auth-provider';
import type { CandidateStatus, AvailabilityStatus, NoteType } from '@/types/candidates';
import type { SubmissionStatus } from '@/types/submissions';
import type { InterviewStatus } from '@/types/interviews';
import type { ReminderStatus } from '@/types/reminders';
import { cn } from '@/lib/utils';

// ── Lookups ───────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<CandidateStatus, string> = {
  ACTIVE:      'bg-green-100 text-green-800',
  AVAILABLE:   'bg-teal-100 text-teal-800',
  INACTIVE:    'bg-gray-100 text-gray-700',
  PLACED:      'bg-blue-100 text-blue-800',
  BLACKLISTED: 'bg-red-100 text-red-800',
};

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  IMMEDIATELY:  'Available now',
  TWO_WEEKS:    '2 weeks notice',
  ONE_MONTH:    '1 month notice',
  THREE_MONTHS: '3 months notice',
  NOT_LOOKING:  'Not looking',
};

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  NOTE: 'Note', CALL: 'Call', EMAIL: 'Email', MEETING: 'Meeting',
  STATUS_CHANGE: 'Status change', SYSTEM: 'System',
};

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

const REMINDER_TONE: Record<ReminderStatus, 'gray' | 'amber' | 'blue' | 'green' | 'red'> = {
  PENDING: 'blue', ACKNOWLEDGED: 'amber', SNOOZED: 'gray',
  COMPLETED: 'green', DISMISSED: 'gray', EXPIRED: 'red',
};

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

export default function CandidateWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuthContext();

  const { data: candidate, isLoading, isError } = useCandidate(id);
  const { data: notes } = useCandidateNotes(id);
  const { data: submissionsResp } = useSubmissions({ candidateId: id, limit: 50 });
  const { data: interviewsResp } = useInterviews({ candidateId: id, limit: 50 });
  const { data: remindersResp } = useReminders({ candidateId: id, limit: 20 });
  const { data: activity = [], isLoading: activityLoading } = useEntityActivity('candidate', id, 30);

  const deleteMutation = useDeleteCandidate();
  const addNoteMutation = useAddNote(id);
  const removeSkillMutation = useRemoveSkill(id);

  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('NOTE');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canUpdate = hasPermission('candidates:update');
  const canDelete = hasPermission('candidates:delete');

  const submissions = submissionsResp?.data ?? [];
  const interviews = interviewsResp?.data ?? [];
  const reminders = remindersResp?.data ?? [];

  const activeSubmissions = submissions.filter(
    (s) => !['CLOSED', 'REJECTED', 'WITHDRAWN', 'PLACED'].includes(s.status),
  );
  const placedSubmissions = submissions.filter((s) => s.status === 'PLACED');
  const upcomingInterviews = interviews.filter(
    (i) =>
      (i.status === 'SCHEDULED' || i.status === 'CONFIRMED' || i.status === 'RESCHEDULED') &&
      i.scheduledAt &&
      new Date(i.scheduledAt).getTime() > Date.now(),
  );
  const openReminders = reminders.filter(
    (r) => r.status === 'PENDING' || r.status === 'ACKNOWLEDGED' || r.status === 'SNOOZED',
  );
  const overdueReminders = openReminders.filter(
    (r) => r.dueAt && new Date(r.dueAt).getTime() < Date.now(),
  );

  const daysSinceActivity = candidate?.lastActivityAt
    ? differenceInCalendarDays(new Date(), new Date(candidate.lastActivityAt))
    : null;

  // ── Next actions ────────────────────────────────────────────────────────────
  const nextActions: NextAction[] = useMemo(() => {
    if (!candidate) return [];
    const actions: NextAction[] = [];

    if (overdueReminders.length > 0) {
      actions.push({
        id: 'overdue', icon: Bell, urgent: true,
        label: `${overdueReminders.length} overdue reminder${overdueReminders.length > 1 ? 's' : ''}`,
        hint: 'Address overdue items', href: `/reminders?candidateId=${id}`,
      });
    }
    if (candidate.availabilityStatus === 'IMMEDIATELY' && activeSubmissions.length === 0) {
      actions.push({
        id: 'submit', icon: Send, primary: true,
        label: 'Submit to an open job',
        hint: 'Available immediately with no active submission',
        href: `/submissions/new?candidateId=${id}`,
      });
    } else if (activeSubmissions.length === 0 && candidate.status === 'AVAILABLE') {
      actions.push({
        id: 'find-jobs', icon: Briefcase, primary: true,
        label: 'Find matching jobs', href: `/jobs?status=OPEN`,
      });
    }
    if (activeSubmissions.length > 0) {
      actions.push({
        id: 'pipeline', icon: TrendingUp,
        label: `View ${activeSubmissions.length} active submission${activeSubmissions.length > 1 ? 's' : ''}`,
        href: `/submissions?candidateId=${id}`,
      });
    }
    if (daysSinceActivity !== null && daysSinceActivity >= 30 && candidate.status !== 'PLACED' && candidate.status !== 'BLACKLISTED') {
      actions.push({
        id: 'reengage', icon: RefreshCw, urgent: true,
        label: 'Re-engage candidate',
        hint: `No activity for ${daysSinceActivity} days`,
      });
    }
    if (candidate.allSkills.length === 0) {
      actions.push({
        id: 'add-skills', icon: Sparkles,
        label: 'Add skills',
        hint: 'Improves matching and discoverability',
        href: `/candidates/${id}/edit`,
      });
    }
    return actions;
  }, [candidate, id, activeSubmissions.length, daysSinceActivity, overdueReminders.length]);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !candidate) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-sm text-destructive">Candidate not found.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/candidates">Back to candidates</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const visibleNotes = notes ?? candidate.notes;

  function handleAddNote() {
    if (!noteContent.trim()) return;
    addNoteMutation.mutate(
      { content: noteContent.trim(), noteType },
      { onSuccess: () => setNoteContent('') },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(id, { onSuccess: () => router.push('/candidates') });
  }

  const fullLocation = [candidate.city, candidate.country].filter(Boolean).join(', ') || candidate.location;

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Candidate"
        title={candidate.fullName}
        subtitle={
          candidate.currentTitle && (
            <span className="flex flex-wrap items-center gap-1.5 text-sm">
              <Briefcase className="h-3.5 w-3.5" />
              {candidate.currentTitle}
              {candidate.currentCompany && <span className="text-muted-foreground">at {candidate.currentCompany}</span>}
            </span>
          )
        }
        breadcrumbs={[
          { title: 'Candidates', href: '/candidates' },
          { title: candidate.fullName },
        ]}
        badges={
          <>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', STATUS_TONE[candidate.status])}>
              {candidate.status}
            </span>
            <Badge variant="secondary" className="text-xs">
              {AVAILABILITY_LABELS[candidate.availabilityStatus]}
            </Badge>
            {candidate.isRemote && <Badge variant="outline" className="text-xs">Remote</Badge>}
            <StaleIndicator lastActivityAt={candidate.lastActivityAt} thresholdDays={30} label="No contact" />
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
            {canUpdate && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/submissions/new?candidateId=${id}`}>
                  <Send className="mr-1 h-4 w-4" /> Submit to job
                </Link>
              </Button>
            )}
            {canDelete && (
              showDeleteConfirm ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Sure?</span>
                  <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Delete
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              )
            )}
          </>
        }
        facts={
          <>
            <WorkspaceFact label="Experience">
              {candidate.experienceYears !== null ? `${candidate.experienceYears} years` : '—'}
            </WorkspaceFact>
            <WorkspaceFact label="Location">{fullLocation || '—'}</WorkspaceFact>
            <WorkspaceFact label="Salary expectation">
              {candidate.salaryExpectationMin || candidate.salaryExpectationMax
                ? `${candidate.salaryCurrency ?? 'USD'} ${candidate.salaryExpectationMin?.toLocaleString() ?? '—'}${candidate.salaryExpectationMax ? `–${candidate.salaryExpectationMax.toLocaleString()}` : ''}`
                : '—'}
            </WorkspaceFact>
            <WorkspaceFact label="Last activity">
              {candidate.lastActivityAt
                ? formatDistanceToNow(new Date(candidate.lastActivityAt), { addSuffix: true })
                : '—'}
            </WorkspaceFact>
          </>
        }
      />

      <WorkspaceShell
        rail={
          <>
            <NextActionsPanel actions={nextActions} />

            {/* Contact */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <a href={`mailto:${candidate.email}`} className="flex items-center gap-2 hover:text-primary">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {candidate.email}
                </a>
                {candidate.phone && (
                  <a href={`tel:${candidate.phone}`} className="flex items-center gap-2 hover:text-primary">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {candidate.phone}
                  </a>
                )}
                {fullLocation && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {fullLocation}
                  </span>
                )}
                <div className="flex flex-wrap gap-3 pt-1">
                  {candidate.linkedinUrl && (
                    <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {candidate.githubUrl && (
                    <a href={candidate.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      GitHub <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {candidate.portfolioUrl && (
                    <a href={candidate.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      Portfolio <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

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

            {/* Meta */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <p>Source: <span className="text-foreground">{candidate.source}</span></p>
                {candidate.sourceDetail && <p>{candidate.sourceDetail}</p>}
                <p>Added: <span className="text-foreground">{new Date(candidate.createdAt).toLocaleDateString()}</span></p>
              </CardContent>
            </Card>
          </>
        }
      >
        {/* Summary */}
        {candidate.summary && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{candidate.summary}</p>
            </CardContent>
          </Card>
        )}

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
                <Link href={`/submissions/new?candidateId=${id}`}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Submit
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {submissions.length === 0
                  ? 'No submissions yet.'
                  : 'No active submissions — all engagements are closed or terminal.'}
              </p>
            ) : (
              activeSubmissions.map((s) => (
                <RelatedEntityCard
                  key={s.id}
                  eyebrow={s.job.reqId}
                  icon={Briefcase}
                  title={s.job.title}
                  subtitle={(s.job.department ?? '') + (s.vendor ? ` · via ${s.vendor.companyName}` : '')}
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
            {placedSubmissions.length > 0 && (
              <details className="pt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  {placedSubmissions.length} placed engagement{placedSubmissions.length > 1 ? 's' : ''}
                </summary>
                <div className="space-y-2 pt-2">
                  {placedSubmissions.map((s) => (
                    <RelatedEntityCard
                      key={s.id}
                      eyebrow={s.job.reqId}
                      icon={Building2}
                      title={s.job.title}
                      subtitle={s.placedAt ? `Placed ${new Date(s.placedAt).toLocaleDateString()}` : undefined}
                      status="PLACED"
                      statusTone="green"
                      href={`/submissions/${s.id}`}
                    />
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>

        {/* Interview history */}
        {interviews.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Interview history
                <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{interviews.length}</span>
                {upcomingInterviews.length > 0 && (
                  <span className="rounded bg-blue-100 px-1.5 text-xs text-blue-700">{upcomingInterviews.length} upcoming</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {interviews.slice(0, 10).map((iv) => (
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

        {/* Open reminders */}
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

        {/* Skills */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" />
              Skills
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{candidate.allSkills.length}</span>
            </CardTitle>
            {canUpdate && (
              <Button asChild size="sm" variant="ghost">
                <Link href={`/candidates/${id}/edit`}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {candidate.allSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {candidate.allSkills.map((cs) => (
                  <div key={cs.id} className="group flex items-center gap-1">
                    <Badge variant={cs.isPrimary ? 'default' : 'secondary'} className="text-xs">
                      {cs.skill.displayName}
                      {cs.yearsOfExperience !== null && (
                        <span className="ml-1 opacity-60">· {cs.yearsOfExperience}y</span>
                      )}
                    </Badge>
                    {canUpdate && (
                      <button
                        onClick={() => removeSkillMutation.mutate(cs.skill.id)}
                        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        aria-label={`Remove ${cs.skill.displayName}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
                <div className="flex gap-2">
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as NoteType)}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {(Object.keys(NOTE_TYPE_LABELS) as NoteType[])
                      .filter((t) => t !== 'STATUS_CHANGE' && t !== 'SYSTEM')
                      .map((t) => (
                        <option key={t} value={t}>{NOTE_TYPE_LABELS[t]}</option>
                      ))}
                  </select>
                </div>
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
                          {NOTE_TYPE_LABELS[note.noteType]}
                        </Badge>
                        {note.authorName}
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
