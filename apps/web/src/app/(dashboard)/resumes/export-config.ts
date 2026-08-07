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
    formatter: formatters.status,
  },
  {
    key: 'source',
    header: 'Source',
    formatter: formatters.status,
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
    formatter: (bytes: number) => {
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
    formatter: formatters.date,
  },
  {
    key: 'updatedAt',
    header: 'Last Updated',
    formatter: formatters.datetime,
  },
];
