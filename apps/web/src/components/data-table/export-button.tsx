'use client';

import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadCsv, type ExportColumn } from '@/lib/export/csv-export';

export interface ExportButtonProps {
  /** Data to export */
  data: Record<string, any>[];
  /** Column definitions for export */
  columns: ExportColumn[];
  /** Base filename (without extension) */
  filename: string;
  /** Whether export is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Style variant */
  variant?: 'default' | 'outline' | 'ghost';
}

/**
 * Export button with dropdown for different formats
 *
 * Currently supports CSV export with easy extensibility for Excel/PDF in the future
 */
export function ExportButton({
  data,
  columns,
  filename,
  disabled = false,
  loading = false,
  size = 'sm',
  variant = 'outline',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleCsvExport = async () => {
    if (disabled || data.length === 0) return;

    try {
      setIsExporting(true);

      // Add timestamp to filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const finalFilename = `${filename}-${timestamp}`;

      downloadCsv({
        filename: finalFilename,
        columns,
        data,
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = disabled || loading || isExporting || data.length === 0;
  const recordCount = data.length;

  // Simple button for single format
  if (columns.length === 0) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled={isDisabled}
        onClick={handleCsvExport}
        className="gap-1.5"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isDisabled} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">
          Export {recordCount.toLocaleString()} record{recordCount !== 1 ? 's' : ''}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCsvExport} disabled={isExporting} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          <div>
            <div className="font-medium">CSV Spreadsheet</div>
            <div className="text-xs text-muted-foreground">
              Compatible with Excel, Google Sheets
            </div>
          </div>
        </DropdownMenuItem>

        {/* Future formats */}
        <DropdownMenuItem disabled className="gap-2 opacity-50">
          <FileText className="h-4 w-4 text-red-600" />
          <div>
            <div className="font-medium">PDF Report</div>
            <div className="text-xs text-muted-foreground">Coming soon</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
