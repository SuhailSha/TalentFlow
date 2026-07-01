'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Zap } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  VendorListItem,
  VendorPriority,
  VendorStatus,
  VendorType,
} from '@/types/vendors';

const STATUS_STYLE: Record<VendorStatus, string> = {
  PROSPECT: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300',
  ACTIVE:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  INACTIVE: 'bg-muted       text-muted-foreground',
  BLOCKED:  'bg-red-100     text-red-800     dark:bg-red-500/15     dark:text-red-300',
  ARCHIVED: 'bg-muted       text-muted-foreground opacity-60',
};

const PRIORITY_STYLE: Record<VendorPriority, string> = {
  LOW:       'bg-muted       text-muted-foreground',
  NORMAL:    'bg-transparent text-transparent',
  HIGH:      'bg-orange-100  text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  STRATEGIC: 'bg-amber-100   text-amber-800  dark:bg-amber-500/15  dark:text-amber-300',
};

const TYPE_LABEL: Record<VendorType, string> = {
  STAFFING_AGENCY:     'Staffing',
  CONSULTING_FIRM:     'Consulting',
  FREELANCE_PLATFORM:  'Freelance',
  RECRUITMENT_PARTNER: 'Recruitment',
  DIRECT_CLIENT:       'Direct client',
  OTHER:               'Other',
};

const STALLED_THRESHOLD_DAYS = 30;

export const vendorColumns: ColumnDef<VendorListItem, unknown>[] = [
  {
    id: 'code',
    header: 'Code',
    accessorKey: 'vendorCode',
    cell: ({ row }) => (
      <span className="font-mono text-[11.5px] text-muted-foreground">
        {row.original.vendorCode ?? '—'}
      </span>
    ),
    size: 90,
  },
  {
    id: 'name',
    header: 'Vendor',
    accessorKey: 'companyName',
    cell: ({ row }) => {
      const v = row.original;
      return (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{v.companyName}</div>
          <div className="truncate text-[11.5px] text-muted-foreground">
            {[TYPE_LABEL[v.type], v.location].filter(Boolean).join(' · ')}
          </div>
        </div>
      );
    },
    size: 260,
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
    accessorKey: 'priority',
    cell: ({ row }) => {
      if (row.original.priority === 'NORMAL') {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
          PRIORITY_STYLE[row.original.priority],
        )}>
          {row.original.priority}
        </span>
      );
    },
    size: 100,
  },
  {
    id: 'signals',
    header: 'Pipeline',
    cell: ({ row }) => {
      const v = row.original;
      const active  = v.activeSubmissionCount  ?? 0;
      const stalled = v.stalledSubmissionCount ?? 0;
      const daysSince = v.lastActivityAt
        ? differenceInCalendarDays(new Date(), new Date(v.lastActivityAt))
        : null;
      const isRelationshipStalled =
        v.status === 'ACTIVE' &&
        active === 0 &&
        (daysSince === null || daysSince >= STALLED_THRESHOLD_DAYS);

      if (active === 0 && stalled === 0 && !isRelationshipStalled) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {active > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              <Zap className="h-3 w-3" aria-hidden />
              {active}
            </span>
          )}
          {stalled > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
              <AlertCircle className="h-3 w-3" aria-hidden />
              {stalled}
            </span>
          )}
          {isRelationshipStalled && (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50/70 px-2 py-0.5 text-[10.5px] font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
              Stalled
            </span>
          )}
        </div>
      );
    },
    size: 180,
  },
  {
    id: 'contact',
    header: 'Contact',
    cell: ({ row }) => {
      const v = row.original;
      if (!v.primaryContactName && !v.primaryContactEmail) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="min-w-0">
          {v.primaryContactName && <div className="truncate text-[12px] text-foreground">{v.primaryContactName}</div>}
          {v.primaryContactEmail && <div className="truncate text-[11.5px] text-muted-foreground">{v.primaryContactEmail}</div>}
        </div>
      );
    },
    size: 220,
  },
  {
    id: 'domains',
    header: 'Domains',
    cell: ({ row }) => {
      const d = row.original.domains.slice(0, 3);
      if (d.length === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {d.map((x) => (
            <Badge key={x} variant="secondary" className="text-[10.5px]">{x}</Badge>
          ))}
          {row.original.domains.length > 3 && (
            <Badge variant="secondary" className="text-[10.5px]">
              +{row.original.domains.length - 3}
            </Badge>
          )}
        </div>
      );
    },
    size: 220,
  },
  {
    id: 'lastActivity',
    header: 'Last activity',
    accessorFn: (r) => r.lastActivityAt ?? '',
    cell: ({ row }) => {
      const iso = row.original.lastActivityAt;
      if (!iso) return <span className="text-muted-foreground">—</span>;
      const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
      return <span className="text-[12px] text-muted-foreground">{days}d</span>;
    },
    size: 108,
    enableSorting: true,
  },
];
