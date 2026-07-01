'use client';

import Link from 'next/link';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface KpiTileProps {
  label: string;
  value: number | string;
  icon:  LucideIcon;
  /** Optional drill-through link. */
  href?: string;
  /**
   * Optional trend badge — arbitrary text ("+3", "−2"). `direction` styles
   * the color; direction: undefined = neutral gray.
   */
  delta?: {
    text: string;
    direction?: 'up' | 'down' | 'neutral';
  };
  tone?: 'default' | 'danger' | 'warning' | 'info' | 'positive';
}

const TONE_ICON: Record<NonNullable<KpiTileProps['tone']>, string> = {
  default:  'bg-muted            text-muted-foreground',
  danger:   'bg-red-100          text-red-700     dark:bg-red-500/15     dark:text-red-300',
  warning:  'bg-amber-100        text-amber-800   dark:bg-amber-500/15   dark:text-amber-300',
  info:     'bg-blue-100         text-blue-700    dark:bg-blue-500/15    dark:text-blue-300',
  positive: 'bg-emerald-100      text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

const DELTA_STYLE: Record<'up' | 'down' | 'neutral', string> = {
  up:      'text-emerald-700 dark:text-emerald-300',
  down:    'text-red-700     dark:text-red-300',
  neutral: 'text-muted-foreground',
};

function Tile({ label, value, icon: Icon, delta, tone = 'default' }: KpiTileProps) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-lg border bg-background px-3 py-2.5">
      <span className={cn('grid h-8 w-8 flex-none place-items-center rounded-md', TONE_ICON[tone])}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[17px] font-semibold tabular-nums text-foreground">{value}</span>
          {delta && (
            <span className={cn('text-[11px] font-medium tabular-nums', DELTA_STYLE[delta.direction ?? 'neutral'])}>
              {delta.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function KpiTile(props: KpiTileProps) {
  if (!props.href) return <Tile {...props} />;
  return (
    <Link
      href={props.href}
      className="group relative flex-1 rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <Tile {...props} />
      <ArrowUpRight
        aria-hidden
        className="absolute right-2 top-2 h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}

/**
 * KPI strip — flex row of compact tiles above the fold. Follows the
 * approved dashboard mockup; density-aware via parent tokens.
 */
export function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2">
      {children}
    </div>
  );
}
