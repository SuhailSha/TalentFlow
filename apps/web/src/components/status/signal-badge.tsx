import { type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { TONE_PILL, type StatusTone } from './status-tones';

export type SignalTone = StatusTone;

interface SignalBadgeProps {
  icon?:    LucideIcon;
  label:    string;
  tone?:    StatusTone;
  /** Optional small numeric suffix, e.g. count of issues. */
  count?:   number;
  className?: string;
  title?:   string;
}

// Compact pill used in workspace headers to surface health signals
// (stale, overdue reminders, duplicates pending, etc.) at a glance.
// Refactored in Phase 0B to share the canonical tone palette and
// support the brand and success tones via the design system.
export function SignalBadge({
  icon: Icon,
  label,
  tone = 'neutral',
  count,
  className,
  title,
}: SignalBadgeProps) {
  return (
    <span
      title={title ?? label}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-eyebrow uppercase ring-1 ring-inset',
        TONE_PILL[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
      {typeof count === 'number' && count > 0 && (
        <span className="rounded bg-white/70 px-1 tabular-nums dark:bg-neutral-900/40">
          {count}
        </span>
      )}
    </span>
  );
}
