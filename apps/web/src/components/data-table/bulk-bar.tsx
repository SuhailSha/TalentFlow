'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { BulkAction, DataTableRow } from './types';

interface BulkBarProps<T extends DataTableRow> {
  selectedRows: T[];
  actions:      BulkAction<T>[];
  onClearSelection: () => void;
}

/**
 * Bulk actions bar. Sticky at the top of the table's scroll region
 * when `selectedRows.length > 0`. The bar takes over the toolbar
 * visually so recruiters can't mistake the state.
 *
 * Async actions show an inline pending state and re-throw so the
 * caller's onExecute can surface toast errors.
 */
export function DataTableBulkBar<T extends DataTableRow>({
  selectedRows,
  actions,
  onClearSelection,
}: BulkBarProps<T>) {
  const [pending, setPending] = useState<string | null>(null);

  if (selectedRows.length === 0) return null;

  async function run(action: BulkAction<T>) {
    setPending(action.id);
    try {
      await action.onExecute(selectedRows);
    } finally {
      setPending(null);
    }
  }

  return (
    <div
      role="region"
      aria-label={`${selectedRows.length} rows selected`}
      className="sticky top-0 z-20 flex h-11 items-center gap-2 rounded-t-md bg-foreground px-3 text-background"
    >
      <span className="font-medium text-[13px]">
        {selectedRows.length} selected
      </span>
      <div className="mx-2 h-4 w-px bg-background/25" />
      {actions.map((a) => (
        <Button
          key={a.id}
          variant={a.danger ? 'destructive' : 'secondary'}
          size="sm"
          disabled={pending !== null}
          onClick={() => void run(a)}
          className={cn(
            'h-7 gap-1.5 text-[12px]',
            !a.danger && 'bg-background/10 text-background hover:bg-background/20',
          )}
        >
          {a.icon}
          {pending === a.id ? 'Working…' : a.label}
        </Button>
      ))}
      <button
        type="button"
        onClick={onClearSelection}
        aria-label="Clear selection"
        className="ml-auto grid h-7 w-7 place-items-center rounded-md hover:bg-background/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
