'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity, AlertTriangle, Bell, Briefcase, Calendar, ClipboardList, Edit,
  ExternalLink, FileText, History, Loader2, Mail, MapPin, MessageSquare, Phone,
  RefreshCw, Send, ShieldAlert, Sparkles, Trash2, TrendingUp, X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MetricTile,
  NextActionsPanel,
  OwnerCard,
  ProfileCompletenessCard,
  QuickActionMenu,
  SignalBadge,
  StaleIndicator,
  StatusTransitionMenu,
  WorkspaceFact,
  WorkspaceHeader,
  WorkspaceShell,
  WorkspaceTabs,
  type NextAction,
  type QuickAction,
  type WorkspaceTab,
} from '@/components/workspace';
import {
  useCandidate, useDeleteCandidate, useTransitionCandidateStatus,
} from '@/hooks/use-candidates';
import {
  useAssignCandidateOwner, useCandidateWorkspace,
} from '@/hooks/use-candidate-workspace';
import { useUsers } from '@/hooks/use-users-mgmt';
import { useAuthContext } from '@/providers/auth-provider';
import type { CandidateStatus } from '@/types/candidates';
import { cn } from '@/lib/utils';

import { ActivityTab } from './_tabs/activity-tab';
import { AuditTab } from './_tabs/audit-tab';
import { CommunicationsTab } from './_tabs/communications-tab';
import { DuplicatesTab } from './_tabs/duplicates-tab';
import { InterviewsTab } from './_tabs/interviews-tab';
import { NotesTab } from './_tabs/notes-tab';
import { OverviewTab } from './_tabs/overview-tab';
import { ResumesTab } from './_tabs/resumes-tab';
import {
  AVAILABILITY_LABELS, CANDIDATE_TRANSITIONS, STATUS_LABELS, STATUS_TONE,
} from './_tabs/shared';
import { SubmissionsTab } from './_tabs/submissions-tab';

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-20" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-96" />
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}

export default function CandidateWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuthContext();

  const { data: candidate, isLoading, isError } = useCandidate(id);
  const { data: workspace } = useCandidateWorkspace(id);
  const { data: usersResp } = useUsers({ limit: 200 });

  const deleteMutation = useDeleteCandidate();
  const transitionStatus = useTransitionCandidateStatus(id);
  const assignOwner = useAssignCandidateOwner(id);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canUpdate = hasPermission('candidates:update');
  const canDelete = hasPermission('candidates:delete');
  const canManageUsers = hasPermission('users:read');

  const metrics  = workspace?.metrics;
  const health   = workspace?.health;
  const summary  = workspace?.resumeSummary;

  // ── Next actions ────────────────────────────────────────────────────────────
  const nextActions: NextAction[] = useMemo(() => {
    if (!candidate || !metrics || !health) return [];
    const actions: NextAction[] = [];

    if (metrics.overdueReminders > 0) {
      actions.push({
        id: 'overdue', icon: Bell, urgent: true,
        label: `${metrics.overdueReminders} overdue reminder${metrics.overdueReminders > 1 ? 's' : ''}`,
        hint: 'Address overdue items', href: `/reminders?candidateId=${id}`,
      });
    }
    if (health.hasResumesPendingReview) {
      actions.push({
        id: 'review-resume', icon: FileText, urgent: true,
        label: 'Resume parsing needs review',
        hint: 'A resume is awaiting human review',
        href: `/reviews`,
      });
    }
    if (health.hasDuplicatesPending) {
      actions.push({
        id: 'review-dupes', icon: AlertTriangle, urgent: true,
        label: `${metrics.pendingDuplicates} duplicate${metrics.pendingDuplicates > 1 ? 's' : ''} pending review`,
        hint: 'Decide before re-engaging',
      });
    }
    if (candidate.availabilityStatus === 'IMMEDIATELY' && metrics.activeSubmissions === 0) {
      actions.push({
        id: 'submit', icon: Send, primary: true,
        label: 'Submit to an open job',
        hint: 'Available immediately, no active submission',
        href: `/submissions/new?candidateId=${id}`,
      });
    } else if (metrics.activeSubmissions === 0 && candidate.status === 'AVAILABLE') {
      actions.push({
        id: 'find-jobs', icon: Briefcase, primary: true,
        label: 'Find matching jobs', href: `/jobs?status=OPEN`,
      });
    }
    if (metrics.activeSubmissions > 0) {
      actions.push({
        id: 'pipeline', icon: TrendingUp,
        label: `View ${metrics.activeSubmissions} active submission${metrics.activeSubmissions > 1 ? 's' : ''}`,
      });
    }
    if (health.isStale && candidate.status !== 'PLACED' && candidate.status !== 'BLACKLISTED') {
      actions.push({
        id: 'reengage', icon: RefreshCw, urgent: true,
        label: 'Re-engage candidate',
        hint: metrics.daysSinceActivity ? `No activity for ${metrics.daysSinceActivity} days` : undefined,
      });
    }
    if (health.isProfileIncomplete) {
      actions.push({
        id: 'fill-profile', icon: Sparkles,
        label: 'Complete profile',
        hint: `${workspace?.profileCompleteness.missing.length ?? 0} fields missing`,
        href: `/candidates/${id}/edit`,
      });
    }
    return actions;
  }, [candidate, id, metrics, health, workspace?.profileCompleteness.missing.length]);

  // ── Header quick actions ────────────────────────────────────────────────────
  const quickActions: QuickAction[] = useMemo(() => {
    if (!candidate) return [];
    const a: QuickAction[] = [];
    if (canUpdate) {
      a.push({ id: 'submit',    icon: Send,        label: 'Submit to job',   href: `/submissions/new?candidateId=${id}` });
      a.push({ id: 'reminder',  icon: Bell,        label: 'New reminder',    href: `/reminders/new?candidateId=${id}` });
      a.push({ id: 'edit',      icon: Edit,        label: 'Edit profile',    href: `/candidates/${id}/edit`, separator: true });
      a.push({ id: 'note',      icon: MessageSquare, label: 'Jump to notes', href: `#notes` });
      a.push({ id: 'resumes',   icon: FileText,    label: 'Resume center',   href: `#resumes` });
    }
    if (canDelete) {
      a.push({ id: 'delete', icon: Trash2, label: 'Delete candidate', danger: true, separator: true,
        onClick: () => setShowDeleteConfirm(true),
      });
    }
    return a;
  }, [candidate, id, canUpdate, canDelete]);

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

  const fullLocation = [candidate.city, candidate.country].filter(Boolean).join(', ') || candidate.location;

  function handleDelete() {
    deleteMutation.mutate(id, { onSuccess: () => router.push('/candidates') });
  }

  // Owner reassignment options — exclude inactive accounts from dropdown.
  const ownerOptions = (usersResp?.data ?? [])
    .filter((u) => u.status === 'ACTIVE')
    .map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName}`, email: u.email }));

  // ── Tab definitions ─────────────────────────────────────────────────────────
  const tabs: WorkspaceTab[] = [
    { id: 'overview',      label: 'Overview',     icon: ClipboardList },
    { id: 'resumes',       label: 'Resumes',      icon: FileText, count: metrics?.resumeCount },
    { id: 'submissions',   label: 'Submissions',  icon: Send,     count: metrics?.activeSubmissions },
    { id: 'interviews',    label: 'Interviews',   icon: Calendar, count: metrics?.upcomingInterviews },
    { id: 'notes',         label: 'Notes',        icon: MessageSquare },
    { id: 'duplicates',    label: 'Duplicates',   icon: AlertTriangle, count: metrics?.pendingDuplicates },
    { id: 'activity',      label: 'Activity',     icon: Activity },
    { id: 'communications',label: 'Comms',        icon: Mail },
    { id: 'audit',         label: 'Audit',        icon: History, hidden: !canManageUsers },
  ];

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
            <StatusTransitionMenu<CandidateStatus>
              current={candidate.status}
              transitions={CANDIDATE_TRANSITIONS[candidate.status]}
              labels={STATUS_LABELS}
              tones={STATUS_TONE}
              disabled={!canUpdate}
              pending={transitionStatus.isPending}
              onTransition={(next) => transitionStatus.mutate(next)}
            />
            <Badge variant="secondary" className="text-xs">
              {AVAILABILITY_LABELS[candidate.availabilityStatus]}
            </Badge>
            {candidate.isRemote && <Badge variant="outline" className="text-xs">Remote</Badge>}
            <StaleIndicator lastActivityAt={candidate.lastActivityAt} thresholdDays={30} label="No contact" />

            {/* Health signals */}
            {health?.hasOverdueReminders && (
              <SignalBadge icon={Bell} label="Overdue" tone="danger" count={metrics?.overdueReminders} />
            )}
            {health?.hasResumesPendingReview && (
              <SignalBadge icon={FileText} label="Resume review" tone="warning" />
            )}
            {health?.hasDuplicatesPending && (
              <SignalBadge icon={AlertTriangle} label="Duplicates" tone="warning" count={metrics?.pendingDuplicates} />
            )}
            {health?.hasPendingFeedback && (
              <SignalBadge icon={ShieldAlert} label="Feedback due" tone="warning" />
            )}
            {health?.isProfileIncomplete && metrics && (
              <SignalBadge icon={Sparkles} label={`Profile ${metrics.profileCompleteness}%`} tone="info" />
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
            {canUpdate && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/candidates/${id}/edit`}>
                  <Edit className="mr-1 h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {quickActions.length > 0 && <QuickActionMenu actions={quickActions} label="More" />}
            {canDelete && showDeleteConfirm && (
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
            {metrics && (
              <WorkspaceFact label="Health score">
                <span className={cn(
                  'tabular-nums',
                  metrics.healthScore >= 70 ? 'text-green-700'
                  : metrics.healthScore >= 40 ? 'text-amber-700' : 'text-red-700',
                )}>
                  {metrics.healthScore}/100
                </span>
              </WorkspaceFact>
            )}
          </>
        }
      />

      {/* Metric tile rail */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <MetricTile label="Active subs"        value={metrics.activeSubmissions} icon={Send}        tone={metrics.activeSubmissions > 0 ? 'info' : 'default'} href={`#submissions`} />
          <MetricTile label="Interviews"         value={metrics.upcomingInterviews} icon={Calendar}    tone={metrics.upcomingInterviews > 0 ? 'info' : 'default'} href={`#interviews`} />
          <MetricTile label="Open reminders"     value={metrics.openReminders}      icon={Bell}        tone={metrics.overdueReminders > 0 ? 'danger' : metrics.openReminders > 0 ? 'warning' : 'default'} hint={metrics.overdueReminders > 0 ? `${metrics.overdueReminders} overdue` : undefined} />
          <MetricTile label="Resumes"            value={metrics.resumeCount}        icon={FileText}    tone={summary?.latestReviewState === 'PENDING' ? 'warning' : 'default'} hint={summary?.latestReviewState ? `Review: ${summary.latestReviewState}` : undefined} href={`#resumes`} />
          <MetricTile label="Pending dupes"      value={metrics.pendingDuplicates}  icon={AlertTriangle} tone={metrics.pendingDuplicates > 0 ? 'warning' : 'default'} hint={metrics.exactDuplicates > 0 ? `${metrics.exactDuplicates} exact` : undefined} href={`#duplicates`} />
          <MetricTile label="Profile"            value={`${metrics.profileCompleteness}%`} icon={Sparkles} tone={metrics.profileCompleteness >= 80 ? 'positive' : metrics.profileCompleteness >= 50 ? 'info' : 'warning'} hint={`Health ${metrics.healthScore}`} />
        </div>
      )}

      <WorkspaceShell
        rail={
          <>
            <NextActionsPanel actions={nextActions} />

            <OwnerCard
              owner={workspace?.owner ?? null}
              canEdit={canUpdate}
              options={ownerOptions}
              pending={assignOwner.isPending}
              onAssign={(ownerId) => assignOwner.mutate(ownerId)}
            />

            {workspace?.profileCompleteness && (
              <ProfileCompletenessCard
                score={workspace.profileCompleteness.score}
                missing={workspace.profileCompleteness.missing}
                hint={`Health ${workspace.metrics.healthScore}/100`}
              />
            )}

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
          </>
        }
      >
        <WorkspaceTabs tabs={tabs} defaultTab="overview">
          {(active) => {
            switch (active) {
              case 'overview':
                return <OverviewTab candidate={candidate} workspace={workspace} canUpdate={canUpdate} />;
              case 'resumes':
                return <ResumesTab candidateId={id} canUpdate={canUpdate} />;
              case 'submissions':
                return <SubmissionsTab candidateId={id} canCreate={canUpdate} />;
              case 'interviews':
                return <InterviewsTab candidateId={id} />;
              case 'notes':
                return <NotesTab candidate={candidate} canUpdate={canUpdate} />;
              case 'duplicates':
                return <DuplicatesTab candidateId={id} canUpdate={canUpdate} />;
              case 'activity':
                return <ActivityTab candidateId={id} />;
              case 'communications':
                return <CommunicationsTab candidateEmail={candidate.email} candidateId={id} />;
              case 'audit':
                return <AuditTab candidateId={id} />;
              default:
                return null;
            }
          }}
        </WorkspaceTabs>
      </WorkspaceShell>
    </div>
  );
}
