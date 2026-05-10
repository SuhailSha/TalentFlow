'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Route-segment error boundary — Next.js calls this when an unhandled error
 * propagates up from a page or layout within the same segment.
 *
 * Must be a Client Component (Next.js requirement for error.tsx files).
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[ErrorPage]', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="max-w-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred. Our team has been notified.'}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
        )}
      </div>
      <Button onClick={reset} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
