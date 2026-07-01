/**
 * DataTable public types — TF-2-1.
 *
 * The primitive is generic over the row type `T` and boundary-agnostic:
 * it knows nothing about candidates, jobs, or Prisma. Consumers wire
 * the fetch layer + column definitions and receive a fully-featured
 * list surface (sort, filter chips, saved views, virtualization,
 * hover actions, drawer-open row) with zero per-page code.
 */

import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

/** Any row must be identifiable — required for selection + row keys. */
export interface DataTableRow {
  id: string;
}

/** Density preference from `useDensity`. Table maps to row height / padding. */
export type DataTableDensity = 'cozy' | 'comfortable' | 'compact';

/** Filter-chip descriptor. Rendered above the table; URL-serializable. */
export interface FilterChipValue {
  /** The column id this filter targets. */
  columnId: string;
  /** Human label ("Status"), rendered before the value. */
  label: string;
  /** Human value ("Active"). */
  value: string;
  /** Machine value serialized to the URL. */
  serialized: string;
}

/** A saved view is a named snapshot of the current filter/sort/column state. */
export interface SavedView {
  id:        string;
  name:      string;
  /** URL-serializable state. Consumers decide the exact shape. */
  state:     Record<string, string>;
  /** Optional: 'private' | 'team' | 'org'. Server-backed views only. */
  sharing?:  'private' | 'team' | 'org';
}

/** Hover-row action — icon-button pattern. */
export interface RowAction<T extends DataTableRow> {
  id:      string;
  label:   string;
  icon:    ReactNode;
  onClick: (row: T) => void;
  /** Hide the action for specific rows (permission gating). */
  hidden?: (row: T) => boolean;
  danger?: boolean;
}

/** Bulk action — applied to the current selection. */
export interface BulkAction<T extends DataTableRow> {
  id:      string;
  label:   string;
  icon?:   ReactNode;
  onExecute: (rows: T[]) => Promise<void> | void;
  danger?: boolean;
}

/**
 * The full DataTable configuration.
 *
 * Consumers construct one of these per list surface. All fields except
 * `columns` and `data` are optional; a minimal call renders a plain
 * paginated table.
 */
export interface DataTableConfig<T extends DataTableRow> {
  /** TanStack Table column defs. Use `createColumnHelper<T>()`. */
  columns: ColumnDef<T, unknown>[];

  /** Rows to render. Consumers pre-fetch via TanStack Query. */
  data: T[];

  /** Total server-side count. When larger than data.length, pagination is server-driven. */
  total?: number;

  /** True while the underlying fetch is in-flight and there is no previous data. */
  isLoading?: boolean;

  /** True during background refetches when data is already present. */
  isFetching?: boolean;

  /** Error object — surfaces as the error empty state. */
  error?: Error | null;

  /**
   * Row-click behavior. Default is `drawer`: the row emits a drawer-open
   * event via `onRowOpen`. `navigate` uses the `rowHref` per row.
   * `none` disables click-to-open (row remains hoverable + selectable).
   */
  rowClick?: 'drawer' | 'navigate' | 'none';
  onRowOpen?: (row: T) => void;
  rowHref?:   (row: T) => string;

  /** Which columns are pinned (frozen). Default: none. */
  pinnedColumns?: {
    left?:  string[];   // column ids
    right?: string[];
  };

  /** Row-level hover actions (icon-only). Rendered right-most. */
  rowActions?: RowAction<T>[];

  /** Bulk actions surface when selection > 0. */
  bulkActions?: BulkAction<T>[];

  /**
   * Density override. Defaults to `useDensity()` prefs. Pass to force
   * a specific density (e.g., an embedded mini-table in a workspace).
   */
  density?: DataTableDensity;

  /**
   * Saved views (Phase 2 = localStorage, Phase 5 = server-backed). If
   * omitted, the saved-views UI is not rendered.
   */
  savedViews?: {
    views:      SavedView[];
    activeId?:  string;
    onSelect:   (id: string) => void;
    onSave:     (name: string) => void;
    onDelete:   (id: string) => void;
  };

  /**
   * Enable virtualization. Recommended for lists > 100 rows. Requires
   * a fixed container height (or a parent with definite height).
   */
  virtualized?: boolean;

  /** Server pagination. Omit for client-side pagination. */
  pagination?: {
    pageIndex: number;
    pageSize:  number;
    onPageChange:     (pageIndex: number) => void;
    onPageSizeChange: (pageSize: number)  => void;
  };

  /** Filter chip descriptors driving the toolbar. */
  filters?: {
    active:   FilterChipValue[];
    onRemove: (columnId: string) => void;
    onClearAll?: () => void;
    /** Render the "+ Filter" popover contents. Consumer-owned. */
    filterMenu?: ReactNode;
  };

  /** Empty-state overrides. */
  emptyStates?: {
    /** No data at all. */
    zero?: ReactNode;
    /** No results after filters applied. */
    noResults?: ReactNode;
    /** Error. */
    error?: ReactNode;
  };

  /** ARIA label for the table region. Required per WCAG 1.3.1. */
  ariaLabel: string;
}
