'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle, Bell, Briefcase, Building2, Calendar, ChevronDown, ExternalLink,
  Globe, Loader2, Mail, MapPin, MessageSquare, Pencil, Phone, Plus, RefreshCw,
  Send, Star, Trash2, TrendingUp, User, Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  ActivityTimeline,
  MetricTile,
  NextActionsPanel,
  OverdueIndicator,
  RelatedEntityCard,
  StaleIndicator,
  WorkspaceFact,
  WorkspaceHeader,
  WorkspaceShell,
  type NextAction,
} from '@/components/workspace';
import { useEntityActivity } from '@/hooks/use-activity';
import { useVendorWorkspace } from '@/hooks/use-vendor-workspace';
import {
  useAddVendorContact,
  useAddVendorNote,
  useDeleteVendor,
  useRemoveVendorContact,
  useTransitionVendorStatus,
} from '@/hooks/use-vendors';
import { cn } from '@/lib/utils';
import type {
  CreateVendorContactDto,
  VendorContactView,
  VendorNoteView,
  VendorStatus,
} from '@/types/vendors';
import type { SubmissionStatus } from '@/types/submissions';
import type { InterviewStatus } from '@/types/interviews';
import type { ReminderStatus } from '@/types/reminders';

// ── Lookups ───────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<VendorStatus, string> = {
  PROSPECT: 'bg-purple-100 text-purple-800',
  ACTIVE:   'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
  BLOCKED:  'bg-red-100 text-red-800',
  ARCHIVED: 'bg-gray-100 text-gray-400',
};

const STATUS_TRANSITIONS: Record<VendorStatus, { label: string; target: VendorStatus }[]> = {
  PROSPECT: [{ label: 'Activate', target: 'ACTIVE' }, { label: 'Block', target: 'BLOCKED' }],
  ACTIVE:   [{ label: 'Mark inactive', target: 'INACTIVE' }, { label: 'Block', target: 'BLOCKED' }],
  INACTIVE: [{ label: 'Reactivate', target: 'ACTIVE' }, { label: 'Block', target: 'BLOCKED' }],
  BLOCKED:  [{ label: 'Archive', target: 'ARCHIVED' }],
  ARCHIVED: [],
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  NOTE: 'Note', CALL: 'Call', EMAIL: 'Email', MEETING: 'Meeting',
  STATUS_CHANGE: 'Status change', SYSTEM: 'System',
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

const REMINDER_TONE: Record<ReminderStatus, 'gray' | 'amber' | 'blue' | 'green' | 'red'> = {
  PENDING: 'blue', ACKNOWLEDGED: 'amber', SNOOZED: 'gray',
  COMPLETED: 'green', DISMISSED: 'gray', EXPIRED: 'red',
};

// ── Pipeline funnel mini ──────────────────────────────────────────────────────

function PipelineFunnel({ counts }: { counts: Record<string, number> }) {
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

function PageSkeleton() {
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
          <Skeleton className="h-60" />
        </div>
      </div>
    </div>
  );
}

// ── Contacts preserved from prior page ────────────────────────────────────────

function ContactCard({
  contact, onRemove,
}: { contact: VendorContactView; onRemove: (id: string) => void }) {
  return (
    <div className={cn('space-y-1 rounded-lg border p-3', contact.isPrimary && 'border-primary/30 bg-primary/5')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{contact.fullName}</span>
          {contact.isPrimary && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
          {!contact.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
        </div>
        <button
          onClick={() => onRemove(contact.id)}
          className="text-muted-foreground transition-colors hover:text-destructive"
          aria-label={`Remove ${contact.fullName}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {contact.title && <p className="text-xs text-muted-foreground">{contact.title}</p>}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-foreground">
          <Mail className="h-3 w-3" /> {contact.email}
        </a>
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-foreground">
            <Phone className="h-3 w-3" /> {contact.phone}
          </a>
        )}
      </div>
    </div>
  );
}

function AddContactForm({ vendorId, onDone }: { vendorId: string; onDone: () => void }) {
  const [form, setForm] = useState<CreateVendorContactDto>({
    firstName: '', lastName: '', email: '', isPrimary: false,
  });
  const { mutate, isPending } = useAddVendorContact(vendorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(form, { onSuccess: onDone });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          required placeholder="First name" value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          required placeholder="Last name" value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <input
        required type="email" placeholder="Email" value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        placeholder="Phone (optional)" value={form.phone ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value || undefined }))}
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox" checked={form.isPrimary}
          onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
        />
        Primary contact
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add contact'}
        </Button>
      </div>
    </form>
  );
}

function NoteEntry({ note }: { note: VendorNoteView }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <Badge variant="outline" className="mr-1.5 text-xs">
            {NOTE_TYPE_LABELS[note.noteType] ?? note.noteType}
          </Badge>
          {note.authorEmail ?? 'System'}
        </span>
        <span>{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm">{note.content}</p>
    </div>
  );
}

function AddNoteForm({ vendorId }: { vendorId: string }) {
  const [content, setContent] = useState('');
  const { mutate, isPending } = useAddVendorNote(vendorId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!content.trim()) return;
        mutate({ content }, { onSuccess: () => setContent('') });
      }}
      className="space-y-2"
    >
      <Textarea
        rows={3} placeholder="Add a note…" value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
          {isPending ? 'Saving…' : 'Add note'}
        </Button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VendorWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showAddContact, setShowAddContact] = useState(false);

  const { data: ws, isLoading, isError } = useVendorWorkspace(id);
  const { data: activity = [], isLoading: activityLoading } = useEntityActivity('vendor', id, 30);
  const { mutate: transition, isPending: isTransitioning } = useTransitionVendorStatus(id);
  const { mutate: removeContact } = useRemoveVendorContact(id);
  const { mutate: deleteVendor, isPending: isDeleting } = useDeleteVendor();

  if (isLoading) return <PageSkeleton />;
  if (isError || !ws) {
    return (
      <Card>
        <CardContent className="space-y-3 py-16 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">Vendor not found</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/vendors">Back to vendors</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const v          = ws.vendor;
  const metrics    = ws.metrics;
  const health     = ws.health;
  const transitions = STATUS_TRANSITIONS[v.status] ?? [];

  const handleDelete = () => {
    if (!window.confirm(`Delete "${v.companyName}"? This cannot be undone.`)) return;
    deleteVendor(id, { onSuccess: () => router.push('/vendors') });
  };

  // ── Next actions (state-driven) ────────────────────────────────────────────
  const nextActions: NextAction[] = [];

  if (health.hasOverdueReminders) {
    nextActions.push({
      id: 'overdue', icon: Bell, urgent: true,
      label: 'Address overdue reminders',
      hint: `${ws.openReminders.filter((r) => r.dueAt && new Date(r.dueAt) < new Date()).length} overdue`,
    });
  }
  if (health.hasPendingFeedback) {
    nextActions.push({
      id: 'feedback', icon: AlertCircle, urgent: true,
      label: `${metrics.feedbackPendingCount} interview${metrics.feedbackPendingCount > 1 ? 's' : ''} awaiting feedback`,
      hint: 'Recruiters or interviewers need to submit feedback',
      href: `/interviews?status=FEEDBACK_PENDING`,
    });
  }
  if (metrics.stalledSubmissions > 0) {
    nextActions.push({
      id: 'stalled', icon: TrendingUp,
      label: `Review ${metrics.stalledSubmissions} stalled submission${metrics.stalledSubmissions > 1 ? 's' : ''}`,
      hint: 'No activity in 7+ days',
    });
  }
  if (health.isStalled && !health.isInactive) {
    nextActions.push({
      id: 'reengage', icon: RefreshCw,
      label: 'Re-engage vendor',
      hint: metrics.daysSinceLastSubmission !== null
        ? `No submissions in ${metrics.daysSinceLastSubmission} days`
        : 'No submissions on record',
    });
  }
  if (v.status === 'ACTIVE') {
    nextActions.push({
      id: 'submit', icon: Send, primary: nextActions.length === 0,
      label: 'Submit a candidate via this vendor',
      href: `/submissions/new?vendorId=${id}`,
    });
  }
  if (v.status === 'PROSPECT') {
    nextActions.push({
      id: 'activate', icon: Send, primary: true,
      label: 'Activate vendor',
      hint: 'Move from prospect to active partner',
      onClick: () => transition('ACTIVE'),
    });
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow={`Vendor · ${v.type.replace(/_/g, ' ')}`}
        title={v.companyName}
        subtitle={v.vendorCode ? <span className="font-mono text-xs">{v.vendorCode}</span> : undefined}
        breadcrumbs={[
          { title: 'Vendors', href: '/vendors' },
          { title: v.companyName },
        ]}
        badges={
          <>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', STATUS_TONE[v.status])}>
              {v.status}
            </span>
            {v.priority !== 'NORMAL' && (
              <Badge variant="outline" className="text-xs">{v.priority}</Badge>
            )}
            {health.isStalled && (
              <StaleIndicator
                lastActivityAt={metrics.lastSubmissionAt}
                thresholdDays={30}
                label={metrics.daysSinceLastSubmission !== null
                  ? `Stalled ${metrics.daysSinceLastSubmission}d`
                  : 'No submissions'}
              />
            )}
            {health.isInactive && !health.isStalled && (
              <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                Inactive
              </span>
            )}
            {health.hasPendingFeedback && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                <AlertCircle className="h-3 w-3" />
                {metrics.feedbackPendingCount} feedback pending
              </span>
            )}
            {health.hasOverdueReminders && (
              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                <Bell className="h-3 w-3" />
                Overdue
              </span>
            )}
          </>
        }
        actions={
          <>
            {v.status === 'ACTIVE' && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/submissions/new?vendorId=${id}`}>
                  <Send className="mr-1 h-4 w-4" /> Submit candidate
                </Link>
              </Button>
            )}
            {transitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={isTransitioning}>
                    Change status <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>Move to</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {transitions.map(({ label, target }) => (
                    <DropdownMenuItem key={target} onClick={() => transition(target)}>
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={`/vendors/${id}/edit`}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Link>
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={handleDelete} disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </>
        }
        facts={
          <>
            <WorkspaceFact label="Placements (all time)">
              <span className="tabular-nums">{metrics.placements.allTime}</span>
              {metrics.placements.thisMonth > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">+{metrics.placements.thisMonth} this month</span>
              )}
            </WorkspaceFact>
            <WorkspaceFact label="Total submissions">
              <span className="tabular-nums">{metrics.totalSubmissions}</span>
            </WorkspaceFact>
            <WorkspaceFact label="Last submission">
              {metrics.daysSinceLastSubmission !== null
                ? `${metrics.daysSinceLastSubmission}d ago`
                : '—'}
            </WorkspaceFact>
            <WorkspaceFact label="Vendor since">
              {v.activatedAt ? new Date(v.activatedAt).toLocaleDateString() : '—'}
            </WorkspaceFact>
          </>
        }
      />

      <WorkspaceShell
        rail={
          <>
            <NextActionsPanel
              actions={nextActions}
              emptyMessage={v.status === 'ACTIVE' ? 'No immediate actions.' : 'Activate the vendor to start submitting candidates.'}
            />

            {/* Quick stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <MetricTile
                  label="Active submissions"
                  value={metrics.activeSubmissions}
                  icon={Send}
                  tone={metrics.activeSubmissions > 0 ? 'info' : 'default'}
                  href={`/submissions?vendorId=${id}`}
                />
                <MetricTile
                  label="Active interviews"
                  value={metrics.activeInterviews}
                  icon={Calendar}
                  tone={metrics.activeInterviews > 0 ? 'info' : 'default'}
                />
                <MetricTile
                  label="Feedback pending"
                  value={metrics.feedbackPendingCount}
                  icon={AlertCircle}
                  tone={metrics.feedbackPendingCount > 0 ? 'warning' : 'default'}
                />
                <MetricTile
                  label="Open reminders"
                  value={metrics.openReminders}
                  icon={Bell}
                  tone={health.hasOverdueReminders ? 'danger' : 'default'}
                />
              </CardContent>
            </Card>

            {/* Contacts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  Contacts
                  <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{v.contacts.length}</span>
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowAddContact((s) => !s)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {showAddContact && <AddContactForm vendorId={id} onDone={() => setShowAddContact(false)} />}
                {v.contacts.length === 0 && !showAddContact ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">No contacts yet.</p>
                ) : (
                  v.contacts.map((c) => (
                    <ContactCard
                      key={c.id}
                      contact={c}
                      onRemove={(cid) => {
                        if (window.confirm(`Remove ${c.fullName}?`)) removeContact(cid);
                      }}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top recruiters */}
            {ws.topRecruiters.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    Active recruiters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {ws.topRecruiters.map((r) => (
                    <div key={r.userId} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{r.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{r.email}</p>
                      </div>
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                        {r.activeCount}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm">Activity</CardTitle>
                <span className="text-xs text-muted-foreground">{activity.length}</span>
              </CardHeader>
              <CardContent>
                <ActivityTimeline
                  entries={activity}
                  loading={activityLoading}
                  emptyMessage="No vendor-scoped activity yet."
                />
              </CardContent>
            </Card>

            {/* Meta */}
            <Card>
              <CardContent className="space-y-1 pt-4 text-xs text-muted-foreground">
                {v.activatedAt && (
                  <div className="flex justify-between"><span>Activated</span><span>{new Date(v.activatedAt).toLocaleDateString()}</span></div>
                )}
                {v.lastContactedAt && (
                  <div className="flex justify-between"><span>Last contacted</span><span>{new Date(v.lastContactedAt).toLocaleDateString()}</span></div>
                )}
                <div className="flex justify-between"><span>Created</span><span>{new Date(v.createdAt).toLocaleDateString()}</span></div>
              </CardContent>
            </Card>
          </>
        }
      >
        {/* Overview */}
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {v.website && (
                <a
                  href={v.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{v.website}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
              {v.location && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{v.location}</span>
                </div>
              )}
              {v.primaryContactEmail && (
                <a
                  href={`mailto:${v.primaryContactEmail}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{v.primaryContactEmail}</span>
                </a>
              )}
              {v.primaryContactPhone && (
                <a
                  href={`tel:${v.primaryContactPhone}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{v.primaryContactPhone}</span>
                </a>
              )}
            </div>

            {v.domains.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {v.domains.map((d) => (
                  <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                ))}
              </div>
            )}

            {v.description && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{v.description}</p>
            )}

            {(v.commissionRate !== null || v.paymentTermsDays !== null) && (
              <div className="flex flex-wrap gap-4 border-t pt-3 text-xs text-muted-foreground">
                {v.commissionRate !== null && <span>Commission: {v.commissionRate}%</span>}
                {v.paymentTermsDays !== null && <span>Payment terms: Net {v.paymentTermsDays}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        <PipelineFunnel counts={ws.pipeline} />

        {/* Active submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Send className="h-4 w-4" />
              Active submissions
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{ws.activeSubmissions.length}</span>
              {metrics.stalledSubmissions > 0 && (
                <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-700">
                  {metrics.stalledSubmissions} stalled
                </span>
              )}
            </CardTitle>
            {v.status === 'ACTIVE' && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/submissions/new?vendorId=${id}`}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Submit
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {ws.activeSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {v.status === 'ACTIVE'
                  ? 'No active submissions. Submit a candidate via this vendor.'
                  : 'No active submissions.'}
              </p>
            ) : (
              <>
                {ws.activeSubmissions.slice(0, 12).map((s) => (
                  <RelatedEntityCard
                    key={s.id}
                    eyebrow={s.job.reqId}
                    icon={Briefcase}
                    title={`${s.candidate.firstName} ${s.candidate.lastName}`}
                    subtitle={`${s.job.title} · ${s.owner.firstName} ${s.owner.lastName}`}
                    status={s.status}
                    statusTone={SUBMISSION_TONE[s.status]}
                    href={`/submissions/${s.id}`}
                    meta={
                      <span className={cn(
                        'text-xs',
                        s.daysStalled >= 7 ? 'text-amber-700' : 'text-muted-foreground',
                      )}>
                        {s.daysStalled >= 7
                          ? `Stalled ${s.daysStalled}d`
                          : formatDistanceToNow(new Date(s.updatedAt), { addSuffix: true })}
                      </span>
                    }
                  />
                ))}
                {metrics.activeSubmissions > 12 && (
                  <Link
                    href={`/submissions?vendorId=${id}`}
                    className="block text-center text-xs text-primary hover:underline"
                  >
                    View all {metrics.activeSubmissions} active submissions →
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Upcoming interviews */}
        {ws.upcomingInterviews.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Upcoming interviews
                <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{ws.upcomingInterviews.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ws.upcomingInterviews.map((iv) => (
                <RelatedEntityCard
                  key={iv.id}
                  eyebrow={`Round ${iv.round}`}
                  icon={Calendar}
                  title={`${iv.candidate.firstName} ${iv.candidate.lastName}`}
                  subtitle={`${iv.job.reqId} · ${iv.job.title}`}
                  status={iv.status}
                  statusTone={INTERVIEW_TONE[iv.status]}
                  href={`/interviews/${iv.id}`}
                  meta={
                    iv.scheduledAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(iv.scheduledAt), { addSuffix: true })}
                      </span>
                    )
                  }
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Open reminders */}
        {ws.openReminders.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bell className="h-4 w-4" />
                Open reminders
                <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{ws.openReminders.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ws.openReminders.map((r) => (
                <RelatedEntityCard
                  key={r.id}
                  eyebrow={r.priority}
                  icon={Bell}
                  title={r.title}
                  subtitle={r.description ?? undefined}
                  status={r.status}
                  statusTone={REMINDER_TONE[r.status]}
                  href={
                    r.submissionId ? `/submissions/${r.submissionId}` :
                    r.interviewId  ? `/interviews/${r.interviewId}` :
                    `/reminders`
                  }
                  meta={<OverdueIndicator dueAt={r.dueAt} />}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              Notes
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{v.notes.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddNoteForm vendorId={id} />
            {v.notes.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="space-y-4 divide-y">
                {v.notes.map((n) => (
                  <div key={n.id} className="pt-4 first:pt-0">
                    <NoteEntry note={n} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </WorkspaceShell>
    </div>
  );
}
