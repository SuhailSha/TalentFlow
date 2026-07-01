'use client';

import { Sparkles, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type CommandCenterSeverity = 'urgent' | 'warning' | 'info' | 'ai';

export interface CommandCenterItemProps {
  severity:  CommandCenterSeverity;
  icon:      LucideIcon;
  title:     string;
  hint?:     string;
  /** Actions render right-aligned. Consumer controls Button variants. */
  actions?:  React.ReactNode;
  /** Optional entire-row link. If provided, primary action clicks bypass it. */
  href?:     string;
  onClick?:  () => void;
}

const SEVERITY_STYLE: Record<CommandCenterSeverity, { row: string; icon: string; hint: string }> = {
  urgent:  {
    row:  'border-l-4 border-l-red-500',
    icon: 'bg-red-100     text-red-700     dark:bg-red-500/15     dark:text-red-300',
    hint: 'text-red-700   dark:text-red-300',
  },
  warning: {
    row:  'border-l-4 border-l-amber-500',
    icon: 'bg-amber-100   text-amber-700   dark:bg-amber-500/15   dark:text-amber-300',
    hint: 'text-amber-700 dark:text-amber-300',
  },
  info:    {
    row:  'border-l-4 border-l-blue-500',
    icon: 'bg-blue-100    text-blue-700    dark:bg-blue-500/15    dark:text-blue-300',
    hint: 'text-muted-foreground',
  },
  ai:      {
    row:  'border-l-4 border-l-brand-500',
    icon: 'bg-brand-100   text-brand-700   dark:bg-brand-500/15   dark:text-brand-300',
    hint: 'text-muted-foreground',
  },
};

export function CommandCenterItem({
  severity, icon: Icon, title, hint, actions,
}: CommandCenterItemProps) {
  const s = SEVERITY_STYLE[severity];
  return (
    <div className={cn(
      'group flex items-center gap-3 border-b border-border/60 bg-background px-4 py-3 last:border-b-0',
      s.row,
    )}>
      <span className={cn('grid h-8 w-8 flex-none place-items-center rounded-md', s.icon)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-foreground">{title}</div>
        {hint && <div className={cn('truncate text-[11.5px]', s.hint)}>{hint}</div>}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}

interface CommandCenterProps {
  /** Human-readable "Refreshed 2 min ago" label. */
  refreshedLabel?: string;
  children: React.ReactNode;
  empty?: React.ReactNode;
}

/**
 * AI Command Center — the priority feed at the top of the dashboard.
 * Wraps a vertical list of `<CommandCenterItem>`s with a header that
 * reads as AI-authored. Consumer decides which severity to emit for
 * each row.
 */
export function CommandCenter({ refreshedLabel, children, empty }: CommandCenterProps) {
  const isEmpty = !Array.isArray(children) || children.length === 0;

  return (
    <section
      aria-label="AI Command Center"
      className="overflow-hidden rounded-lg border bg-background"
    >
      <header className="flex items-center gap-2 border-b bg-brand-50/30 px-4 py-2.5 dark:bg-brand-500/5">
        <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-300" aria-hidden />
        <h2 className="text-[13.5px] font-semibold text-foreground">AI Command Center</h2>
        {refreshedLabel && (
          <span className="ml-1 text-[11.5px] text-muted-foreground">
            {refreshedLabel}
          </span>
        )}
      </header>

      {isEmpty && empty
        ? <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">{empty}</div>
        : children
      }
    </section>
  );
}
