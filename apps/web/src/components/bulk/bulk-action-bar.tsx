'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  /** Count of selected items. Bar auto-hides when zero. */
  selectedCount: number;
  /** Clears the selection. */
  onClear:       () => void;
  /** Optional label describing the resource type, e.g. "submissions". */
  resourceLabel?: string;
  /** Action buttons (right side). */
  children:      React.ReactNode;
  className?:    string;
}

/**
 * Sticky bottom toolbar that appears when one or more rows are selected.
 * Centered, capped width, contrast against the page background.
 *
 * Auto-hides at selectedCount === 0 so list pages don't need conditional
 * rendering at the call site.
 */
export function BulkActionBar({
  selectedCount,
  onClear,
  resourceLabel,
  children,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4',
        className,
      )}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
          onClick={onClear}
          aria-label="Clear selection (Esc)"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          <span className="font-medium tabular-nums text-foreground">{selectedCount}</span>
          {resourceLabel && <span className="ml-1 text-muted-foreground">{resourceLabel}</span>}
        </Button>
        <div className="mx-1 h-5 w-px bg-border" aria-hidden />
        <div className="flex flex-wrap items-center gap-1">{children}</div>
      </div>
    </div>
  );
}
