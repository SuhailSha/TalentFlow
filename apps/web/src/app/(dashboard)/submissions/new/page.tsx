'use client';

import { useState, useCallback } from 'react';
import { Loader2, Search } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSubmission } from '@/hooks/use-submissions';
import { useCandidates } from '@/hooks/use-candidates';
import { useJobs } from '@/hooks/use-jobs';
import { useVendors } from '@/hooks/use-vendors';
import { useDebounce } from '@/hooks/use-debounce';
import type { CreateSubmissionDto } from '@/types/submissions';

export default function NewSubmissionPage() {
  const createSubmission = useCreateSubmission();

  // Search state
  const [candidateSearch, setCandidateSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');

  const debouncedCandidateSearch = useDebounce(candidateSearch, 300);
  const debouncedJobSearch = useDebounce(jobSearch, 300);
  const debouncedVendorSearch = useDebounce(vendorSearch, 300);

  // Selected IDs
  const [candidateId, setCandidateId] = useState('');
  const [jobId, setJobId] = useState('');
  const [vendorId, setVendorId] = useState('');

  // Rate / metadata fields
  const [billRate, setBillRate] = useState('');
  const [payRate, setPayRate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [startDate, setStartDate] = useState('');
  const [coverNote, setCoverNote] = useState('');

  const [error, setError] = useState('');

  // Queries — only fetch when search is non-empty
  const { data: candidatesData } = useCandidates({
    search: debouncedCandidateSearch || undefined,
    limit: 10,
    page: 1,
  });
  const { data: jobsData } = useJobs({
    search: debouncedJobSearch || undefined,
    limit: 10,
    page: 1,
  });
  const { data: vendorsData } = useVendors({
    search: debouncedVendorSearch || undefined,
    limit: 10,
    page: 1,
  });

  const selectedCandidate = candidatesData?.data.find((c) => c.id === candidateId);
  const selectedJob = jobsData?.data.find((j) => j.id === jobId);
  const selectedVendor = vendorsData?.data.find((v) => v.id === vendorId);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!candidateId) { setError('Please select a candidate.'); return; }
      if (!jobId) { setError('Please select a job.'); return; }

      const dto: CreateSubmissionDto = {
        candidateId,
        jobId,
        ...(vendorId && { vendorId }),
        ...(billRate && { billRate: parseFloat(billRate) }),
        ...(payRate && { payRate: parseFloat(payRate) }),
        currency: currency || 'USD',
        ...(startDate && { startDate }),
        ...(coverNote && { coverNote }),
      };

      createSubmission.mutate(dto);
    },
    [candidateId, jobId, vendorId, billRate, payRate, currency, startDate, coverNote, createSubmission],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Submission"
        description="Submit a candidate for a job opening"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Submissions', href: '/submissions' },
          { title: 'New' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Candidate selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Candidate *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedCandidate ? (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium text-sm">
                    {selectedCandidate.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedCandidate.email}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCandidateId('')}
                >
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search candidates…"
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {candidatesData?.data && candidatesData.data.length > 0 && (
                  <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {candidatesData.data.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                          onClick={() => { setCandidateId(c.id); setCandidateSearch(''); }}
                        >
                          <p className="text-sm font-medium">{c.fullName}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Job selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Job *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedJob ? (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium text-sm">{selectedJob.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedJob.reqId}
                    {selectedJob.department ? ` — ${selectedJob.department}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setJobId('')}
                >
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs…"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {jobsData?.data && jobsData.data.length > 0 && (
                  <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {jobsData.data.map((j) => (
                      <li key={j.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                          onClick={() => { setJobId(j.id); setJobSearch(''); }}
                        >
                          <p className="text-sm font-medium">{j.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {j.reqId}
                            {j.department ? ` — ${j.department}` : ''}
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

        {/* Vendor (optional) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Vendor (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedVendor ? (
              <div className="flex items-center justify-between rounded-md border p-3">
                <p className="font-medium text-sm">{selectedVendor.companyName}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVendorId('')}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors…"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {vendorsData?.data && vendorsData.data.length > 0 && (
                  <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {vendorsData.data.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                          onClick={() => { setVendorId(v.id); setVendorSearch(''); }}
                        >
                          <p className="text-sm font-medium">{v.companyName}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Rate + metadata */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Rate &amp; timeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="billRate">Bill rate (client)</Label>
              <Input
                id="billRate"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 95.00"
                value={billRate}
                onChange={(e) => setBillRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payRate">Pay rate (candidate)</Label>
              <Input
                id="payRate"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 75.00"
                value={payRate}
                onChange={(e) => setPayRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="USD"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="coverNote">Cover note</Label>
              <textarea
                id="coverNote"
                placeholder="Brief intro or notes to send with the submission…"
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={createSubmission.isPending}
          className="w-full sm:w-auto"
        >
          {createSubmission.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create submission
        </Button>
      </form>
    </div>
  );
}
