import { formatters, type ExportColumn } from '@/lib/export/csv-export';

/**
 * Export column definitions for submissions list
 */
export const submissionExportColumns: ExportColumn[] = [
  {
    key: 'candidateName',
    header: 'Candidate Name',
  },
  {
    key: 'candidateEmail',
    header: 'Candidate Email',
  },
  {
    key: 'jobReqId',
    header: 'Job Req ID',
  },
  {
    key: 'jobTitle',
    header: 'Job Title',
  },
  {
    key: 'status',
    header: 'Status',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'stage',
    header: 'Stage',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'source',
    header: 'Source',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'vendorId',
    header: 'Vendor ID',
  },
  {
    key: 'vendorName',
    header: 'Vendor Name',
  },
  {
    key: 'submittedById',
    header: 'Submitted By ID',
  },
  {
    key: 'assignedRecruiterId',
    header: 'Assigned Recruiter ID',
  },
  {
    key: 'priority',
    header: 'Priority',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'expectedSalary.amount',
    header: 'Expected Salary',
    formatter: (value: unknown) => formatters.currency(typeof value === 'number' ? value : 0),
  },
  {
    key: 'expectedSalary.currency',
    header: 'Salary Currency',
  },
  {
    key: 'availableFrom',
    header: 'Available From',
    formatter: (value: unknown) => formatters.date(value as string | Date),
  },
  {
    key: 'noticePeriodDays',
    header: 'Notice Period (Days)',
  },
  {
    key: 'overallRating',
    header: 'Overall Rating',
  },
  {
    key: 'fitScore',
    header: 'Fit Score',
  },
  {
    key: 'rejectionReason',
    header: 'Rejection Reason',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'submittedAt',
    header: 'Submitted Date',
    formatter: (value: unknown) => formatters.datetime(value as string | Date),
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
