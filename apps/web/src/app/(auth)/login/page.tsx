'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { LogoLockup } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

const loginSchema = z.object({
  organizationSlug: z
    .string()
    .min(1, 'Workspace is required')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoggingIn, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { organizationSlug: '', email: '', password: '' },
  });

  const onSubmit = (values: LoginForm) => {
    login({
      email: values.email,
      password: values.password,
      organizationSlug: values.organizationSlug,
    });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Brand panel (hidden on small screens) ──────────────────────── */}
      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200 lg:flex lg:flex-col lg:justify-between lg:p-10 dark:from-brand-950 dark:via-brand-900 dark:to-brand-800"
      >
        <LogoLockup size="lg" subline="Recruitment intelligence for staffing teams" />

        <div className="space-y-8">
          <p className="text-display-xl text-foreground">Hire with momentum.</p>
          <ul className="space-y-3 text-body-md text-foreground/80">
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-600" />
              Pipeline you can see — at every stage, for every recruiter.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-600" />
              Inbox you can clear — overdue items surface, never hide.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-600" />
              Resume intelligence that actually helps — parse, review, dedupe.
            </li>
          </ul>
        </div>

        <p className="text-body-xs text-muted-foreground">© TalentFlow</p>
      </aside>

      {/* ── Form panel ─────────────────────────────────────────────────── */}
      <main className="flex flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          {/* Mobile brand (replaces left panel below lg) */}
          <div className="mb-6 flex justify-center lg:hidden">
            <LogoLockup size="md" />
          </div>

          <Card variant="bordered">
            <CardHeader className="space-y-2">
              <CardTitle className="text-display-xl">Sign in</CardTitle>
              <CardDescription>Welcome back. Enter your workspace to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="organizationSlug">Workspace</Label>
                  <Input
                    id="organizationSlug"
                    type="text"
                    autoComplete="organization"
                    placeholder="acme"
                    aria-describedby={errors.organizationSlug ? 'slug-error' : undefined}
                    aria-invalid={!!errors.organizationSlug}
                    {...register('organizationSlug')}
                  />
                  {errors.organizationSlug && (
                    <p id="slug-error" className="text-body-xs text-destructive" role="alert">
                      {errors.organizationSlug.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    aria-invalid={!!errors.email}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p id="email-error" className="text-body-xs text-destructive" role="alert">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="flex items-center justify-between">
                    <span>Password</span>
                    {/* Forgot link reserved for a later phase; intentionally non-functional. */}
                    <span className="text-body-xs text-muted-foreground/70" aria-hidden>
                      Forgot?
                    </span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    aria-invalid={!!errors.password}
                    {...register('password')}
                  />
                  {errors.password && (
                    <p id="password-error" className="text-body-xs text-destructive" role="alert">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoggingIn ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-body-xs text-muted-foreground">
            Secure access · Your workspace identifier is the lowercase URL slug.
          </p>
        </div>
      </main>
    </div>
  );
}
