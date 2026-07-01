'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import type { SubmissionListItem, SubmissionStatus } from '@/types/submissions';

const STATUS_STYLE: Record<SubmissionStatus, string> = {
  DRAFT:        'bg-muted           text-muted-foreground',
  SUBMITTED:    'bg-blue-100        text-blue-800    dark:bg-blue-500/15    dark:text-blue-300',
  UNDER_REVIEW: 'bg-amber-100       text-amber-800   dark:bg-amber-500/15   dark:text-amber-300',
  SHORTLISTED:  'bg-purple-100      text-purple-800  dark:bg-purple-500/15  dark:text-purple-300',
  INTERVIEW:    'bg-indigo-100      text-indigo-800  dark:bg-indigo-500/15  dark:text-indigo-300',
  OFFERED:      'bg-orange-100      text-orange-800  dark:bg-orange-500/15  dark:text-orange-300',
  PLACED:       'bg-emerald-100     text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  REJECTED:     'bg-red-100         text-red-800     dark:bg-red-500/15     dark:text-red-300',
  WITHDRAWN:    'bg-muted           text-muted-foreground opacity-70',
  ON_HOLD:      'bg-amber-50        text-amber-800   dark:bg-amber-500/10   dark:text-amber-300',
  CLOSED:       'bg-slate-100       text-slate-700   dark:bg-slate-500/15   dark:text-slate-300',
};

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  DRAFT:        'Draft',
  SUBMITTED:    'Submitted',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED:  'Shortlisted',
  INTERVIEW:    'Interview',
  OFFERED:      'Offered',
  PLACED:       'Placed',
  REJECTED:     'Rejected',
  WITHDRAWN:    'Withdrawn',
  ON_HOLD:      'On Hold',
  CLOSED:       'Closed',
};

function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('');
  return (
    <span
      className="grid h-6 w-6 flex-none place-items-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200"
      aria-hidden
    >
      {initials || '?'}
    </span>
  );
}

export const submissionColumns: ColumnDef<SubmissionListItem, unknown>[] = [
  {
    id: 'candidate',
    header: 'Candidate',
    accessorFn: (r) => `${r.candidate.firstName} ${r.candidate.lastName}`,
    cell: ({ row }) => {
      const c = row.original.candidate;
      const fullName = `${c.firstName} ${c.lastName}`;
      return (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={fullName} />
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{fullName}</div>
            <div className="truncate text-[11.5px] text-muted-foreground">{c.currentTitle ?? c.email}</div>
          </div>
        </div>
      );
    },
    size: 240,
    enableSorting: true,
  },
  {
    id: 'job',
    header: 'Job',
    accessorFn: (r) => `${r.job.reqId} ${r.job.title}`,
    cell: ({ row }) => {
      const j = row.original.job;
      return (
        <div className="min-w-0">
          <div className="truncate text-foreground">{j.title}</div>
          <div className="truncate text-[11.5px] text-muted-foreground">
            <span className="font-mono">{j.reqId}</span>
            {j.department ? ` · ${j.department}` : ''}
          </div>
        </div>
      );
    },
    size: 260,
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => (
      <span className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        STATUS_STYLE[row.original.status],
      )}>
        {STATUS_LABEL[row.original.status]}
      </span>
    ),
    size: 130,
    enableSorting: true,
  },
  {
    id: 'vendor',
    header: 'Vendor',
    cell: ({ row }) => (
      row.original.vendor
        ? <span className="truncate text-[12px] text-foreground">{row.original.vendor.companyName}</span>
        : <span className="text-muted-foreground">—</span>
    ),
    size: 160,
  },
  {
    id: 'owner',
    header: 'Owner',
    cell: ({ row }) => {
      const o = row.original.owner;
      return <span className="text-[12px] text-muted-foreground">{o.firstName} {o.lastName}</span>;
    },
    size: 140,
  },
  {
    id: 'rate',
    header: 'Rate',
    accessorFn: (r) => r.billRate ?? -1,
    cell: ({ row }) => {
      const s = row.original;
      if (s.billRate === null) return <span className="text-muted-foreground">—</span>;
      return <span className="text-[12px] text-muted-foreground">{s.currency} {s.billRate}/hr</span>;
    },
    size: 108,
    enableSorting: true,
  },
  {
    id: 'submittedAt',
    header: 'Submitted',
    accessorFn: (r) => r.submittedAt ?? '',
    cell: ({ row }) => {
      const iso = row.original.submittedAt;
      if (!iso) return <span className="text-muted-foreground">—</span>;
      const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
      return <span className="text-[12px] text-muted-foreground">{days}d</span>;
    },
    size: 100,
    enableSorting: true,
  },
];
