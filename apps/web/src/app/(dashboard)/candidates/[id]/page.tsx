'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, MapPin, Briefcase, Mail, Phone, ExternalLink, Trash2, X } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCandidate, useCandidateNotes, useDeleteCandidate, useAddNote, useRemoveSkill } from '@/hooks/use-candidates';
import type { CandidateStatus, AvailabilityStatus, NoteType } from '@/types/candidates';
import { useAuthContext } from '@/providers/auth-provider';

const STATUS_COLORS: Record<CandidateStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
  AVAILABLE: 'bg-teal-100 text-teal-800',
  PLACED: 'bg-blue-100 text-blue-800',
  BLACKLISTED: 'bg-red-100 text-red-800',
};

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  IMMEDIATELY: 'Available now',
  TWO_WEEKS: '2 weeks notice',
  ONE_MONTH: '1 month notice',
  THREE_MONTHS: '3 months notice',
  NOT_LOOKING: 'Not looking',
};

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  NOTE: 'Note',
  CALL: 'Call',
  EMAIL: 'Email',
  MEETING: 'Meeting',
  STATUS_CHANGE: 'Status change',
  SYSTEM: 'System',
};

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

export default function CandidateDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { hasPermission } = useAuthContext();

  const { data: candidate, isLoading, isError } = useCandidate(id);
  const { data: notes } = useCandidateNotes(id);
  const deleteMutation = useDeleteCandidate();
  const addNoteMutation = useAddNote(id);
  const removeSkillMutation = useRemoveSkill(id);

  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('NOTE');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canUpdate = hasPermission('candidates:update');
  const canDelete = hasPermission('candidates:delete');

  if (isLoading) return <DetailSkeleton />;

  if (isError || !candidate) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Candidate not found.</p>
      </div>
    );
  }

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    await addNoteMutation.mutateAsync({ content: noteContent.trim(), noteType });
    setNoteContent('');
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={candidate.fullName}
        description={[candidate.currentTitle, candidate.currentCompany].filter(Boolean).join(' at ')}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Candidates', href: '/candidates' },
          { title: candidate.fullName },
        ]}
        actions={
          canDelete ? (
            showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Are you sure?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Delete
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            )
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left / main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status + availability */}
          <Card>
            <CardContent className="pt-4 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[candidate.status]}`}
              >
                {candidate.status}
              </span>
              <Badge variant="secondary" className="text-xs">
                {AVAILABILITY_LABELS[candidate.availabilityStatus]}
              </Badge>
              {candidate.isRemote && (
                <Badge variant="outline" className="text-xs">Remote</Badge>
              )}
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
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
              {candidate.location && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {candidate.location}
                </span>
              )}
              {candidate.currentTitle && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  {[candidate.currentTitle, candidate.currentCompany].filter(Boolean).join(' at ')}
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

          {/* Summary */}
          {candidate.summary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{candidate.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpdate && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value as NoteType)}
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map((t) => (
                        <option key={t} value={t}>{NOTE_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    placeholder="Add a note..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
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
                {(notes ?? candidate.notes).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No notes yet.</p>
                ) : (
                  (notes ?? candidate.notes).map((note) => (
                    <div key={note.id} className="rounded-md bg-muted/40 p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {NOTE_TYPE_LABELS[note.noteType]} · {note.authorName}
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

        {/* Right / sidebar column */}
        <div className="space-y-4">
          {/* Experience */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Experience</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {candidate.experienceYears !== null ? (
                <p>{candidate.experienceYears} years</p>
              ) : (
                <p className="text-muted-foreground">Unknown</p>
              )}
              {candidate.careerStartDate && (
                <p className="text-xs text-muted-foreground">
                  Since {new Date(candidate.careerStartDate).getFullYear()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.allSkills.length === 0 ? (
                <p className="text-xs text-muted-foreground">No skills added.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {candidate.allSkills.map((cs) => (
                    <div key={cs.id} className="group flex items-center gap-1">
                      <Badge variant={cs.isPrimary ? 'default' : 'secondary'} className="text-xs">
                        {cs.skill.displayName}
                      </Badge>
                      {canUpdate && (
                        <button
                          onClick={() => removeSkillMutation.mutate(cs.skill.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
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

          {/* Salary */}
          {(candidate.salaryExpectationMin || candidate.salaryExpectationMax) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Salary expectation</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>
                  {candidate.salaryCurrency ?? 'USD'}{' '}
                  {candidate.salaryExpectationMin?.toLocaleString() ?? '–'}
                  {candidate.salaryExpectationMax && ` – ${candidate.salaryExpectationMax.toLocaleString()}`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>Source: {candidate.source}</p>
              {candidate.sourceDetail && <p>{candidate.sourceDetail}</p>}
              <p>Added: {new Date(candidate.createdAt).toLocaleDateString()}</p>
              {candidate.lastActivityAt && (
                <p>Last activity: {new Date(candidate.lastActivityAt).toLocaleDateString()}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
