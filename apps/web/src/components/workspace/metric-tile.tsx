import Link from 'next/link';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricTileProps {
  label:    string;
  value:    React.ReactNode;
  /** Secondary descriptor under the value, e.g. "vs. last week" or "of 30 total". */
  hint?:    string;
  icon?:    LucideIcon;
  /** Optional drill-through link. */
  href?:    string;
  /** Semantic tone — drives the accent color. */
  tone?:    'default' | 'positive' | 'warning' | 'danger' | 'info';
  loading?: boolean;
  className?: string;
}

const TONE_MAP: Record<NonNullable<MetricTileProps['tone']>, { value: string; icon: string }> = {
  default:  { value: 'text-foreground',  icon: 'bg-muted text-muted-foreground' },
  positive: { value: 'text-green-700',   icon: 'bg-green-100 text-green-700' },
  warning:  { value: 'text-amber-700',   icon: 'bg-amber-100 text-amber-700' },
  danger:   { value: 'text-red-700',     icon: 'bg-red-100 text-red-700' },
  info:     { value: 'text-blue-700',    icon: 'bg-blue-100 text-blue-700' },
};

export function MetricTile({
  label, value, hint, icon: Icon, href, tone = 'default', loading, className,
}: MetricTileProps) {
  const tones = TONE_MAP[tone];

  const inner = (
    <Card className={cn(
      'transition-colors',
      href && 'group cursor-pointer hover:border-foreground/20 hover:bg-accent/50',
      className,
    )}>
      <CardContent className="flex items-start gap-3 p-4">
        {Icon && (
          <span className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md', tones.icon)}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
            {href && (
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </div>
          <div className={cn('text-2xl font-semibold tabular-nums', tones.value)}>
            {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-muted" /> : value}
          </div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
