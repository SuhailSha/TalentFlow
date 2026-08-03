'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, FileText, Upload } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUploadResume } from '@/hooks';
import { getApiErrorMessage } from '@/lib/api';

const ACCEPT = '.pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf';

function UploadResumeForm() {
  const router = useRouter();
  const search = useSearchParams();
  // ?candidateId=... pre-binds to an existing candidate (e.g. from candidate page).
  const preBoundCandidateId = search.get('candidateId') ?? undefined;

  const [file, setFile]             = useState<File | null>(null);
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [email, setEmail]           = useState('');
  const [label, setLabel]           = useState('');

  const upload = useUploadResume();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const canSubmit =
    !!file &&
    (preBoundCandidateId ||
      (firstName.trim() && lastName.trim() && email.trim().includes('@')));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    try {
      const result = await upload.mutateAsync({
        file,
        candidateId: preBoundCandidateId,
        firstName:   preBoundCandidateId ? undefined : firstName.trim(),
        lastName:    preBoundCandidateId ? undefined : lastName.trim(),
        email:       preBoundCandidateId ? undefined : email.trim().toLowerCase(),
        label:       label.trim() || undefined,
      });
      router.push(`/resumes/${result.resume.id}`);
    } catch {
      /* surfaced via upload.error */
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Upload resume"
        description={preBoundCandidateId
          ? 'Attach a resume to the selected candidate.'
          : 'Upload a resume. A draft candidate is created automatically and reviewed later.'}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Resumes',   href: '/resumes' },
          { title: 'Upload' },
        ]}
      />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* File picker */}
            <div className="space-y-2">
              <Label htmlFor="file">Resume file</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="file"
                  type="file"
                  accept={ACCEPT}
                  onChange={handleFile}
                  className="cursor-pointer"
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">· {(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown'}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Accepted: PDF, DOC, DOCX, TXT, RTF. Max 10 MB.</p>
            </div>

            {/* Candidate fields — only when not pre-bound */}
            {!preBoundCandidateId && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name *</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name *</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <p className="text-xs text-muted-foreground">
                    A draft candidate will be created. Once parsing + review ship (R2-R3), this becomes a full candidate profile.
                  </p>
                </div>
              </div>
            )}

            {preBoundCandidateId && (
              <div className="rounded-md border bg-blue-50 px-3 py-2 text-sm text-blue-900">
                Attaching to candidate <span className="font-mono">{preBoundCandidateId.slice(0, 8)}…</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="label">Label (optional)</Label>
              <Input id="label" placeholder='e.g. "Senior FE focus"' value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>

            {upload.error && (
              <div className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{getApiErrorMessage(upload.error)}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={!canSubmit || upload.isPending}>
                <Upload className="mr-1.5 h-4 w-4" />
                {upload.isPending ? 'Uploading…' : 'Upload resume'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UploadResumePage() {
  return (
    <Suspense fallback={null}>
      <UploadResumeForm />
    </Suspense>
  );
}
