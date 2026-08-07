import { formatters, type ExportColumn } from '@/lib/export/csv-export';

/**
 * Export column definitions for jobs list
 */
export const jobExportColumns: ExportColumn[] = [
  {
    key: 'title',
    header: 'Job Title',
  },
  {
    key: 'reqId',
    header: 'Req ID',
  },
  {
    key: 'department',
    header: 'Department',
  },
  {
    key: 'location.city',
    header: 'City',
  },
  {
    key: 'location.state',
    header: 'State',
  },
  {
    key: 'location.country',
    header: 'Country',
  },
  {
    key: 'remote',
    header: 'Remote',
    formatter: formatters.boolean,
  },
  {
    key: 'status',
    header: 'Status',
    formatter: formatters.status,
  },
  {
    key: 'priority',
    header: 'Priority',
    formatter: formatters.status,
  },
  {
    key: 'urgency',
    header: 'Urgency',
    formatter: formatters.status,
  },
  {
    key: 'headcount',
    header: 'Headcount',
  },
  {
    key: 'compensation.min',
    header: 'Compensation Min',
    formatter: formatters.currency,
  },
  {
    key: 'compensation.max',
    header: 'Compensation Max',
    formatter: formatters.currency,
  },
  {
    key: 'compensation.currency',
    header: 'Currency',
  },
  {
    key: 'yearsOfExperience.min',
    header: 'Min Experience (Years)',
  },
  {
    key: 'yearsOfExperience.max',
    header: 'Max Experience (Years)',
  },
  {
    key: 'hiringManagerId',
    header: 'Hiring Manager ID',
  },
  {
    key: 'recruiterIds',
    header: 'Recruiter IDs',
    formatter: formatters.array,
  },
  {
    key: 'targetStartDate',
    header: 'Target Start Date',
    formatter: formatters.date,
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
