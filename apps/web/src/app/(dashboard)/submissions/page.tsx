'use client';

import { Archive, Bell, Plus, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { PageHeader } from '@/components/common/page-header';
import {
  addView,
  DataTable,
  DataTableToolbar,
  ExportButton,
  loadViews,
  SavedViewsRow,
  type BulkAction,
  type DataTableConfig,
  type FilterChipValue,
  type SavedView,
} from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { useSubmissions, useSubmissionStats } from '@/hooks/use-submissions';
import { cn } from '@/lib/utils';
import type {
  ListSubmissionsParams,
  SubmissionListItem,
  SubmissionStatus,
} from '@/types/submissions';

import { SubmissionBulkActions } from './bulk-actions';
import { submissionColumns } from './columns';
import { submissionExportColumns } from './export-config';

const NAMESPACE = 'submissions';
const PAGE_SIZE = 25;

const ACTIVE_STATUSES: SubmissionStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
  'ON_HOLD',
];
const TERMINAL_STATUSES: SubmissionStatus[] = ['PLACED', 'REJECTED', 'WITHDRAWN', 'CLOSED'];

type Pipeline = 'all' | 'active' | 'terminal';

function StatsBar({ pipeline, onChange }: { pipeline: Pipeline; onChange: (p: Pipeline) => void }) {
  const { data } = useSubmissionStats();
  const total = data?.total ?? 0;
  const active =
    data?.byStatus
      .filter((s) => ACTIVE_STATUSES.includes(s.status))
      .reduce((sum, s) => sum + s.count, 0) ?? 0;
  const placed = data?.byStatus.find((s) => s.status === 'PLACED')?.count ?? 0;

  const btn = (key: Pipeline, label: string, count: number, tone: string) => (
    <button
      key={key}
      type="button"
      onClick={() => onChange(key)}
      aria-pressed={pipeline === key}
      className={cn(
        'inline-flex flex-col items-start rounded-md border px-3 py-1.5 text-left transition-colors',
        pipeline === key
          ? 'border-brand-300 bg-brand-50/70 dark:border-brand-500/40 dark:bg-brand-500/10'
          : 'border-border hover:bg-muted/40',
      )}
    >
      <span className={cn('text-[10.5px] uppercase tracking-wider', tone)}>{label}</span>
      <span className="text-[15px] font-semibold text-foreground">{count.toLocaleString()}</span>
    </button>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {btn('all', 'Total', total, 'text-muted-foreground')}
      {btn('active', 'Active', active, 'text-emerald-700 dark:text-emerald-300')}
      {btn('terminal', 'Placed', placed, 'text-blue-700    dark:text-blue-300')}
    </div>
  );
}

export default function SubmissionsPage() {
  const [page, setPage] = useState(1);
  const [pipeline, setPipeline] = useState<Pipeline>('all');

  const params: ListSubmissionsParams = {
    page,
    limit: PAGE_SIZE,
    ...(pipeline === 'active' && { status: ACTIVE_STATUSES }),
    ...(pipeline === 'terminal' && { status: TERMINAL_STATUSES }),
  };

  const { data, isLoading, isFetching, error } = useSubmissions(params);

  const [views, setViews] = useState<SavedView[]>(() => loadViews(NAMESPACE));
  const [activeViewId, setActiveViewId] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const handleSaveView = useCallback(
    (name: string) => {
      const view: SavedView = {
        id: `v_${name.toLowerCase().replace(/\W+/g, '-')}_${views.length + 1}`,
        name,
        state: { pipeline },
      };
      setViews(addView(NAMESPACE, view));
      setActiveViewId(view.id);
    },
    [pipeline, views.length],
  );

  const handleSelectView = useCallback(
    (id: string) => {
      const v = views.find((x) => x.id === id);
      if (!v) return;
      setActiveViewId(id);
      if (
        v.state.pipeline === 'all' ||
        v.state.pipeline === 'active' ||
        v.state.pipeline === 'terminal'
      ) {
        setPipeline(v.state.pipeline);
      }
      setPage(1);
    },
    [views],
  );

  const activeFilters: FilterChipValue[] = useMemo(() => {
    if (pipeline === 'all') return [];
    return [
      {
        columnId: 'pipeline',
        label: 'Pipeline',
        value: pipeline === 'active' ? 'Active' : 'Closed',
        serialized: pipeline,
      },
    ];
  }, [pipeline]);

  const removeFilter = useCallback(() => {
    setPipeline('all');
    setPage(1);
  }, []);
  const clearAll = useCallback(() => {
    setPipeline('all');
    setPage(1);
  }, []);

  const items = data?.data ?? [];
  const total = data?.meta.total ?? 0;

  const bulkActions: BulkAction<SubmissionListItem>[] = useMemo(
    () => [
      {
        id: 'status',
        label: 'Change status',
        icon: <UserPlus className="h-3.5 w-3.5" />,
        onExecute: (rows) => setSelectedIds(rows.map((r) => r.id)),
      },
      {
        id: 'reminder',
        label: 'Add reminder',
        icon: <Bell className="h-3.5 w-3.5" />,
        onExecute: (rows) => setSelectedIds(rows.map((r) => r.id)),
      },
      {
        id: 'archive',
        label: 'Archive',
        icon: <Archive className="h-3.5 w-3.5" />,
        onExecute: (rows) => setSelectedIds(rows.map((r) => r.id)),
        danger: true,
      },
    ],
    [],
  );

  const config: DataTableConfig<SubmissionListItem> = {
    columns: submissionColumns,
    data: items,
    total,
    isLoading,
    isFetching,
    error: error ?? null,
    rowClick: 'navigate',
    rowHref: (r) => `/submissions/${r.id}`,
    ariaLabel: 'Submissions',
    virtualized: items.length > 50,
    bulkActions,
    filters: {
      active: activeFilters,
      onRemove: removeFilter,
      onClearAll: clearAll,
    },
    pagination: {
      pageIndex: page - 1,
      pageSize: PAGE_SIZE,
      onPageChange: (idx) => setPage(idx + 1),
      onPageSizeChange: () => {
        /* fixed in Slice 5 */
      },
    },
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Submissions"
        description="Candidate pipeline across all jobs"
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Submissions' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/submissions/new">
              <Plus className="mr-1.5 h-4 w-4" /> New submission
            </Link>
          </Button>
        }
      />

      <StatsBar
        pipeline={pipeline}
        onChange={(p) => {
          setPipeline(p);
          setPage(1);
        }}
      />

      <SavedViewsRow
        views={views}
        activeId={activeViewId}
        onSelect={handleSelectView}
        onSave={handleSaveView}
      />

      <DataTableToolbar
        activeFilters={activeFilters}
        onRemoveFilter={removeFilter}
        onClearAll={clearAll}
        rightSlot={
          <ExportButton
            data={items as unknown as Record<string, unknown>[]}
            columns={submissionExportColumns}
            filename="submissions"
            disabled={isLoading || items.length === 0}
            loading={isLoading}
          />
        }
      />

      <DataTable<SubmissionListItem> config={config} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <SubmissionBulkActions
        selectedIds={selectedIds}
        selectedCount={selectedIds.length}
        onClear={clearSelection}
      />
    </div>
  );
}
