'use client';

import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface GreetingProps {
  /** First name — defaults to "there" when unavailable. */
  firstName?: string | null;
  /** Total count of items surfaced in the "action-required" summary. */
  actionCount: number;
  /** Organization / workspace subtitle. */
  workspaceName?: string | null;
}

function timeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

/**
 * Personal greeting + one-line summary. Matches the approved dashboard
 * mockup treatment: bold "N things need you today" with the count
 * emphasized in brand color, subtitle carries date + workspace.
 */
export function DashboardGreeting({ firstName, actionCount, workspaceName }: GreetingProps) {
  const period = timeOfDay();
  const name   = firstName?.trim() || 'there';
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em]">
          Good {period}, {name}.{' '}
          {actionCount > 0 ? (
            <span className="font-bold text-brand-700">
              {actionCount} thing{actionCount === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="font-bold text-emerald-700">All clear</span>
          )}{' '}
          {actionCount > 0 ? 'need you today.' : 'today.'}
        </h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {dateStr}
          {workspaceName ? ` · ${workspaceName}` : ''}
        </p>
      </div>

      <Button variant="outline" size="sm" className="gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-brand-600" aria-hidden />
        AI weekly insight
      </Button>
    </div>
  );
}
