import { formatters, type ExportColumn } from '@/lib/export/csv-export';

/**
 * Export column definitions for submissions list
 * Based on SubmissionListItem structure from types/submissions.ts
 */
export const submissionExportColumns: ExportColumn[] = [
  {
    key: 'candidate.firstName',
    header: 'Candidate First Name',
  },
  {
    key: 'candidate.lastName',
    header: 'Candidate Last Name',
  },
  {
    key: 'candidate.email',
    header: 'Candidate Email',
  },
  {
    key: 'candidate.currentTitle',
    header: 'Current Title',
  },
  {
    key: 'candidate.location',
    header: 'Location',
  },
  {
    key: 'job.reqId',
    header: 'Job Req ID',
  },
  {
    key: 'job.title',
    header: 'Job Title',
  },
  {
    key: 'job.department',
    header: 'Department',
  },
  {
    key: 'status',
    header: 'Status',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'vendor.companyName',
    header: 'Vendor Company',
  },
  {
    key: 'owner.firstName',
    header: 'Owner First Name',
  },
  {
    key: 'owner.lastName',
    header: 'Owner Last Name',
  },
  {
    key: 'owner.email',
    header: 'Owner Email',
  },
  {
    key: 'billRate',
    header: 'Bill Rate',
    formatter: (value: unknown) => formatters.currency(typeof value === 'number' ? value : 0),
  },
  {
    key: 'payRate',
    header: 'Pay Rate',
    formatter: (value: unknown) => formatters.currency(typeof value === 'number' ? value : 0),
  },
  {
    key: 'currency',
    header: 'Currency',
  },
  {
    key: 'startDate',
    header: 'Start Date',
    formatter: (value: unknown) => (value ? formatters.date(value as string | Date) : ''),
  },
  {
    key: 'submittedAt',
    header: 'Submitted Date',
    formatter: (value: unknown) => (value ? formatters.datetime(value as string | Date) : ''),
  },
  {
    key: 'offeredAt',
    header: 'Offered Date',
    formatter: (value: unknown) => (value ? formatters.datetime(value as string | Date) : ''),
  },
  {
    key: 'placedAt',
    header: 'Placed Date',
    formatter: (value: unknown) => (value ? formatters.datetime(value as string | Date) : ''),
  },
  {
    key: 'rejectedAt',
    header: 'Rejected Date',
    formatter: (value: unknown) => (value ? formatters.datetime(value as string | Date) : ''),
  },
  {
    key: 'createdAt',
    header: 'Created Date',
    formatter: (value: unknown) => formatters.date(value as string | Date),
  },
  {
    key: 'updatedAt',
    header: 'Last Updated',
    formatter: (value: unknown) => formatters.datetime(value as string | Date),
  },
];
