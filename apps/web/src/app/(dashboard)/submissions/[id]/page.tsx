'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, Briefcase, User, Building2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSubmission,
  useChangeSubmissionStatus,
  useAddSubmissionNote,
  useDeleteSubmission,
} from '@/hooks/use-submissions';
import type { SubmissionStatus } from '@/types/submissions';

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  DRAFT:        'bg-gray-100 text-gray-700',
  SUBMITTED:    'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  SHORTLISTED:  'bg-purple-100 text-purple-800',
  INTERVIEW:    'bg-indigo-100 text-indigo-800',
  OFFERED:      'bg-orange-100 text-orange-800',
  PLACED:       'bg-green-100 text-green-800',
  REJECTED:     'bg-red-100 text-red-800',
  WITHDRAWN:    'bg-gray-100 text-gray-500',
  ON_HOLD:      'bg-amber-100 text-amber-800',
  CLOSED:       'bg-slate-100 text-slate-600',
};

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  DRAFT:        'Draft',
  SUBMITTED:    'Submitted',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED:  'Shortlisted',
  INTERVIEW:    'Interview',
  OFFERED:      'Offered',
  PLACED:       'Placed',
  REJECTED:     'Rejected',
  WITHDRAWN:    'Withdrawn',
  ON_HOLD:      'On Hold',
  CLOSED:       'Closed',
};

// FSM allowed transitions (mirrors backend SUBMISSION_FSM)
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

function SkeletonDetail() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: submission, isLoading, isError } = useSubmission(id);
  const changeStatus = useChangeSubmissionStatus(id);
  const addNote = useAddSubmissionNote(id);
  const deleteSubmission = useDeleteSubmission();

  const [noteText, setNoteText] = useState('');
  const [newStatus, setNewStatus] = useState<SubmissionStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');

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
  const allowedTransitions = TRANSITIONS[submission.status] ?? [];

  function handleStatusChange() {
    if (!newStatus) return;
    changeStatus.mutate(
      { status: newStatus, reason: statusReason || undefined },
      {
        onSuccess: () => {
          setNewStatus('');
          setStatusReason('');
        },
      },
    );
  }

  function handleAddNote() {
    if (!noteText.trim()) return;
    addNote.mutate(
      { content: noteText.trim() },
      { onSuccess: () => setNoteText('') },
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/submissions" className="hover:text-foreground">Submissions</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">
          {c.firstName} {c.lastName} — {j.reqId}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold">
              {c.firstName} {c.lastName}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[submission.status]}`}
            >
              {STATUS_LABELS[submission.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {j.reqId} · {j.title}
            {j.department ? ` — ${j.department}` : ''}
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => deleteSubmission.mutate(id)}
          disabled={deleteSubmission.isPending}
        >
          Archive
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left column: candidate + job + rates */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Candidate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">
                <Link href={`/candidates/${c.id}`} className="hover:underline">
                  {c.firstName} {c.lastName}
                </Link>
              </p>
              <p className="text-muted-foreground">{c.email}</p>
              {c.currentTitle && <p className="text-muted-foreground">{c.currentTitle}</p>}
              {c.location && <p className="text-muted-foreground">{c.location}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">
                <Link href={`/jobs/${j.id}`} className="hover:underline">
                  {j.title}
                </Link>
              </p>
              <p className="text-muted-foreground">{j.reqId}</p>
              {j.department && <p className="text-muted-foreground">{j.department}</p>}
            </CardContent>
          </Card>

          {submission.vendor && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Vendor
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <Link href={`/vendors/${submission.vendor.id}`} className="hover:underline font-medium">
                  {submission.vendor.companyName}
                </Link>
              </CardContent>
            </Card>
          )}

          {(submission.billRate !== null || submission.payRate !== null) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Rates</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {submission.billRate !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bill rate</span>
                    <span>{submission.currency} {submission.billRate}/hr</span>
                  </div>
                )}
                {submission.payRate !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pay rate</span>
                    <span>{submission.currency} {submission.payRate}/hr</span>
                  </div>
                )}
                {submission.offerSalary !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Offer salary</span>
                    <span>{submission.currency} {submission.offerSalary?.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {submission.coverNote && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Cover note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{submission.coverNote}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: status transition + notes + history */}
        <div className="space-y-4">
          {allowedTransitions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Advance pipeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as SubmissionStatus | '')}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select next status</option>
                  {allowedTransitions.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <textarea
                  placeholder="Reason (optional)"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  size="sm"
                  onClick={handleStatusChange}
                  disabled={!newStatus || changeStatus.isPending}
                >
                  {changeStatus.isPending ? 'Saving…' : 'Update status'}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Add note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                placeholder="Write a note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!noteText.trim() || addNote.isPending}
              >
                {addNote.isPending ? 'Saving…' : 'Add note'}
              </Button>
            </CardContent>
          </Card>

          {submission.notes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {submission.notes.map((n) => (
                  <div key={n.id} className="border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{n.authorName ?? n.authorEmail}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{n.content}</p>
                    {n.isSystem && (
                      <Badge variant="outline" className="text-xs mt-1">system</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {submission.statusHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Status history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {submission.statusHistory.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {new Date(h.createdAt).toLocaleDateString()}
                    </span>
                    {h.fromStatus && (
                      <>
                        <span
                          className={`inline-flex rounded-full px-1.5 py-0.5 font-medium ${STATUS_COLORS[h.fromStatus]}`}
                        >
                          {STATUS_LABELS[h.fromStatus]}
                        </span>
                        <span className="text-muted-foreground">→</span>
                      </>
                    )}
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0.5 font-medium ${STATUS_COLORS[h.toStatus]}`}
                    >
                      {STATUS_LABELS[h.toStatus]}
                    </span>
                    <span className="text-muted-foreground ml-auto">{h.changedByName}</span>
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
