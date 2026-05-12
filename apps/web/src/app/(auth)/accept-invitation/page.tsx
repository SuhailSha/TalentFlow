'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { acceptInvitation, previewInvitation } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/client';
import { AUTH_QUERY_KEY } from '@/hooks/use-auth';

const acceptSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

type AcceptForm = z.infer<typeof acceptSchema>;

export default function AcceptInvitationPage() {
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = params.get('token') ?? '';

  // Server-side preview validates the token before we render the form.
  const preview = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn:  () => previewInvitation(token),
    enabled:  !!token,
    retry:    false,
  });

  const form = useForm<AcceptForm>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { firstName: '', lastName: '', password: '', confirmPassword: '' },
  });

  // Hydrate the form from the preview once it arrives.
  useEffect(() => {
    if (preview.data) {
      form.reset({
        firstName: preview.data.firstName,
        lastName:  preview.data.lastName,
        password:  '',
        confirmPassword: '',
      });
    }
  }, [preview.data, form]);

  const acceptMutation = useMutation({
    mutationFn: (values: AcceptForm) =>
      acceptInvitation({
        token,
        password:  values.password,
        firstName: values.firstName,
        lastName:  values.lastName,
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      toast.success('Welcome!');
      router.push('/dashboard');
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err));
    },
  });

  if (!token) {
    return <InvitationError title="Missing token" message="This link is missing the invitation token." />;
  }

  if (preview.isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <InvitationError
        title="Invitation unavailable"
        message={getApiErrorMessage(preview.error) || 'This invitation cannot be used.'}
      />
    );
  }

  const onSubmit = (values: AcceptForm) => acceptMutation.mutate(values);

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary">
          <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <CardTitle>Join {preview.data.organizationName}</CardTitle>
        <CardDescription>
          {preview.data.inviterName
            ? `${preview.data.inviterName} invited you. `
            : null}
          Set up your account to accept the invitation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={preview.data.email} readOnly className="bg-muted text-muted-foreground" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...form.register('firstName')} />
              {form.formState.errors.firstName && (
                <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...form.register('lastName')} />
              {form.formState.errors.lastName && (
                <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={acceptMutation.isPending}>
            {acceptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept invitation
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            This invitation expires on {new Date(preview.data.expiresAt).toLocaleString()}.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function InvitationError({ title, message }: { title: string; message: string }) {
  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full" variant="outline">
          <a href="/login">Go to sign in</a>
        </Button>
      </CardContent>
    </Card>
  );
}
