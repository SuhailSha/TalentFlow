'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AvailabilityStatus, CandidateListItem, CandidateStatus } from '@/types/candidates';

const STATUS_STYLE: Record<CandidateStatus, string> = {
  ACTIVE:      'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  AVAILABLE:   'bg-teal-100    text-teal-800    dark:bg-teal-500/15    dark:text-teal-300',
  INACTIVE:    'bg-muted       text-muted-foreground',
  PLACED:      'bg-blue-100    text-blue-800    dark:bg-blue-500/15    dark:text-blue-300',
  BLACKLISTED: 'bg-red-100     text-red-800     dark:bg-red-500/15     dark:text-red-300',
};

const AVAILABILITY_SHORT: Record<AvailabilityStatus, string> = {
  IMMEDIATELY:  'Now',
  TWO_WEEKS:    '2w',
  ONE_MONTH:    '1mo',
  THREE_MONTHS: '3mo',
  NOT_LOOKING:  '—',
};

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className="grid h-7 w-7 flex-none place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200"
      aria-hidden
    >
      {initials || '?'}
    </span>
  );
}

/**
 * Candidate list column pack — first consumer of the DataTable primitive.
 *
 * The AI Match column is a placeholder pending Phase 2 scoring integration;
 * shape is stable so the score wiring is a one-file change.
 */
export const candidateColumns: ColumnDef<CandidateListItem, unknown>[] = [
  {
    id:     'name',
    header: 'Candidate',
    accessorFn: (r) => r.fullName,
    cell: ({ row }) => {
      const c = row.original;
      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={c.fullName} />
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{c.fullName}</div>
            <div className="truncate text-[11.5px] text-muted-foreground">
              {[c.currentTitle, c.currentCompany].filter(Boolean).join(' · ') || c.email}
            </div>
          </div>
        </div>
      );
    },
    size: 280,
    enableSorting: true,
  },
  {
    id:     'aiMatch',
    header: 'AI Match',
    cell:   () => (
      <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11.5px] font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
        <Sparkles className="h-3 w-3" aria-hidden />
        —
      </span>
    ),
    size: 96,
  },
  {
    id:     'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
          STATUS_STYLE[row.original.status],
        )}
      >
        {row.original.status}
      </span>
    ),
    size: 120,
    enableSorting: true,
  },
  {
    id:     'availability',
    header: 'Avail.',
    accessorKey: 'availabilityStatus',
    cell: ({ row }) => (
      <span className="text-[12px] text-muted-foreground">
        {AVAILABILITY_SHORT[row.original.availabilityStatus]}
      </span>
    ),
    size: 72,
  },
  {
    id:     'experience',
    header: 'Exp.',
    accessorFn: (r) => r.experienceYears ?? -1,
    cell: ({ row }) =>
      row.original.experienceYears === null
        ? <span className="text-muted-foreground">—</span>
        : <span>{row.original.experienceYears}y</span>,
    size: 68,
    enableSorting: true,
  },
  {
    id:     'location',
    header: 'Location',
    accessorKey: 'location',
    cell: ({ row }) => (
      <span className="truncate text-[12px] text-muted-foreground">
        {row.original.location ?? '—'}
      </span>
    ),
    size: 160,
  },
  {
    id:     'skills',
    header: 'Skills',
    cell: ({ row }) => {
      const s = row.original.topSkills.slice(0, 3);
      if (s.length === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {s.map((cs) => (
            <Badge key={cs.id} variant="secondary" className="text-[10.5px]">
              {cs.skill.displayName}
            </Badge>
          ))}
          {row.original.topSkills.length > 3 && (
            <Badge variant="secondary" className="text-[10.5px]">
              +{row.original.topSkills.length - 3}
            </Badge>
          )}
        </div>
      );
    },
    size: 260,
  },
  {
    id:     'lastActivity',
    header: 'Last touch',
    accessorFn: (r) => r.lastActivityAt ?? '',
    cell: ({ row }) => {
      const iso = row.original.lastActivityAt;
      if (!iso) return <span className="text-muted-foreground">—</span>;
      const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
      return <span className="text-[12px] text-muted-foreground">{days}d</span>;
    },
    size: 96,
    enableSorting: true,
  },
];
