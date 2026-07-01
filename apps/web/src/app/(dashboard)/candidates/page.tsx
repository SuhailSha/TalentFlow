'use client';

import { Bell, MessageSquare, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { DataTable, DataTableToolbar, SavedViewsRow } from '@/components/data-table';
import type { BulkAction, DataTableConfig, FilterChipValue, RowAction, SavedView } from '@/components/data-table';
import { addView, loadViews } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useCandidates } from '@/hooks/use-candidates';
import type { CandidateListItem, ListCandidatesParams } from '@/types/candidates';

import { CandidateBulkActions } from './bulk-actions';
import { candidateColumns } from './columns';

const NAMESPACE = 'candidates';

export default function CandidatesPage() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const params: ListCandidatesParams = {
    page,
    limit: 25,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading, isFetching, error } = useCandidates(params);

  // Selection is driven by the DataTable's internal state → bulk-actions
  // dialog reads the current selection via a controlled callback.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // Saved views — Phase 2 backing is localStorage.
  const [views, setViews] = useState<SavedView[]>(() => loadViews(NAMESPACE));
  const [activeViewId, setActiveViewId] = useState<string | undefined>();

  const handleSaveView = useCallback((name: string) => {
    const view: SavedView = {
      id:    `v_${name.toLowerCase().replace(/\W+/g, '-')}_${views.length + 1}`,
      name,
      state: { q: debouncedSearch },
    };
    setViews(addView(NAMESPACE, view));
    setActiveViewId(view.id);
  }, [debouncedSearch, views.length]);

  const handleSelectView = useCallback((id: string) => {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    setActiveViewId(id);
    setSearch(v.state.q ?? '');
    setPage(1);
  }, [views]);

  // Filter chips — only search is wired in Slice 4; status/skill filters
  // land as follow-up work now that the shell is boundary-clean.
  const activeFilters: FilterChipValue[] = useMemo(() => {
    if (!debouncedSearch) return [];
    return [{
      columnId:   'search',
      label:      'Search',
      value:      debouncedSearch,
      serialized: debouncedSearch,
    }];
  }, [debouncedSearch]);

  const bulkActions: BulkAction<CandidateListItem>[] = useMemo(() => [
    { id: 'note',     label: 'Add note',     icon: <MessageSquare className="h-3.5 w-3.5" />, onExecute: (rows) => setSelectedIds(rows.map((r) => r.id)) },
    { id: 'reminder', label: 'Add reminder', icon: <Bell         className="h-3.5 w-3.5" />, onExecute: (rows) => setSelectedIds(rows.map((r) => r.id)) },
    { id: 'delete',   label: 'Delete',       icon: <Trash2       className="h-3.5 w-3.5" />, onExecute: (rows) => setSelectedIds(rows.map((r) => r.id)), danger: true },
  ], []);

  const rowActions: RowAction<CandidateListItem>[] = useMemo(() => [
    {
      id:    'open',
      label: 'Open candidate',
      icon:  <Search className="h-3.5 w-3.5" />,
      onClick: (row) => router.push(`/candidates/${row.id}`),
    },
  ], [router]);

  const items = data?.data ?? [];
  const total = data?.meta.total ?? 0;

  const config: DataTableConfig<CandidateListItem> = {
    columns:     candidateColumns,
    data:        items,
    total,
    isLoading,
    isFetching,
    error:       error ?? null,
    rowClick:    'navigate',
    rowHref:     (r) => `/candidates/${r.id}`,
    ariaLabel:   'Candidates',
    virtualized: items.length > 50,
    rowActions,
    bulkActions,
    filters: {
      active:   activeFilters,
      onRemove: () => setSearch(''),
      onClearAll: () => setSearch(''),
    },
    pagination: {
      pageIndex:        page - 1,
      pageSize:         25,
      onPageChange:     (idx) => setPage(idx + 1),
      onPageSizeChange: () => { /* fixed page size in Slice 4 */ },
    },
  };

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Candidates"
        description={`${total.toLocaleString()} in your pipeline`}
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Candidates' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/candidates/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Add candidate
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
        onRemoveFilter={() => setSearch('')}
        onClearAll={() => setSearch('')}
        filterMenu={(
          <div className="relative min-w-[280px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, title…"
              className="h-8 pl-9 text-[12.5px]"
              aria-label="Search candidates"
            />
          </div>
        )}
      />

      <DataTable<CandidateListItem> config={config} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1}          onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <CandidateBulkActions
        selectedIds={selectedIds}
        selectedCount={selectedIds.length}
        onClear={clearSelection}
      />
    </div>
  );
}
