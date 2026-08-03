'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Row,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  memo,
  useCallback,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { useDensity } from '@/hooks/use-density';
import { cn } from '@/lib/utils';

import { DataTableBulkBar } from './bulk-bar';
import {
  DataTableErrorState,
  DataTableNoResults,
  DataTableZeroState,
} from './empty-states';
import { DataTableSkeleton } from './loading-skeleton';
import type { DataTableConfig, DataTableDensity, DataTableRow } from './types';

const ROW_HEIGHT_PX: Record<DataTableDensity, number> = {
  cozy:        56,
  comfortable: 44,
  compact:     32,
};

const ROW_HEIGHT_CLS: Record<DataTableDensity, string> = {
  cozy:        'h-14',
  comfortable: 'h-11',
  compact:     'h-8',
};

const CELL_PADDING: Record<DataTableDensity, string> = {
  cozy:        'px-4',
  comfortable: 'px-3',
  compact:     'px-2',
};

/**
 * Generic DataTable — TF-2-1.
 *
 * Composition:
 *   <DataTable<T> config={...} />
 *
 * All feature configuration flows through the single `config` prop; see
 * `types.ts` for the shape. No page-specific behavior lives here.
 */
export function DataTable<T extends DataTableRow>({
  config,
}: {
  config: DataTableConfig<T>;
}) {
  const {
    columns,
    data,
    isLoading = false,
    error,
    rowClick = 'drawer',
    onRowOpen,
    rowHref,
    rowActions,
    bulkActions,
    filters,
    emptyStates,
    virtualized = false,
    ariaLabel,
  } = config;

  const { density: userDensity } = useDensity();
  const density = config.density ?? userDensity;
  const router = useRouter();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: !!bulkActions?.length,
    getCoreRowModel: getCoreRowModel(),
    // Server pagination is expected — consumers pass total via config and
    // manage page state externally. Client-side sort/filter still works
    // for small in-memory sets.
    manualPagination: !!config.pagination,
    manualSorting:    !!config.pagination,
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;
  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const hasActiveFilters = (filters?.active?.length ?? 0) > 0;

  // ── State branching ─────────────────────────────────────────────────
  // The primitive is prescriptive about which empty state to render so
  // consumers never accidentally show a "no data" when it's actually
  // an error or a filter mismatch.
  if (error) {
    return emptyStates?.error ?? <DataTableErrorState subtitle={error.message} />;
  }
  if (isLoading && rows.length === 0) {
    return <DataTableSkeleton columns={columns.length} density={density} />;
  }
  if (rows.length === 0) {
    if (hasActiveFilters) {
      return emptyStates?.noResults ?? (
        <DataTableNoResults onClear={filters?.onClearAll} />
      );
    }
    return emptyStates?.zero ?? <DataTableZeroState />;
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-md border bg-background">
      {/* Bulk bar — takes the top slot when a selection exists */}
      {bulkActions && bulkActions.length > 0 && (
        <DataTableBulkBar
          selectedRows={selectedRows}
          actions={bulkActions}
          onClearSelection={() => setRowSelection({})}
        />
      )}

      {virtualized ? (
        <VirtualizedBody
          table={table}
          density={density}
          ariaLabel={ariaLabel}
          rowClick={rowClick}
          onRowOpen={onRowOpen}
          rowHref={rowHref}
          rowActions={rowActions}
          router={router}
        />
      ) : (
        <PlainBody
          table={table}
          density={density}
          ariaLabel={ariaLabel}
          rowClick={rowClick}
          onRowOpen={onRowOpen}
          rowHref={rowHref}
          rowActions={rowActions}
          router={router}
        />
      )}
    </div>
  );
}

// ── PlainBody ────────────────────────────────────────────────────────────────
// Renders every row in the DOM. Fine up to ~500 rows. Beyond that, pass
// `virtualized: true` in the config.

interface RowProps<T extends DataTableRow> {
  density:    DataTableDensity;
  rowClick:   'drawer' | 'navigate' | 'none';
  onRowOpen?: (row: T) => void;
  rowHref?:   (row: T) => string;
  rowActions?: DataTableConfig<T>['rowActions'];
  router:     ReturnType<typeof useRouter>;
}

interface BodyProps<T extends DataTableRow> extends RowProps<T> {
  table:      ReturnType<typeof useReactTable<T>>;
  ariaLabel:  string;
}

function PlainBody<T extends DataTableRow>({
  table, density, ariaLabel, rowClick, onRowOpen, rowHref, rowActions, router,
}: BodyProps<T>) {
  return (
    <div className="overflow-auto">
      <table
        aria-label={ariaLabel}
        aria-rowcount={table.getRowModel().rows.length}
        className="w-full border-collapse text-body-sm"
      >
        <TableHeader table={table} density={density} hasRowActions={!!rowActions?.length} />
        <tbody>
          {table.getRowModel().rows.map((row, rowIndex) => (
            <BodyRow
              key={row.id}
              row={row}
              rowIndex={rowIndex}
              density={density}
              rowClick={rowClick}
              onRowOpen={onRowOpen}
              rowHref={rowHref}
              rowActions={rowActions}
              router={router}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── VirtualizedBody ──────────────────────────────────────────────────────────
// Wraps the header + a virtualized rows region. Container height comes
// from the parent (workspace / page). We pin the header, virtualize the
// body via `@tanstack/react-virtual` with a fixed row height.
//
// Row heights match the density map above — dynamic heights would work
// but at the cost of measurement complexity. Rows are visually uniform
// in TalentFlow's list surfaces.

function VirtualizedBody<T extends DataTableRow>({
  table, density, ariaLabel, rowClick, onRowOpen, rowHref, rowActions, router,
}: BodyProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowHeight = ROW_HEIGHT_PX[density];

  const rowVirtualizer = useVirtualizer({
    count:        table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan:     8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize   = rowVirtualizer.getTotalSize();
  const paddingTop     = virtualRows.length ? virtualRows[0]!.start : 0;
  const paddingBottom  = virtualRows.length
    ? totalSize - virtualRows[virtualRows.length - 1]!.end
    : 0;

  return (
    <div
      ref={parentRef}
      className="max-h-[70vh] min-h-[300px] overflow-auto"
      style={{ containIntrinsicSize: `auto ${totalSize}px` }}
    >
      <table
        aria-label={ariaLabel}
        aria-rowcount={table.getRowModel().rows.length}
        className="w-full border-collapse text-body-sm"
      >
        <TableHeader table={table} density={density} hasRowActions={!!rowActions?.length} />
        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true"><td style={{ height: paddingTop }} colSpan={table.getAllColumns().length + 1} /></tr>
          )}
          {virtualRows.map((v) => {
            const row = table.getRowModel().rows[v.index]!;
            return (
              <BodyRow
                key={row.id}
                row={row}
                rowIndex={v.index}
                density={density}
                rowClick={rowClick}
                onRowOpen={onRowOpen}
                rowHref={rowHref}
                rowActions={rowActions}
                router={router}
              />
            );
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden="true"><td style={{ height: paddingBottom }} colSpan={table.getAllColumns().length + 1} /></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function TableHeader<T extends DataTableRow>({
  table, density, hasRowActions,
}: {
  table:         ReturnType<typeof useReactTable<T>>;
  density:       DataTableDensity;
  hasRowActions: boolean;
}) {
  return (
    <thead className="sticky top-0 z-10 bg-background">
      {table.getHeaderGroups().map((headerGroup) => (
        <tr
          key={headerGroup.id}
          className={cn('border-b', ROW_HEIGHT_CLS[density])}
        >
          {headerGroup.headers.map((header) => {
            const canSort = header.column.getCanSort();
            const sortDir = header.column.getIsSorted();
            return (
              <th
                key={header.id}
                scope="col"
                className={cn(
                  'text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground',
                  CELL_PADDING[density],
                )}
                style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}
              >
                {header.isPlaceholder ? null : canSort ? (
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className="group inline-flex items-center gap-1 hover:text-foreground"
                    aria-label={`Sort by ${String(header.column.columnDef.header ?? header.column.id)}`}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <SortIcon dir={sortDir} />
                  </button>
                ) : (
                  flexRender(header.column.columnDef.header, header.getContext())
                )}
              </th>
            );
          })}
          {hasRowActions && <th aria-hidden className={cn('w-24', CELL_PADDING[density])} />}
        </tr>
      ))}
    </thead>
  );
}

function SortIcon({ dir }: { dir: false | 'asc' | 'desc' }) {
  if (dir === 'asc')  return <ArrowUp   className="h-3 w-3 text-brand-600" aria-hidden />;
  if (dir === 'desc') return <ArrowDown className="h-3 w-3 text-brand-600" aria-hidden />;
  return <ChevronsUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" aria-hidden />;
}

// ── Body row (memoized so hover state on one row doesn't rerender all) ───────

const BodyRow = memo(function BodyRow<T extends DataTableRow>({
  row, rowIndex, density, rowClick, onRowOpen, rowHref, rowActions, router,
}: RowProps<T> & { row: Row<T>; rowIndex: number }) {
  const handleOpen = useCallback(() => {
    if (rowClick === 'navigate' && rowHref) {
      router.push(rowHref(row.original));
    } else if (rowClick === 'drawer' && onRowOpen) {
      onRowOpen(row.original);
    }
  }, [rowClick, onRowOpen, rowHref, router, row]);

  const handleKey = useCallback((e: ReactKeyboardEvent<HTMLTableRowElement>) => {
    // Enter or Space opens the row (WCAG 2.1.1 — every mouse action
    // has a keyboard equivalent). j/k row navigation is a Phase 3
    // enhancement — keyed to the container, not the row.
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    }
  }, [handleOpen]);

  const clickable = rowClick !== 'none' && (rowClick === 'drawer' ? !!onRowOpen : !!rowHref);

  return (
    <tr
      role="row"
      aria-rowindex={rowIndex + 1}
      onClick={clickable ? handleOpen : undefined}
      onKeyDown={clickable ? handleKey : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={cn(
        'group border-b border-border/60',
        ROW_HEIGHT_CLS[density],
        clickable && 'cursor-pointer transition-colors hover:bg-muted/50 focus:bg-muted/60',
        clickable && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
        row.getIsSelected() && 'bg-brand-50/50 dark:bg-brand-500/10',
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className={cn(
            'align-middle text-foreground',
            CELL_PADDING[density],
          )}
          style={{ width: cell.column.getSize() === 150 ? undefined : cell.column.getSize() }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
      {rowActions && rowActions.length > 0 && (
        <td className={cn('align-middle', CELL_PADDING[density])}>
          <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {rowActions.map((a) => (a.hidden?.(row.original) ? null : (
              <button
                key={a.id}
                type="button"
                aria-label={a.label}
                onClick={(e) => { e.stopPropagation(); a.onClick(row.original); }}
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-border hover:text-foreground',
                  a.danger && 'hover:text-danger-700',
                )}
              >
                {a.icon}
              </button>
            )))}
            {rowActions.length === 0 && (
              <span aria-hidden><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></span>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}) as <T extends DataTableRow>(props: RowProps<T> & { row: Row<T>; rowIndex: number }) => React.ReactElement;

// ── Public re-exports ────────────────────────────────────────────────────────

export * from './types';
export { useUrlState } from './use-url-state';
export { DataTableToolbar } from './toolbar';
export { SavedViewsRow } from './saved-views-row';
export { loadViews, saveViews, addView, removeView } from './saved-views-store';
export { DataTableSkeleton } from './loading-skeleton';
export {
  DataTableZeroState,
  DataTableNoResults,
  DataTableErrorState,
} from './empty-states';

// Convenience — most consumers only need these three imports.
export { useDensity } from '@/hooks/use-density';
