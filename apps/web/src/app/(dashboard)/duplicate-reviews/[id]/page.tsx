'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Calendar, CheckCircle2, ChevronRight, FileText, Loader2,
  Mail, MapPin, PauseCircle, Phone, ShieldAlert, User, XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  MetricTile, WorkspaceFact, WorkspaceHeader, WorkspaceShell,
} from '@/components/workspace';
import {
  useDeferDuplicateMatch, useDuplicateMatch, useMarkNotDuplicate,
} from '@/hooks';
import { approveReview as apiApproveReview } from '@/lib/api/reviews';
import { getApiErrorMessage } from '@/lib/api';
import { MATCH_STATUS_LABELS, TIER_LABELS } from '@/types';
import type {
  CandidateSummary, DuplicateConfidenceTier, DuplicateMatchStatus,
  MatchReason,
} from '@/types';

const TIER_STYLES: Record<DuplicateConfidenceTier, string> = {
  EXACT:    'bg-red-100 text-red-800',
  PROBABLE: 'bg-orange-100 text-orange-700',
  POSSIBLE: 'bg-blue-50  text-blue-700',
};

const STATUS_STYLES: Record<DuplicateMatchStatus, string> = {
  PENDING:             'bg-amber-100 text-amber-800',
  DEFERRED:            'bg-slate-100 text-slate-700',
  NOT_DUPLICATE:       'bg-green-100 text-green-800',
  SUPERSEDED:          'bg-gray-100 text-gray-400',
  CONFIRMED_DUPLICATE: 'bg-blue-100 text-blue-800',
};

function CandidateColumn({
  title, candidate,
}: {
  title: string;
  candidate: CandidateSummary;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{title}</span>
        </div>
        <div>
          <Link
            href={`/candidates/${candidate.id}`}
            className="text-base font-semibold hover:underline"
          >
            {candidate.fullName}
          </Link>
          <div className="mt-0.5">
            <Badge variant="outline" className="text-[10px]">{candidate.status}</Badge>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <Field icon={<Mail className="h-3.5 w-3.5" />} value={candidate.email} />
          <Field icon={<Phone className="h-3.5 w-3.5" />} value={candidate.phone} />
          <Field
            icon={<Briefcase className="h-3.5 w-3.5" />}
            value={[candidate.currentTitle, candidate.currentCompany].filter(Boolean).join(' @ ')}
          />
          <Field
            icon={<MapPin className="h-3.5 w-3.5" />}
            value={[candidate.city, candidate.country].filter(Boolean).join(', ')}
          />
          <Field
            icon={<Calendar className="h-3.5 w-3.5" />}
            value={candidate.createdAt ? `Created ${formatDistanceToNow(new Date(candidate.createdAt), { addSuffix: true })}` : null}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <MetricTile label="Resumes" value={candidate.resumeCount} />
          <MetricTile label="Submiss." value={candidate.submissionCount} />
          <MetricTile label="Intvw."   value={candidate.interviewCount} />
        </div>

        {candidate.skillNames.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Skills</div>
            <div className="flex flex-wrap gap-1">
              {candidate.skillNames.slice(0, 12).map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
              ))}
              {candidate.skillNames.length > 12 && (
                <Badge variant="outline" className="text-[10px]">+{candidate.skillNames.length - 12}</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ icon, value }: { icon: React.ReactNode; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}

function ReasonRow({ reason }: { reason: MatchReason }) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-2.5">
      <CheckCircle2 className="h-4 w-4 text-green-700 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{reason.label}</div>
        {reason.value && (
          <div className="text-xs text-muted-foreground truncate">
            <span className="font-mono">{reason.value}</span>
          </div>
        )}
        {reason.similarity != null && reason.similarity < 1 && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            similarity {Math.round(reason.similarity * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}

export default function DuplicateReviewWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: match, isLoading, isError } = useDuplicateMatch(id);
  const markNot = useMarkNotDuplicate(id);
  const defer   = useDeferDuplicateMatch(id);

  const [notDupReason,  setNotDupReason]  = useState('');
  const [deferNotes,    setDeferNotes]    = useState('');
  const [showNotDupBox, setShowNotDupBox] = useState(false);
  const [showDeferBox,  setShowDeferBox]  = useState(false);
  const [continuing,    setContinuing]    = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (isError || !match) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <p className="text-sm text-destructive">Failed to load duplicate match.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/duplicate-reviews">Back to queue</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isPending = match.status === 'PENDING' || match.status === 'DEFERRED';

  const handleMarkNotDup = async () => {
    if (!notDupReason.trim()) { toast.error('Reason required'); return; }
    try {
      await markNot.mutateAsync(notDupReason.trim());
      toast.success('Marked as not a duplicate');
      setShowNotDupBox(false); setNotDupReason('');
    } catch (e) { toast.error(getApiErrorMessage(e)); }
  };
  const handleDefer = async () => {
    try {
      await defer.mutateAsync(deferNotes.trim() || undefined);
      toast.success('Match deferred');
      setShowDeferBox(false); setDeferNotes('');
    } catch (e) { toast.error(getApiErrorMessage(e)); }
  };

  /**
   * "Continue Promotion" — re-runs the review approve with
   * acknowledgeDuplicates=true. Requires the linked review task. The
   * decision body is empty (no edits); the review carries whatever the
   * recruiter last saved in draft.
   */
  const handleContinue = async () => {
    if (!match.reviewTaskId) {
      toast.error('This match is not tied to an active review.');
      return;
    }
    setContinuing(true);
    try {
      await apiApproveReview(match.reviewTaskId, {
        decision: {},
        acknowledgeDuplicates: true,
      });
      toast.success('Candidate promoted');
      router.push(`/candidates/${match.targetCandidateId ? match.sourceCandidateId : match.sourceCandidateId}`);
    } catch (e) { toast.error(getApiErrorMessage(e)); }
    finally { setContinuing(false); }
  };

  return (
    <WorkspaceShell
      rail={
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-medium">Confidence</h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricTile label="Tier"  value={TIER_LABELS[match.confidenceTier]} />
                <MetricTile label="Score" value={`${Math.round(match.confidenceScore * 100)}%`} />
                <MetricTile label="Reasons" value={match.reasonCount} />
                <MetricTile label="Status"  value={MATCH_STATUS_LABELS[match.status]} />
              </div>
            </CardContent>
          </Card>
          {match.reviewTaskId && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-medium">Triggered by</h3>
                <Link
                  href={`/resume-reviews/${match.reviewTaskId}`}
                  className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm hover:bg-muted"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs">Resume review</span>
                  <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          )}
          {match.decisionNotes && (
            <Card>
              <CardContent className="p-4 space-y-1">
                <h3 className="text-sm font-medium">Decision</h3>
                <p className="text-xs text-muted-foreground">{match.decisionNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      }
    >
      <WorkspaceHeader
        eyebrow="Duplicate review"
        title={`${match.sourceName}  ↔  ${match.targetName}`}
        subtitle={`${match.reasonCount} explanation${match.reasonCount === 1 ? '' : 's'} — review before promoting the new candidate`}
        breadcrumbs={[
          { title: 'Dashboard',         href: '/dashboard' },
          { title: 'Duplicate reviews', href: '/duplicate-reviews' },
          { title: match.id.slice(0, 8) },
        ]}
        badges={
          <>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TIER_STYLES[match.confidenceTier]}`}>
              <ShieldAlert className="mr-1 h-3 w-3" />
              {TIER_LABELS[match.confidenceTier]}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[match.status]}`}>
              {MATCH_STATUS_LABELS[match.status]}
            </span>
          </>
        }
        facts={
          <>
            <WorkspaceFact label="Score">{Math.round(match.confidenceScore * 100)}%</WorkspaceFact>
            <WorkspaceFact label="Created">{formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })}</WorkspaceFact>
            <WorkspaceFact label="Decided">
              {match.decidedAt ? formatDistanceToNow(new Date(match.decidedAt), { addSuffix: true }) : '—'}
            </WorkspaceFact>
            <WorkspaceFact label="Reasons">{match.reasonCount}</WorkspaceFact>
          </>
        }
      />

      {/* Three-pane comparison */}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px_1fr]">
        <CandidateColumn title="Source (proposed)" candidate={match.source} />

        <Card className="self-start">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold">Match explanations</h3>
            <div className="space-y-2">
              {match.matchReasons.map((r, i) => (
                <ReasonRow key={i} reason={r} />
              ))}
            </div>
          </CardContent>
        </Card>

        <CandidateColumn title="Target (existing)" candidate={match.target} />
      </div>

      {/* Action bar */}
      {isPending ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {showNotDupBox ? (
              <div className="space-y-2">
                <Textarea
                  value={notDupReason}
                  onChange={(e) => setNotDupReason(e.target.value)}
                  placeholder="Reason this is not a duplicate (e.g. common name, different person)"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setShowNotDupBox(false); setNotDupReason(''); }}>Cancel</Button>
                  <Button variant="outline" size="sm" disabled={!notDupReason.trim() || markNot.isPending} onClick={handleMarkNotDup}>
                    {markNot.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                    Mark not duplicate
                  </Button>
                </div>
              </div>
            ) : showDeferBox ? (
              <div className="space-y-2">
                <Textarea
                  value={deferNotes}
                  onChange={(e) => setDeferNotes(e.target.value)}
                  placeholder="Optional notes — what should the next reviewer know?"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost"   size="sm" onClick={() => { setShowDeferBox(false); setDeferNotes(''); }}>Cancel</Button>
                  <Button variant="outline" size="sm" disabled={defer.isPending} onClick={handleDefer}>
                    {defer.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PauseCircle className="mr-1.5 h-4 w-4" />}
                    Defer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost"   size="sm" onClick={() => setShowDeferBox(true)}>
                  <PauseCircle className="mr-1.5 h-4 w-4" />
                  Defer
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowNotDupBox(true)}>
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Not duplicate
                </Button>
                {match.reviewTaskId && (
                  <Button size="sm" onClick={handleContinue} disabled={continuing}>
                    {continuing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                    Continue Promotion
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            This match is in a terminal state ({MATCH_STATUS_LABELS[match.status]}). No further action available.
          </CardContent>
        </Card>
      )}
    </WorkspaceShell>
  );
}
