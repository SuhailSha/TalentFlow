'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Edit, Loader2, MapPin, X } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useJob, useJobNotes, useAddJobNote, useRemoveJobSkill, useTransitionJobStatus } from '@/hooks/use-jobs';
import { useAuthContext } from '@/providers/auth-provider';
import type { JobStatus } from '@/types/jobs';

// Reuse NoteType from candidates (same enum)
type NoteType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'STATUS_CHANGE' | 'SYSTEM';

const STATUS_COLORS: Record<JobStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-700',
  OPEN:      'bg-green-100 text-green-800',
  ON_HOLD:   'bg-yellow-100 text-yellow-800',
  FILLED:    'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-700',
  ARCHIVED:  'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT:     ['OPEN'],
  OPEN:      ['ON_HOLD', 'FILLED', 'CANCELLED'],
  ON_HOLD:   ['OPEN', 'CANCELLED'],
  FILLED:    ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED:  [],
};

const STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: 'Draft', OPEN: 'Open', ON_HOLD: 'On Hold',
  FILLED: 'Filled', CANCELLED: 'Cancelled', ARCHIVED: 'Archived',
};

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  NOTE: 'Note', CALL: 'Call', EMAIL: 'Email', MEETING: 'Meeting',
  STATUS_CHANGE: 'Status change', SYSTEM: 'System',
};

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { hasPermission } = useAuthContext();

  const { data: job, isLoading, isError } = useJob(id);
  const { data: notes } = useJobNotes(id);
  const addNoteMutation = useAddJobNote(id);
  const removeSkillMutation = useRemoveJobSkill(id);
  const transitionMutation = useTransitionJobStatus(id);

  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('NOTE');

  const canUpdate = hasPermission('jobs:update');

  if (isLoading) return <DetailSkeleton />;
  if (isError || !job) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Job not found.</p>
      </div>
    );
  }

  const allowedTransitions = ALLOWED_TRANSITIONS[job.status];
  const location = [job.city, job.stateProvince, job.country].filter(Boolean).join(', ');
  const salary = job.salaryMin || job.salaryMax
    ? `${job.salaryCurrency ?? 'USD'} ${job.salaryMin?.toLocaleString() ?? '–'} – ${job.salaryMax?.toLocaleString() ?? '∞'} ${job.salaryType === 'HOURLY' ? '/hr' : '/yr'}`
    : null;

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    await addNoteMutation.mutateAsync({ content: noteContent.trim(), noteType });
    setNoteContent('');
  };

  const requiredSkills = job.allSkills.filter((s) => s.isRequired);
  const niceToHaveSkills = job.allSkills.filter((s) => !s.isRequired);

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.title}
        description={`${job.reqId} · ${job.department ?? 'No department'}`}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Jobs', href: '/jobs' },
          { title: job.title },
        ]}
        actions={
          canUpdate ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/jobs/${id}/edit`}>
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status bar + transitions */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                  {STATUS_LABELS[job.status]}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[job.hiringPriority]}`}>
                  {job.hiringPriority}
                </span>
                <Badge variant="outline" className="text-xs">{job.workMode}</Badge>
                <Badge variant="outline" className="text-xs">{job.employmentType.replace('_', ' ')}</Badge>
              </div>

              {canUpdate && allowedTransitions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground self-center">Transition to:</span>
                  {allowedTransitions.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={transitionMutation.isPending}
                      onClick={() => transitionMutation.mutate(s)}
                    >
                      {transitionMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description / Requirements */}
          {(job.description || job.requirements) && (
            <Card>
              <CardContent className="pt-4 space-y-4">
                {job.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                    <p className="text-sm whitespace-pre-wrap">{job.description}</p>
                  </div>
                )}
                {job.requirements && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Requirements</h3>
                    <p className="text-sm whitespace-pre-wrap">{job.requirements}</p>
                  </div>
                )}
                {job.niceToHave && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Nice to have</h3>
                    <p className="text-sm whitespace-pre-wrap">{job.niceToHave}</p>
                  </div>
                )}
                {job.benefits && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Benefits</h3>
                    <p className="text-sm whitespace-pre-wrap">{job.benefits}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    placeholder="Add a note..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!noteContent.trim() || addNoteMutation.isPending}
                  >
                    {addNoteMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Add note
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {(notes ?? job.notes).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                ) : (
                  (notes ?? job.notes).map((note) => (
                    <div key={note.id} className="rounded-md bg-muted/40 p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {NOTE_TYPE_LABELS[note.noteType as NoteType]} · {note.authorName ?? note.authorEmail}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          {/* Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {location && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{location}</span>
                </div>
              )}
              {(job.experienceMin !== null || job.experienceMax !== null) && (
                <p className="text-muted-foreground">
                  {job.experienceMin ?? 0}–{job.experienceMax ?? '∞'} years experience
                </p>
              )}
              {salary && <p className="text-muted-foreground">{salary}</p>}
              {job.hiringManagerName && (
                <p className="text-muted-foreground">Hiring manager: {job.hiringManagerName}</p>
              )}
              <p className="text-muted-foreground">
                {job.filledPositions}/{job.openPositions} positions filled
              </p>
              {job.targetHireDate && (
                <p className="text-muted-foreground">
                  Target: {new Date(job.targetHireDate).toLocaleDateString()}
                </p>
              )}
              {job.openedAt && (
                <p className="text-muted-foreground">
                  Opened: {new Date(job.openedAt).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Required skills */}
          {requiredSkills.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Required skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {requiredSkills.map((js) => (
                    <div key={js.id} className="group flex items-center gap-1">
                      <Badge variant="default" className="text-xs">
                        {js.skill.displayName}
                        {js.minimumYears ? ` ${js.minimumYears}y+` : ''}
                      </Badge>
                      {canUpdate && (
                        <button
                          onClick={() => removeSkillMutation.mutate(js.skill.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nice-to-have skills */}
          {niceToHaveSkills.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Nice to have</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {niceToHaveSkills.map((js) => (
                    <div key={js.id} className="group flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {js.skill.displayName}
                      </Badge>
                      {canUpdate && (
                        <button
                          onClick={() => removeSkillMutation.mutate(js.skill.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>Created: {new Date(job.createdAt).toLocaleDateString()}</p>
              <p>Updated: {new Date(job.updatedAt).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
