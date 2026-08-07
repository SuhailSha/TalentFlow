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
    formatter: formatters.status,
  },
  {
    key: 'stage',
    header: 'Stage',
    formatter: formatters.status,
  },
  {
    key: 'source',
    header: 'Source',
    formatter: formatters.status,
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
    formatter: formatters.status,
  },
  {
    key: 'expectedSalary.amount',
    header: 'Expected Salary',
    formatter: formatters.currency,
  },
  {
    key: 'expectedSalary.currency',
    header: 'Salary Currency',
  },
  {
    key: 'availableFrom',
    header: 'Available From',
    formatter: formatters.date,
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
    formatter: formatters.status,
  },
  {
    key: 'submittedAt',
    header: 'Submitted Date',
    formatter: formatters.datetime,
  },
  {
    key: 'createdAt',
    header: 'Created Date',
    formatter: formatters.date,
  },
  {
    key: 'updatedAt',
    header: 'Last Updated',
    formatter: formatters.datetime,
  },
];
