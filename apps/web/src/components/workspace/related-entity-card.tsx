import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface RelatedEntityCardProps {
  /** Entity label, e.g. "Submission", "Interview", "Job". */
  eyebrow?:    string;
  title:       string;
  subtitle?:   string;
  /** Status pill text, color-coded by `statusTone`. */
  status?:     string;
  statusTone?: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo' | 'teal';
  href:        string;
  icon?:       LucideIcon;
  /** Right-side compact meta, e.g. a date or a count. */
  meta?:       React.ReactNode;
  className?:  string;
}

const TONE_MAP: Record<NonNullable<RelatedEntityCardProps['statusTone']>, string> = {
  gray:   'bg-gray-100 text-gray-700',
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  amber:  'bg-amber-100 text-amber-700',
  red:    'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  teal:   'bg-teal-100 text-teal-700',
};

export function RelatedEntityCard({
  eyebrow, title, subtitle, status, statusTone = 'gray', href, icon: Icon, meta, className,
}: RelatedEntityCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-md border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent',
        className,
      )}
    >
      {Icon && (
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        {eyebrow && (
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{eyebrow}</div>
        )}
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {status && (
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', TONE_MAP[statusTone])}>
              {status}
            </span>
          )}
        </div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {meta !== undefined && (
        <div className="flex-shrink-0 text-xs text-muted-foreground">{meta}</div>
      )}
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
