'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  EmploymentType,
  JobListItem,
  JobPriority,
  JobStatus,
  WorkMode,
} from '@/types/jobs';

const STATUS_STYLE: Record<JobStatus, string> = {
  DRAFT:     'bg-muted            text-muted-foreground',
  OPEN:      'bg-emerald-100      text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  ON_HOLD:   'bg-amber-100        text-amber-800   dark:bg-amber-500/15   dark:text-amber-300',
  FILLED:    'bg-blue-100         text-blue-800    dark:bg-blue-500/15    dark:text-blue-300',
  CANCELLED: 'bg-red-100          text-red-800     dark:bg-red-500/15     dark:text-red-300',
  ARCHIVED:  'bg-muted            text-muted-foreground opacity-60',
};

const PRIORITY_STYLE: Record<JobPriority, string> = {
  LOW:    'bg-muted       text-muted-foreground',
  NORMAL: 'bg-transparent text-transparent',
  HIGH:   'bg-orange-100  text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  URGENT: 'bg-red-100     text-red-800    dark:bg-red-500/15    dark:text-red-300',
};

const WORK_MODE_LABEL: Record<WorkMode, string> = {
  ONSITE: 'Onsite',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  FULL_TIME:        'FT',
  PART_TIME:        'PT',
  CONTRACT:         'Contract',
  CONTRACT_TO_HIRE: 'C2H',
  FREELANCE:        'Freelance',
  INTERNSHIP:       'Intern',
};

export const jobColumns: ColumnDef<JobListItem, unknown>[] = [
  {
    id: 'req',
    header: 'Req',
    accessorKey: 'reqId',
    cell: ({ row }) => (
      <span className="font-mono text-[11.5px] text-muted-foreground">{row.original.reqId}</span>
    ),
    size: 96,
    enableSorting: true,
  },
  {
    id: 'title',
    header: 'Title',
    accessorKey: 'title',
    cell: ({ row }) => {
      const j = row.original;
      return (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{j.title}</div>
          <div className="truncate text-[11.5px] text-muted-foreground">
            {[j.department, WORK_MODE_LABEL[j.workMode], EMPLOYMENT_LABEL[j.employmentType]]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
      );
    },
    size: 320,
    enableSorting: true,
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
        {row.original.status}
      </span>
    ),
    size: 108,
    enableSorting: true,
  },
  {
    id: 'priority',
    header: 'Priority',
    accessorKey: 'hiringPriority',
    cell: ({ row }) => {
      if (row.original.hiringPriority === 'NORMAL') {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
          PRIORITY_STYLE[row.original.hiringPriority],
        )}>
          {row.original.hiringPriority}
        </span>
      );
    },
    size: 92,
  },
  {
    id: 'positions',
    header: 'Filled',
    cell: ({ row }) => {
      const j = row.original;
      return (
        <span className="text-[12px] text-muted-foreground">
          {j.filledPositions}/{j.openPositions}
        </span>
      );
    },
    size: 80,
  },
  {
    id: 'location',
    header: 'Location',
    accessorFn: (r) => [r.city, r.country].filter(Boolean).join(', '),
    cell: ({ row }) => (
      <span className="truncate text-[12px] text-muted-foreground">
        {[row.original.city, row.original.country].filter(Boolean).join(', ') || '—'}
      </span>
    ),
    size: 160,
  },
  {
    id: 'experience',
    header: 'Exp.',
    accessorFn: (r) => r.experienceMin ?? -1,
    cell: ({ row }) => {
      const { experienceMin, experienceMax } = row.original;
      if (experienceMin === null && experienceMax === null) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <span className="text-[12px] text-muted-foreground">
          {experienceMin ?? 0}–{experienceMax ?? '∞'}y
        </span>
      );
    },
    size: 96,
  },
  {
    id: 'skills',
    header: 'Skills',
    cell: ({ row }) => {
      const skills = row.original.topSkills.slice(0, 3);
      if (skills.length === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {skills.map((s) => (
            <Badge
              key={s.id}
              variant={s.isRequired ? 'default' : 'secondary'}
              className="text-[10.5px]"
            >
              {s.skill.displayName}
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
    id: 'targetDate',
    header: 'Target',
    accessorFn: (r) => r.targetHireDate ?? '',
    cell: ({ row }) => {
      const d = row.original.targetHireDate;
      if (!d) return <span className="text-muted-foreground">—</span>;
      const daysUntil = Math.floor((Date.parse(d) - Date.now()) / 86_400_000);
      const style = daysUntil < 0 ? 'text-red-700 dark:text-red-400'
                 : daysUntil < 14 ? 'text-orange-700 dark:text-orange-400'
                 :                  'text-muted-foreground';
      return (
        <span className={cn('text-[12px]', style)}>
          {daysUntil < 0 ? `${-daysUntil}d late` : `${daysUntil}d`}
        </span>
      );
    },
    size: 96,
    enableSorting: true,
  },
];
