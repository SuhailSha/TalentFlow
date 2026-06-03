import { type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type SignalTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';

interface SignalBadgeProps {
  icon?:    LucideIcon;
  label:    string;
  tone?:    SignalTone;
  /** Optional small numeric suffix, e.g. count of issues. */
  count?:   number;
  className?: string;
  title?:   string;
}

const TONE_CLASS: Record<SignalTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info:    'bg-blue-50 text-blue-700 ring-blue-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger:  'bg-red-50 text-red-700 ring-red-200',
  success: 'bg-green-50 text-green-700 ring-green-200',
};

// Compact pill used in the workspace header to surface health signals
// (stale, overdue reminders, duplicates pending, etc.) at a glance.
export function SignalBadge({ icon: Icon, label, tone = 'neutral', count, className, title }: SignalBadgeProps) {
  return (
    <span
      title={title ?? label}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        TONE_CLASS[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
      {typeof count === 'number' && count > 0 && (
        <span className="rounded bg-white/70 px-1 text-[10px] tabular-nums">{count}</span>
      )}
    </span>
  );
}
