'use client';

import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface NextAction {
  id:        string;
  label:     string;
  /** Optional short context, e.g. "Submission has been in SHORTLISTED for 5 days". */
  hint?:     string;
  icon?:     LucideIcon;
  /** Either an href (link) or an onClick (button). */
  href?:     string;
  onClick?:  () => void;
  /** Recommended action stands out visually. */
  primary?:  boolean;
  /** Marks the action as time-sensitive. */
  urgent?:   boolean;
  disabled?: boolean;
}

interface NextActionsPanelProps {
  actions:  NextAction[];
  title?:   string;
  emptyMessage?: string;
  className?: string;
}

export function NextActionsPanel({
  actions, title = 'Next actions', emptyMessage = 'No actions required.', className,
}: NextActionsPanelProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          actions.map((action) => {
            const Icon = action.icon;
            const content = (
              <div className="flex items-start gap-3 text-left">
                {Icon && (
                  <span className={cn(
                    'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md',
                    action.urgent
                      ? 'bg-red-100 text-red-700'
                      : action.primary ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    {action.label}
                    {action.urgent && (
                      <span className="rounded bg-red-100 px-1 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                        Urgent
                      </span>
                    )}
                  </div>
                  {action.hint && <div className="text-xs text-muted-foreground">{action.hint}</div>}
                </div>
                <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </div>
            );

            const wrapperClass = cn(
              'block w-full rounded-md border p-3 transition-colors',
              action.disabled
                ? 'cursor-not-allowed opacity-50'
                : 'hover:bg-accent hover:border-accent-foreground/20',
              action.primary && !action.disabled && 'border-primary/30 bg-primary/5',
            );

            if (action.href && !action.disabled) {
              return (
                <Link key={action.id} href={action.href} className={wrapperClass}>
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={wrapperClass}
              >
                {content}
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
