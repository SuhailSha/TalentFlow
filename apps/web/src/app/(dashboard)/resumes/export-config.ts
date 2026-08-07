import { formatters, type ExportColumn } from '@/lib/export/csv-export';

/**
 * Export column definitions for resumes list
 */
export const resumeExportColumns: ExportColumn[] = [
  {
    key: 'currentVersion.fileName',
    header: 'File Name',
  },
  {
    key: 'label',
    header: 'Label',
  },
  {
    key: 'status',
    header: 'Status',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'source',
    header: 'Source',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'candidateId',
    header: 'Candidate ID',
  },
  {
    key: 'currentVersion.mimeType',
    header: 'File Type',
  },
  {
    key: 'currentVersion.sizeBytes',
    header: 'File Size (KB)',
    formatter: (bytes: unknown) => {
      if (typeof bytes !== 'number') return '';
      return (bytes / 1024).toFixed(1);
    },
  },
  {
    key: 'currentVersion.pageCount',
    header: 'Pages',
  },
  {
    key: 'versionCount',
    header: 'Version Count',
  },
  {
    key: 'currentVersion.uploadedBy',
    header: 'Uploaded By',
  },
  {
    key: 'createdAt',
    header: 'Upload Date',
    formatter: (value: unknown) => formatters.date(value as string | Date),
  },
  {
    key: 'updatedAt',
    header: 'Last Updated',
    formatter: (value: unknown) => formatters.datetime(value as string | Date),
  },
];
