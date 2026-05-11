import { differenceInCalendarDays, differenceInHours } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';

interface OverdueIndicatorProps {
  /** ISO timestamp of the due date. Anything in the past is overdue. */
  dueAt:    string | Date | null | undefined;
  /** Optional label to show when overdue, defaults to "Overdue". */
  label?:   string;
  className?: string;
}

/** Shows a red "Overdue" pill if `dueAt` is in the past. Renders nothing otherwise. */
export function OverdueIndicator({ dueAt, label, className }: OverdueIndicatorProps) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (due.getTime() >= Date.now()) return null;
  const days = Math.abs(differenceInCalendarDays(due, new Date()));
  const text = label ?? (days === 0 ? 'Overdue' : `Overdue by ${days}d`);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700',
        className,
      )}
      title={`Was due ${due.toLocaleString()}`}
    >
      <AlertTriangle className="h-3 w-3" />
      {text}
    </span>
  );
}

interface StaleIndicatorProps {
  /** ISO timestamp of the last meaningful activity. */
  lastActivityAt: string | Date | null | undefined;
  /** Days without activity before showing the indicator. Defaults to 7. */
  thresholdDays?: number;
  /** Optional label to show when stale. */
  label?:         string;
  className?:     string;
}

/** Shows an amber "Stalled" pill if no activity in N days. */
export function StaleIndicator({
  lastActivityAt, thresholdDays = 7, label, className,
}: StaleIndicatorProps) {
  if (!lastActivityAt) return null;
  const last = new Date(lastActivityAt);
  const days = differenceInCalendarDays(new Date(), last);
  if (days < thresholdDays) return null;
  const text = label ?? `Stalled ${days}d`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700',
        className,
      )}
      title={`Last activity ${last.toLocaleString()}`}
    >
      <Clock className="h-3 w-3" />
      {text}
    </span>
  );
}

interface UrgencyIndicatorProps {
  level: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  label?: string;
  className?: string;
}

const URGENCY_TONE: Record<UrgencyIndicatorProps['level'], string> = {
  low:      'bg-gray-100 text-gray-700',
  normal:   'bg-blue-100 text-blue-700',
  high:     'bg-orange-100 text-orange-700',
  urgent:   'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800',
};

/** Shows an urgency pill — used for jobs, submissions, reminders. */
export function UrgencyIndicator({ level, label, className }: UrgencyIndicatorProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
      URGENCY_TONE[level],
      className,
    )}>
      {label ?? level}
    </span>
  );
}

interface DueSoonIndicatorProps {
  dueAt: string | Date | null | undefined;
  /** Hours from now where "due soon" applies. Defaults to 24. */
  thresholdHours?: number;
  className?: string;
}

/** Shows an amber "Due soon" pill if `dueAt` is upcoming within N hours. */
export function DueSoonIndicator({
  dueAt, thresholdHours = 24, className,
}: DueSoonIndicatorProps) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const hoursAway = differenceInHours(due, new Date());
  if (hoursAway < 0 || hoursAway > thresholdHours) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700',
        className,
      )}
      title={`Due ${due.toLocaleString()}`}
    >
      <Clock className="h-3 w-3" />
      Due soon
    </span>
  );
}
