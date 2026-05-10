'use client';

import { useState, useCallback } from 'react';
import { Loader2, Search } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useScheduleInterview } from '@/hooks/use-interviews';
import { useSubmissions } from '@/hooks/use-submissions';
import { useDebounce } from '@/hooks/use-debounce';
import type { InterviewType, ScheduleInterviewDto } from '@/types/interviews';
import { INTERVIEW_TYPE_LABELS } from '@/types/interviews';

const INTERVIEW_TYPES = Object.entries(INTERVIEW_TYPE_LABELS) as [InterviewType, string][];

export default function NewInterviewPage() {
  const scheduleInterview = useScheduleInterview();

  const [submissionSearch, setSubmissionSearch] = useState('');
  const debouncedSearch = useDebounce(submissionSearch, 300);

  const [submissionId, setSubmissionId] = useState('');
  const [round, setRound] = useState('1');
  const [roundLabel, setRoundLabel] = useState('');
  const [type, setType] = useState<InterviewType>('PHONE');
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [location, setLocation] = useState('');
  const [briefingNotes, setBriefingNotes] = useState('');
  const [error, setError] = useState('');

  const { data: submissionsData } = useSubmissions({
    page: 1,
    limit: 10,
  });

  const selectedSubmission = submissionsData?.data.find((s) => s.id === submissionId);

  const filteredSubmissions = debouncedSearch
    ? (submissionsData?.data ?? []).filter((s) => {
        const q = debouncedSearch.toLowerCase();
        return (
          s.candidate.firstName.toLowerCase().includes(q) ||
          s.candidate.lastName.toLowerCase().includes(q) ||
          s.candidate.email.toLowerCase().includes(q) ||
          s.job.title.toLowerCase().includes(q) ||
          s.job.reqId.toLowerCase().includes(q)
        );
      })
    : (submissionsData?.data ?? []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!submissionId) {
        setError('Please select a submission.');
        return;
      }
      if (!round || parseInt(round, 10) < 1) {
        setError('Round must be at least 1.');
        return;
      }

      const dto: ScheduleInterviewDto = {
        submissionId,
        round: parseInt(round, 10),
        type,
        ...(roundLabel && { roundLabel }),
        ...(interviewerName && { interviewerName }),
        ...(interviewerEmail && { interviewerEmail }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt).toISOString() }),
        ...(durationMinutes && { durationMinutes: parseInt(durationMinutes, 10) }),
        ...(timezone && { timezone }),
        ...(location && { location }),
        ...(briefingNotes && { briefingNotes }),
      };

      scheduleInterview.mutate(dto);
    },
    [
      submissionId, round, type, roundLabel, interviewerName, interviewerEmail,
      scheduledAt, durationMinutes, timezone, location, briefingNotes, scheduleInterview,
    ],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule Interview"
        description="Schedule a new interview round for a candidate"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Interviews', href: '/interviews' },
          { title: 'Schedule' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Submission selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Submission *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedSubmission ? (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium text-sm">
                    {selectedSubmission.candidate.firstName}{' '}
                    {selectedSubmission.candidate.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSubmission.job.reqId} · {selectedSubmission.job.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {selectedSubmission.status}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSubmissionId('')}
                >
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search candidate or job…"
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {filteredSubmissions.length > 0 && (
                  <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {filteredSubmissions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSubmissionId(s.id);
                            setSubmissionSearch('');
                          }}
                        >
                          <p className="text-sm font-medium">
                            {s.candidate.firstName} {s.candidate.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {s.job.reqId} · {s.job.title}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Round + type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Round details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="round">Round number *</Label>
              <Input
                id="round"
                type="number"
                min="1"
                max="20"
                value={round}
                onChange={(e) => setRound(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roundLabel">Round label</Label>
              <Input
                id="roundLabel"
                placeholder="e.g. Phone Screen, Technical"
                value={roundLabel}
                onChange={(e) => setRoundLabel(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="type">Interview type *</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as InterviewType)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {INTERVIEW_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Interviewer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Interviewer (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="interviewerName">Name</Label>
              <Input
                id="interviewerName"
                placeholder="Interviewer name"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="interviewerEmail">Email</Label>
              <Input
                id="interviewerEmail"
                type="email"
                placeholder="interviewer@company.com"
                value={interviewerEmail}
                onChange={(e) => setInterviewerEmail(e.target.value)}
                maxLength={200}
              />
            </div>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Scheduling</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="scheduledAt">Date &amp; time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durationMinutes">Duration (minutes)</Label>
              <Input
                id="durationMinutes"
                type="number"
                min="15"
                max="480"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location / link</Label>
              <Input
                id="location"
                placeholder="Room 4B or https://meet.example.com/…"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={500}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="briefingNotes">Briefing notes</Label>
              <textarea
                id="briefingNotes"
                placeholder="Pre-interview notes for the interviewer…"
                value={briefingNotes}
                onChange={(e) => setBriefingNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {scheduleInterview.error && (
          <p className="text-sm text-destructive">
            {(scheduleInterview.error as Error).message}
          </p>
        )}

        <Button
          type="submit"
          disabled={scheduleInterview.isPending}
          className="w-full sm:w-auto"
        >
          {scheduleInterview.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Schedule interview
        </Button>
      </form>
    </div>
  );
}
