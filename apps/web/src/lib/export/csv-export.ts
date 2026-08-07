/**
 * CSV Export Utilities
 *
 * Provides functions to export data as CSV files with proper formatting
 */

export interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: any) => string;
}

export interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCsv(data: Record<string, any>[], columns: ExportColumn[]): string {
  // Create header row
  const headers = columns.map((col) => `"${col.header}"`).join(',');

  // Create data rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const value = getNestedValue(item, col.key);
        const formattedValue = col.formatter ? col.formatter(value) : String(value || '');

        // Escape quotes and wrap in quotes
        const escapedValue = formattedValue.replace(/"/g, '""');
        return `"${escapedValue}"`;
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Get nested object value using dot notation (e.g., "user.name")
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Trigger CSV download in browser
 */
export function downloadCsv({ filename, columns, data }: ExportOptions): void {
  const csvContent = arrayToCsv(data, columns);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Format common data types for CSV export
 */
export const formatters = {
  date: (value: string | Date) => {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleDateString();
  },

  datetime: (value: string | Date) => {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleString();
  },

  currency: (value: number) => {
    if (typeof value !== 'number') return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  },

  array: (value: any[]) => {
    if (!Array.isArray(value)) return '';
    return value.join(', ');
  },

  boolean: (value: boolean) => {
    return value ? 'Yes' : 'No';
  },

  status: (value: string) => {
    return (
      value
        ?.replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase()) || ''
    );
  },
};
