'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, Download, FileText, Loader2, RefreshCw, User, XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  MetricTile,
  WorkspaceFact,
  WorkspaceHeader,
  WorkspaceShell,
} from '@/components/workspace';
import {
  useApproveReview,
  useClaimReview,
  useReleaseReview,
  useReparseFromReview,
  useReview,
  useRejectReview,
  useSaveReviewDraft,
} from '@/hooks';
import { useAuth } from '@/hooks';
import { buildDownloadUrl } from '@/lib/api/resumes';
import { getApiErrorMessage } from '@/lib/api';
import { REVIEW_PRIORITY_LABELS, REVIEW_STATUS_LABELS } from '@/types';
import type {
  ReviewDecisionPayload, ReviewPriority, ReviewTaskStatus,
} from '@/types';
import { FieldEditor } from './extraction-form';

const STATUS_STYLES: Record<ReviewTaskStatus, string> = {
  PENDING:           'bg-amber-100 text-amber-800',
  IN_REVIEW:         'bg-blue-100 text-blue-800',
  APPROVED:          'bg-green-100 text-green-800',
  REJECTED:          'bg-red-100 text-red-800',
  REPARSE_REQUESTED: 'bg-slate-100 text-slate-700',
  SUPERSEDED:        'bg-gray-100 text-gray-400',
};

const PRIORITY_STYLES: Record<ReviewPriority, string> = {
  LOW:    'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-50 text-blue-700',
  HIGH:   'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

// Field schema rendered on the right pane. Each entry is { path, label }.
// path is dotted into ExtractionPayload; label is the display label.
const FIELD_GROUPS: Array<{ title: string; fields: Array<{ path: string; label: string }> }> = [
  {
    title: 'Identity',
    fields: [
      { path: 'identity.firstName',   label: 'First name' },
      { path: 'identity.lastName',    label: 'Last name' },
      { path: 'identity.fullName',    label: 'Full name' },
      { path: 'identity.emails',      label: 'Email' },
      { path: 'identity.phones',      label: 'Phone' },
      { path: 'identity.linkedinUrl', label: 'LinkedIn' },
      { path: 'identity.location.city',    label: 'City' },
      { path: 'identity.location.state',   label: 'State' },
      { path: 'identity.location.country', label: 'Country' },
    ],
  },
  {
    title: 'Professional',
    fields: [
      { path: 'professional.currentTitle',   label: 'Current title' },
      { path: 'professional.currentCompany', label: 'Current company' },
      { path: 'professional.summary',        label: 'Summary' },
      { path: 'professional.skills',         label: 'Skills' },
    ],
  },
  {
    title: 'Recruiting',
    fields: [
      { path: 'recruiting.noticePeriodDays',  label: 'Notice period (days)' },
      { path: 'recruiting.currentCtc.amount', label: 'Current CTC' },
      { path: 'recruiting.expectedCtc.amount',label: 'Expected CTC' },
      { path: 'recruiting.visaStatus',        label: 'Visa status' },
      { path: 'recruiting.workAuthorization', label: 'Work authorization' },
    ],
  },
];

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const k of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

export default function ReviewWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: task, isLoading, isError } = useReview(id);
  const { user: me } = useAuth();

  const claim    = useClaimReview(id);
  const release  = useReleaseReview(id);
  const saveDraft = useSaveReviewDraft(id);
  const approve  = useApproveReview(id);
  const reject   = useRejectReview(id);
  const reparse  = useReparseFromReview(id);

  // Local edit state — synced from server draft on first load.
  const [editedFields,  setEditedFields]  = useState<Record<string, unknown>>({});
  const [rejectedSet,   setRejectedSet]   = useState<Set<string>>(new Set());
  const [notes,         setNotes]         = useState<string>('');
  const [rejectReason,  setRejectReason]  = useState<string>('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const draftVersionRef = useRef<number>(0);
  const hydratedRef     = useRef<boolean>(false);

  // Hydrate from server draft on first load only — subsequent server updates
  // don't clobber the recruiter's in-progress edits.
  useEffect(() => {
    if (!task || hydratedRef.current) return;
    hydratedRef.current = true;
    draftVersionRef.current = task.draftVersion;
    const d = task.draftDecision;
    if (d) {
      // Convert editedFields { path → { edited } } to a flat map.
      const flat: Record<string, unknown> = {};
      for (const [p, e] of Object.entries(d.editedFields ?? {})) {
        flat[p] = (e as { edited: unknown }).edited;
      }
      setEditedFields(flat);
      setRejectedSet(new Set(d.rejectedFields ?? []));
      setNotes(d.notes ?? '');
    }
  }, [task]);

  const claimedByMe = !!(task?.assigneeId && me?.id && task.assigneeId === me.id);
  const isLive = task && (task.status === 'PENDING' || task.status === 'IN_REVIEW');
  const isTerminal = task && !isLive;

  // ── Autosave ────────────────────────────────────────────────────────────
  const autosave = useCallback(async (next: { edited: Record<string, unknown>; rejected: Set<string>; notesStr: string }) => {
    if (!claimedByMe || !task) return;
    const decision: ReviewDecisionPayload = {
      editedFields:   Object.fromEntries(Object.entries(next.edited).map(([p, v]) => [p, { edited: v }])),
      rejectedFields: Array.from(next.rejected),
      notes:          next.notesStr || undefined,
    };
    try {
      const r = await saveDraft.mutateAsync({ decision, baseVersion: draftVersionRef.current });
      draftVersionRef.current = r.draftVersion;
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  }, [claimedByMe, task, saveDraft]);

  // Debounce autosave so a typing burst doesn't hammer the API.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback((edited: Record<string, unknown>, rejected: Set<string>, notesStr: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autosave({ edited, rejected, notesStr }), 750);
  }, [autosave]);

  const handleEdit = (path: string, value: unknown) => {
    const orig = getByPath(task?.payload, path);
    if (stableEq(value, orig)) {
      const { [path]: _, ...rest } = editedFields;
      setEditedFields(rest);
      scheduleSave(rest, rejectedSet, notes);
      return;
    }
    const next = { ...editedFields, [path]: value };
    setEditedFields(next);
    scheduleSave(next, rejectedSet, notes);
  };
  const handleClearEdit = (path: string) => {
    if (!(path in editedFields) && !rejectedSet.has(path)) return;
    const { [path]: _, ...rest } = editedFields;
    const r = new Set(rejectedSet); r.delete(path);
    setEditedFields(rest); setRejectedSet(r);
    scheduleSave(rest, r, notes);
  };
  const handleReject = (path: string) => {
    const r = new Set(rejectedSet); r.add(path);
    setRejectedSet(r);
    scheduleSave(editedFields, r, notes);
  };

  // Approve / reject / reparse handlers
  const doApprove = async () => {
    const decision: ReviewDecisionPayload = {
      editedFields:   Object.fromEntries(Object.entries(editedFields).map(([p, v]) => [p, { edited: v }])),
      rejectedFields: Array.from(rejectedSet),
      candidateAction: { kind: 'CREATE' },
      notes: notes || undefined,
    };
    try {
      const t = await approve.mutateAsync({ decision });
      toast.success('Review approved');
      if (t.resultingCandidateId) {
        router.push(`/candidates/${t.resultingCandidateId}`);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };
  const doReject = async () => {
    if (!rejectReason.trim()) { toast.error('Reason required to reject'); return; }
    try {
      await reject.mutateAsync({ reason: rejectReason.trim() });
      toast.success('Review rejected');
      router.push('/resume-reviews');
    } catch (e) { toast.error(getApiErrorMessage(e)); }
  };
  const doReparse = async () => {
    try {
      await reparse.mutateAsync({});
      toast.success('Reparse queued');
      router.push('/resume-reviews');
    } catch (e) { toast.error(getApiErrorMessage(e)); }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError || !task) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <p className="text-sm text-destructive">Failed to load review.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/resume-reviews">Back to reviews</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const downloadUrl = buildDownloadUrl(task.resumeId, task.resumeVersionId);
  const confidencePct = Math.round(task.overallConfidence * 100);

  return (
    <WorkspaceShell
      rail={
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-medium">Confidence</h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricTile label="Overall"      value={`${confidencePct}%`} />
                <MetricTile label="Edits"        value={Object.keys(editedFields).length} />
                <MetricTile label="Rejected"     value={rejectedSet.size} />
                <MetricTile label="Draft v"      value={task.draftVersion} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="text-sm font-medium">Candidate</h3>
              <Link
                href={`/candidates/${task.candidateId}`}
                className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm hover:bg-muted"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{task.candidateName || task.candidateId.slice(0, 8)}…</span>
              </Link>
            </CardContent>
          </Card>
          {task.parsingJob && (
            <Card>
              <CardContent className="p-4 space-y-1 text-xs">
                <h3 className="text-sm font-medium">Parsed by</h3>
                <div className="text-muted-foreground">{task.parsingJob.provider} · attempt {task.parsingJob.attempt}</div>
                {task.parsingJob.durationMs != null && (
                  <div className="text-muted-foreground">{task.parsingJob.durationMs} ms</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      }
    >
      <WorkspaceHeader
        eyebrow="Resume review"
        title={task.resumeFileName || 'Untitled'}
        subtitle={task.candidateName || undefined}
        breadcrumbs={[
          { title: 'Dashboard',       href: '/dashboard' },
          { title: 'Resume reviews',  href: '/resume-reviews' },
          { title: task.resumeFileName || task.id.slice(0, 8) },
        ]}
        badges={
          <>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
              {REVIEW_STATUS_LABELS[task.status]}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
              {REVIEW_PRIORITY_LABELS[task.priority]}
            </span>
            {task.assigneeId && claimedByMe && <Badge variant="secondary" className="text-xs">claimed by you</Badge>}
            {task.assigneeId && !claimedByMe && <Badge variant="outline"  className="text-xs">claimed by another reviewer</Badge>}
          </>
        }
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <a href={downloadUrl} target="_blank" rel="noreferrer">
                <Download className="mr-1.5 h-4 w-4" />
                Resume
              </a>
            </Button>
            {isLive && !claimedByMe && (
              <Button size="sm" onClick={() => claim.mutateAsync().catch((e) => toast.error(getApiErrorMessage(e)))}>
                <FileText className="mr-1.5 h-4 w-4" />
                Claim
              </Button>
            )}
            {isLive && claimedByMe && (
              <Button size="sm" variant="outline" onClick={() => release.mutate()}>Release</Button>
            )}
          </>
        }
        facts={
          <>
            <WorkspaceFact label="Confidence">{confidencePct}%</WorkspaceFact>
            <WorkspaceFact label="SLA due">{task.slaDueAt ? formatDistanceToNow(new Date(task.slaDueAt), { addSuffix: true }) : '—'}</WorkspaceFact>
            <WorkspaceFact label="Provider">{task.parsingJob?.provider ?? '—'}</WorkspaceFact>
            <WorkspaceFact label="Created">{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</WorkspaceFact>
          </>
        }
      />

      {/* Two-pane workspace */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Left pane: rawText preview (file viewer comes in a later phase) */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Source text</h3>
              <Button asChild size="sm" variant="ghost">
                <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-xs">
                  Open file ↗
                </a>
              </Button>
            </div>
            <pre className="max-h-[60vh] overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap font-mono">
              {task.rawText || '(no text extracted)'}
            </pre>
          </CardContent>
        </Card>

        {/* Right pane: editable extraction */}
        <Card>
          <CardContent className="p-4 space-y-5">
            {FIELD_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </h4>
                <div>
                  {group.fields.map(({ path, label }) => {
                    const v = getByPath(task.payload, path);
                    const present = v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true);
                    if (!present && !(path in editedFields) && !rejectedSet.has(path)) {
                      return null;
                    }
                    return (
                      <FieldEditor
                        key={path}
                        label={label}
                        path={path}
                        value={v}
                        edited={editedFields[path]}
                        rejected={rejectedSet.has(path)}
                        confidence={task.confidence[path] ?? task.confidence[path.split('.').slice(0, -1).join('.')]}
                        onEdit={(p, value) => { if (claimedByMe) handleEdit(p, value); }}
                        onReject={(p) => { if (claimedByMe) handleReject(p); }}
                        onClearEdit={(p) => { if (claimedByMe) handleClearEdit(p); }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h4>
              <Textarea
                value={notes}
                disabled={!claimedByMe}
                onChange={(e) => { setNotes(e.target.value); scheduleSave(editedFields, rejectedSet, e.target.value); }}
                placeholder="Internal notes about this extraction"
                rows={2}
              />
            </div>

            {isLive && !claimedByMe && (
              <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
                Click &quot;Claim&quot; above to edit fields and approve.
              </p>
            )}

            {isTerminal && (
              <div className={`rounded-md border px-3 py-2 text-sm ${
                task.status === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-900'
                : task.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-muted/40'
              }`}>
                Terminal state: <span className="font-medium">{REVIEW_STATUS_LABELS[task.status]}</span>
                {task.decisionNotes && <div className="mt-1 text-xs">{task.decisionNotes}</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer action bar */}
      {isLive && claimedByMe && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {showRejectBox ? (
              <div className="space-y-2">
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setShowRejectBox(false); setRejectReason(''); }}>
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" disabled={!rejectReason.trim() || reject.isPending} onClick={doReject}>
                    {reject.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                    Reject extraction
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost"   size="sm" onClick={doReparse}  disabled={reparse.isPending}>
                  <RefreshCw className={`mr-1.5 h-4 w-4 ${reparse.isPending ? 'animate-spin' : ''}`} />
                  Reparse
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowRejectBox(true)}>
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Reject
                </Button>
                <Button size="sm" onClick={doApprove} disabled={approve.isPending}>
                  {approve.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                  Approve &amp; save to candidate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </WorkspaceShell>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stableEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => stableEq(x, b[i]));
  }
  return JSON.stringify(a) === JSON.stringify(b);
}
