'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCandidate } from '@/hooks/use-candidates';
import type { PotentialDuplicate } from '@/types/candidates';
import { getApiErrorMessage } from '@/lib/api';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  currentTitle: z.string().optional(),
  currentCompany: z.string().optional(),
  linkedinUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  city: z.string().optional(),
  country: z.string().optional(),
  summary: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewCandidatePage() {
  const router = useRouter();
  const [duplicates, setDuplicates] = useState<PotentialDuplicate[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateCandidate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setDuplicates([]);
    try {
      const result = await createMutation.mutateAsync({
        ...data,
        linkedinUrl: data.linkedinUrl || undefined,
      });
      if (result.potentialDuplicates.length > 0) {
        setDuplicates(result.potentialDuplicates);
        // Navigation is handled by useCreateCandidate's onSuccess
      }
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Add candidate"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Candidates', href: '/candidates' },
          { title: 'New' },
        ]}
      />

      {duplicates.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Potential duplicates found
          </div>
          <p className="text-xs text-yellow-700">
            The following candidates may already exist. The new candidate was still created.
          </p>
          <ul className="space-y-1">
            {duplicates.map((d) => (
              <li key={d.id} className="text-xs text-yellow-800">
                <a href={`/candidates/${d.id}`} className="underline hover:no-underline">
                  {d.fullName}
                </a>{' '}
                — {d.email}
                {d.currentTitle && ` · ${d.currentTitle}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name *</Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name *</Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register('phone')} />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Professional details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="currentTitle">Current title</Label>
                <Input id="currentTitle" {...register('currentTitle')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currentCompany">Current company</Label>
                <Input id="currentCompany" {...register('currentCompany')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input id="linkedinUrl" type="url" placeholder="https://linkedin.com/in/..." {...register('linkedinUrl')} />
              {errors.linkedinUrl && (
                <p className="text-xs text-destructive">{errors.linkedinUrl.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" {...register('country')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="summary">Summary</Label>
              <textarea
                id="summary"
                {...register('summary')}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Brief professional summary..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            {(isSubmitting || createMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create candidate
          </Button>
        </div>
      </form>
    </div>
  );
}
