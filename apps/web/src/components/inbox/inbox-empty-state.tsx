import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Inbox zero — the "you're all caught up" state. Approved mockup calls
 * for a positive frame (achievement, not emptiness) with a nudge back
 * to actionable work.
 */
export function InboxEmptyState({ variant = 'zero' }: { variant?: 'zero' | 'filtered' }) {
  if (variant === 'filtered') {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
        <h2 className="text-h2 font-semibold">No matches</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          No notifications match this filter. Switch tabs to see other categories.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-success-50 text-success-700">
        <CheckCircle2 className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-h2 font-semibold">You&apos;re all caught up</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        When teammates @mention you or an action needs attention, it&apos;ll show up here.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/candidates">Triage candidates</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/dashboard">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
