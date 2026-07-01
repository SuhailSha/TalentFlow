'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { PageHeader } from '@/components/common/page-header';
import {
  addView,
  DataTable,
  DataTableToolbar,
  loadViews,
  SavedViewsRow,
  type DataTableConfig,
  type FilterChipValue,
  type SavedView,
} from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useJobs } from '@/hooks/use-jobs';
import { cn } from '@/lib/utils';
import type { JobListItem, JobStatus, ListJobsParams } from '@/types/jobs';

import { jobColumns } from './columns';

const NAMESPACE = 'jobs';
const PAGE_SIZE = 25;

const STATUS_FILTERS: { label: string; value: JobStatus }[] = [
  { label: 'Open',    value: 'OPEN'    },
  { label: 'Draft',   value: 'DRAFT'   },
  { label: 'On hold', value: 'ON_HOLD' },
  { label: 'Filled',  value: 'FILLED'  },
];

export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const [statusFilter, setStatusFilter] = useState<JobStatus[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const params: ListJobsParams = {
    page,
    limit:  PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter.length ? statusFilter : undefined,
  };

  const { data, isLoading, isFetching, error } = useJobs(params);

  // Saved views (Phase 2 = localStorage)
  const [views, setViews] = useState<SavedView[]>(() => loadViews(NAMESPACE));
  const [activeViewId, setActiveViewId] = useState<string | undefined>();

  const handleSaveView = useCallback((name: string) => {
    const view: SavedView = {
      id:    `v_${name.toLowerCase().replace(/\W+/g, '-')}_${views.length + 1}`,
      name,
      state: { q: debouncedSearch, status: statusFilter.join(',') },
    };
    setViews(addView(NAMESPACE, view));
    setActiveViewId(view.id);
  }, [debouncedSearch, statusFilter, views.length]);

  const handleSelectView = useCallback((id: string) => {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    setActiveViewId(id);
    setSearch(v.state.q ?? '');
    setStatusFilter((v.state.status ?? '').split(',').filter(Boolean) as JobStatus[]);
    setPage(1);
  }, [views]);

  const toggleStatus = useCallback((s: JobStatus) => {
    setStatusFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
    setPage(1);
  }, []);

  const activeFilters: FilterChipValue[] = useMemo(() => {
    const chips: FilterChipValue[] = [];
    if (debouncedSearch) chips.push({ columnId: 'search', label: 'Search', value: debouncedSearch, serialized: debouncedSearch });
    statusFilter.forEach((s) => chips.push({ columnId: `status:${s}`, label: 'Status', value: s, serialized: s }));
    return chips;
  }, [debouncedSearch, statusFilter]);

  const removeFilter = useCallback((columnId: string) => {
    if (columnId === 'search') { setSearch(''); return; }
    if (columnId.startsWith('status:')) {
      const s = columnId.slice(7) as JobStatus;
      setStatusFilter((prev) => prev.filter((x) => x !== s));
    }
  }, []);

  const clearAll = useCallback(() => { setSearch(''); setStatusFilter([]); setPage(1); }, []);

  const items = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const config: DataTableConfig<JobListItem> = {
    columns:     jobColumns,
    data:        items,
    total,
    isLoading,
    isFetching,
    error:       error ?? null,
    rowClick:    'navigate',
    rowHref:     (r) => `/jobs/${r.id}`,
    ariaLabel:   'Jobs',
    virtualized: items.length > 50,
    filters: {
      active:     activeFilters,
      onRemove:   removeFilter,
      onClearAll: clearAll,
    },
    pagination: {
      pageIndex:    page - 1,
      pageSize:     PAGE_SIZE,
      onPageChange: (idx) => setPage(idx + 1),
      onPageSizeChange: () => { /* fixed in Slice 5 */ },
    },
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Jobs"
        description={`${total.toLocaleString()} requisitions`}
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Jobs' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/jobs/new">
              <Plus className="mr-1.5 h-4 w-4" /> New job
            </Link>
          </Button>
        }
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
        filterMenu={
          <div className="flex items-center gap-2">
            <div className="relative min-w-[280px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search title, department, req…"
                className="h-8 pl-9 text-[12.5px]"
                aria-label="Search jobs"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleStatus(value)}
                  aria-pressed={statusFilter.includes(value)}
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                    statusFilter.includes(value)
                      ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200'
                      : 'border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <DataTable<JobListItem> config={config} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1}          onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

    </div>
  );
}
