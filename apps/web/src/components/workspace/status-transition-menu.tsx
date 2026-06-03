'use client';

import { ChevronDown, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Mirrors the server FSM in apps/api/src/common/workflow/lifecycle.constants.ts.
// Kept in sync manually — the API still enforces this, so a drift only causes
// a "Bad transition" 400 the user can recover from.

interface StatusTransitionMenuProps<Status extends string> {
  current:      Status;
  /** Permitted next states from `current` per the server FSM. */
  transitions:  Status[];
  /** Optional pretty labels — defaults to TitleCase of the enum value. */
  labels?:      Partial<Record<Status, string>>;
  /** Optional tone-per-status used to color the trigger badge. */
  tones?:       Partial<Record<Status, string>>;
  /** Disabled when the workspace user lacks permission. */
  disabled?:    boolean;
  pending?:     boolean;
  onTransition: (next: Status) => void;
}

function defaultLabel<Status extends string>(s: Status): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusTransitionMenu<Status extends string>({
  current, transitions, labels, tones, disabled, pending, onTransition,
}: StatusTransitionMenuProps<Status>) {
  const triggerLabel = labels?.[current] ?? defaultLabel(current);
  const triggerTone = tones?.[current] ?? 'bg-muted text-foreground';

  // Terminal state — no transitions available.
  if (transitions.length === 0 || disabled) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium',
          triggerTone,
          disabled && 'opacity-90',
        )}
      >
        {triggerLabel}
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={cn('h-7 gap-1 border-transparent text-xs font-medium', triggerTone)}
          disabled={pending}
        >
          {pending && <Loader2 className="h-3 w-3 animate-spin" />}
          {triggerLabel}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Change status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {transitions.map((s) => (
          <DropdownMenuItem key={s} onClick={() => onTransition(s)}>
            {labels?.[s] ?? defaultLabel(s)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
