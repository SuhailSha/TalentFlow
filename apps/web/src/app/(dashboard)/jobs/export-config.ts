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
    formatter: (value: unknown) => formatters.boolean(Boolean(value)),
  },
  {
    key: 'status',
    header: 'Status',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'priority',
    header: 'Priority',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'urgency',
    header: 'Urgency',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'headcount',
    header: 'Headcount',
  },
  {
    key: 'compensation.min',
    header: 'Compensation Min',
    formatter: (value: unknown) => formatters.currency(typeof value === 'number' ? value : 0),
  },
  {
    key: 'compensation.max',
    header: 'Compensation Max',
    formatter: (value: unknown) => formatters.currency(typeof value === 'number' ? value : 0),
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
    formatter: (value: unknown) => formatters.array(Array.isArray(value) ? value : []),
  },
  {
    key: 'targetStartDate',
    header: 'Target Start Date',
    formatter: (value: unknown) => formatters.date(value as string | Date),
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
