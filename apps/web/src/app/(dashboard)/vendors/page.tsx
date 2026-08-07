'use client';

import { Plus, Search } from 'lucide-react';
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
  type DataTableConfig,
  type FilterChipValue,
  type SavedView,
} from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useVendors } from '@/hooks/use-vendors';
import { cn } from '@/lib/utils';
import type { ListVendorsParams, VendorListItem, VendorStatus } from '@/types/vendors';

import { vendorColumns } from './columns';
import { vendorExportColumns } from './export-config';

const NAMESPACE = 'vendors';
const PAGE_SIZE = 25;

const STATUS_FILTERS: { label: string; value: VendorStatus }[] = [
  { label: 'Prospect', value: 'PROSPECT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Blocked', value: 'BLOCKED' },
];

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<VendorStatus[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const params: ListVendorsParams = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter.length ? statusFilter : undefined,
  };

  const { data, isLoading, isFetching, error } = useVendors(params);

  const [views, setViews] = useState<SavedView[]>(() => loadViews(NAMESPACE));
  const [activeViewId, setActiveViewId] = useState<string | undefined>();

  const handleSaveView = useCallback(
    (name: string) => {
      const view: SavedView = {
        id: `v_${name.toLowerCase().replace(/\W+/g, '-')}_${views.length + 1}`,
        name,
        state: { q: debouncedSearch, status: statusFilter.join(',') },
      };
      setViews(addView(NAMESPACE, view));
      setActiveViewId(view.id);
    },
    [debouncedSearch, statusFilter, views.length],
  );

  const handleSelectView = useCallback(
    (id: string) => {
      const v = views.find((x) => x.id === id);
      if (!v) return;
      setActiveViewId(id);
      setSearch(v.state.q ?? '');
      setStatusFilter((v.state.status ?? '').split(',').filter(Boolean) as VendorStatus[]);
      setPage(1);
    },
    [views],
  );

  const toggleStatus = useCallback((s: VendorStatus) => {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setPage(1);
  }, []);

  const activeFilters: FilterChipValue[] = useMemo(() => {
    const chips: FilterChipValue[] = [];
    if (debouncedSearch)
      chips.push({
        columnId: 'search',
        label: 'Search',
        value: debouncedSearch,
        serialized: debouncedSearch,
      });
    statusFilter.forEach((s) =>
      chips.push({ columnId: `status:${s}`, label: 'Status', value: s, serialized: s }),
    );
    return chips;
  }, [debouncedSearch, statusFilter]);

  const removeFilter = useCallback((columnId: string) => {
    if (columnId === 'search') {
      setSearch('');
      return;
    }
    if (columnId.startsWith('status:')) {
      const s = columnId.slice(7) as VendorStatus;
      setStatusFilter((prev) => prev.filter((x) => x !== s));
    }
  }, []);

  const clearAll = useCallback(() => {
    setSearch('');
    setStatusFilter([]);
    setPage(1);
  }, []);

  const items = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const config: DataTableConfig<VendorListItem> = {
    columns: vendorColumns,
    data: items,
    total,
    isLoading,
    isFetching,
    error: error ?? null,
    rowClick: 'navigate',
    rowHref: (r) => `/vendors/${r.id}`,
    ariaLabel: 'Vendors',
    virtualized: items.length > 50,
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
        title="Vendors"
        description={`${total.toLocaleString()} staffing partners`}
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Vendors' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/vendors/new">
              <Plus className="mr-1.5 h-4 w-4" /> New vendor
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, contact, domain…"
                className="h-8 pl-9 text-[12.5px]"
                aria-label="Search vendors"
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
        rightSlot={
          <ExportButton
            data={items as unknown as Record<string, unknown>[]}
            columns={vendorExportColumns}
            filename="vendors"
            disabled={isLoading || items.length === 0}
            loading={isLoading}
          />
        }
      />

      <DataTable<VendorListItem> config={config} />

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
    </div>
  );
}
