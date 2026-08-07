'use client';

import { ExportButton } from '@/components/data-table/export-button';
import type { ExportColumn } from '@/lib/export/csv-export';

export interface ExportMenuProps {
  /** Data to export */
  data: Record<string, unknown>[];
  /** Column definitions for export */
  columns: ExportColumn[];
  /** Base filename (without extension) */
  filename: string;
  /** Whether export is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
}

/**
 * Standalone export menu for pages that don't use DataTable
 *
 * Provides the same export functionality as the DataTable ExportButton
 * but can be used in page headers or other locations
 */
export function ExportMenu({
  data,
  columns,
  filename,
  disabled = false,
  loading = false,
}: ExportMenuProps) {
  return (
    <ExportButton
      data={data}
      columns={columns}
      filename={filename}
      disabled={disabled}
      loading={loading}
      size="sm"
      variant="outline"
    />
  );
}
