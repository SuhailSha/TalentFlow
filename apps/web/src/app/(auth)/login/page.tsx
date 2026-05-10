'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

// Metadata cannot be exported from a 'use client' file in Next.js 15.
// Move to a separate layout.tsx or use generateMetadata in a server wrapper
// if SEO matters for the login page.

const loginSchema = z.object({
  organizationSlug: z
    .string()
    .min(1, 'Organization is required')
    .regex(/^[a-z0-9-]+$/, 'Invalid organization identifier'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth();

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
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary">
          <span className="text-sm font-bold text-primary-foreground">RP</span>
        </div>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your organization account</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Organization slug */}
          <div className="space-y-1.5">
            <Label htmlFor="organizationSlug">Organization</Label>
            <Input
              id="organizationSlug"
              type="text"
              autoComplete="organization"
              placeholder="your-company"
              aria-describedby={errors.organizationSlug ? 'slug-error' : undefined}
              aria-invalid={!!errors.organizationSlug}
              {...register('organizationSlug')}
            />
            {errors.organizationSlug && (
              <p id="slug-error" className="text-xs text-destructive" role="alert">
                {errors.organizationSlug.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
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
              <p id="email-error" className="text-xs text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
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
              <p id="password-error" className="text-xs text-destructive" role="alert">
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
  );
}
