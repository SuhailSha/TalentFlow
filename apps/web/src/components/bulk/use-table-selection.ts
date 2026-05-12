'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface Options<T> {
  /** How to extract a stable id from each row. Defaults to `(r) => r.id`. */
  getId?: (item: T) => string;
  /**
   * When true, an Esc keypress anywhere on the page clears the selection.
   * Defaults to true — recruiters expect this in every list.
   */
  clearOnEsc?: boolean;
}

export interface TableSelection<T> {
  selectedIds:    Set<string>;
  selectedCount:  number;
  isSelected:     (id: string) => boolean;
  toggle:         (id: string) => void;
  selectAll:      () => void;
  clear:          () => void;
  /** True when every visible item is selected (and there is at least one). */
  isAllSelected:  boolean;
  /** True when at least one but not all visible items are selected. */
  isIndeterminate: boolean;
  /** Snapshot of selected items in their original page order. */
  selectedItems:  T[];
}

/**
 * Generic row-selection hook for multi-select tables.
 *
 * Scope: a single visible page. Selection is dropped when the items array
 * changes identity (e.g. page change or filter change) — operators expect
 * "select 10 here, apply, move on" rather than carrying selection across
 * pages. A future enhancement can layer cross-page selection on top by
 * pulling the Set out of the hook and into useState in the page component.
 *
 * Keyboard:
 *   - Esc           -> clear selection (when clearOnEsc is true)
 *
 * Cmd/Ctrl+A is intentionally NOT bound globally — it would fight the
 * browser's native select-all. Pages that want it can attach it locally.
 */
export function useTableSelection<T>(items: T[], options: Options<T> = {}): TableSelection<T> {
  const getId = options.getId ?? ((item: T) => (item as { id: string }).id);
  const clearOnEsc = options.clearOnEsc ?? true;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // Reset selection when the underlying page changes. Identity-based check
  // is fine: TanStack Query returns a new array on refetch / page change.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [items]);

  // Esc to clear globally — recruiters can select, peek at the toolbar,
  // and bail out without hunting for a "Clear" button.
  useEffect(() => {
    if (!clearOnEsc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearOnEsc, selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getId)));
  }, [items, getId]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const isAllSelected = useMemo(
    () => items.length > 0 && items.every((item) => selectedIds.has(getId(item))),
    [items, selectedIds, getId],
  );

  const isIndeterminate = useMemo(
    () => selectedIds.size > 0 && !isAllSelected,
    [selectedIds, isAllSelected],
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(getId(item))),
    [items, selectedIds, getId],
  );

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected,
    toggle,
    selectAll,
    clear,
    isAllSelected,
    isIndeterminate,
    selectedItems,
  };
}
