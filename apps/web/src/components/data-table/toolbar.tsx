'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { FilterChipValue } from './types';

interface ToolbarProps {
  activeFilters?: FilterChipValue[];
  onRemoveFilter?: (columnId: string) => void;
  onClearAll?:     () => void;
  filterMenu?:     React.ReactNode;
  /** Right-aligned area — density toggle, columns picker, export button. */
  rightSlot?:      React.ReactNode;
}

/**
 * DataTable toolbar — TF-2-1.
 *
 * Renders active filter chips (removable), a `+ Filter` popover slot
 * (consumer-owned so per-list filter menus can differ), and a right
 * slot for density / columns / export controls.
 *
 * Kept intentionally slim; the DataTable itself owns saved-views + a
 * separate row above the toolbar.
 */
export function DataTableToolbar({
  activeFilters = [],
  onRemoveFilter,
  onClearAll,
  filterMenu,
  rightSlot,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 py-2">
      {activeFilters.map((f) => (
        <span
          key={f.columnId}
          className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[12px]"
        >
          <span className="text-muted-foreground">{f.label}:</span>
          <span className="font-medium">{f.value}</span>
          {onRemoveFilter && (
            <button
              type="button"
              aria-label={`Remove ${f.label} filter`}
              onClick={() => onRemoveFilter(f.columnId)}
              className="grid h-4 w-4 place-items-center rounded text-muted-foreground hover:bg-border hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}

      {filterMenu}

      {activeFilters.length > 0 && onClearAll && (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          Clear all
        </Button>
      )}

      <div className="ml-auto flex items-center gap-1">
        {rightSlot}
      </div>
    </div>
  );
}
