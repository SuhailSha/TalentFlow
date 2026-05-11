import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface Crumb { title: string; href?: string }

interface WorkspaceHeaderProps {
  /** Eyebrow line above the title, e.g. "Candidate", "Submission". */
  eyebrow?:    string;
  title:       React.ReactNode;
  /** Optional second line, e.g. job title + company. */
  subtitle?:   React.ReactNode;
  breadcrumbs?: Crumb[];
  /** Slot for status badge, urgency indicator, etc. */
  badges?:     React.ReactNode;
  /** Slot for primary CTAs (e.g. Edit, Schedule, Delete). */
  actions?:    React.ReactNode;
  /** Slot for a row of key facts (e.g. Location, Salary, Availability). */
  facts?:      React.ReactNode;
  className?:  string;
}

export function WorkspaceHeader({
  eyebrow, title, subtitle, breadcrumbs, badges, actions, facts, className,
}: WorkspaceHeaderProps) {
  return (
    <header className={cn('space-y-3 border-b pb-4', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {c.href ? (
                <Link href={c.href} className="hover:text-foreground hover:underline">{c.title}</Link>
              ) : (
                <span>{c.title}</span>
              )}
              {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{eyebrow}</div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
          {badges && <div className="flex flex-wrap items-center gap-2 pt-1">{badges}</div>}
        </div>
        {actions && <div className="flex flex-shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>

      {facts && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
          {facts}
        </dl>
      )}
    </header>
  );
}

interface FactProps { label: string; children: React.ReactNode }
export function WorkspaceFact({ label, children }: FactProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm text-foreground">{children}</dd>
    </div>
  );
}
