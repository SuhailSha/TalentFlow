import { formatters, type ExportColumn } from '@/lib/export/csv-export';

/**
 * Export column definitions for interviews list
 */
export const interviewExportColumns: ExportColumn[] = [
  {
    key: 'candidateName',
    header: 'Candidate Name',
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
    key: 'round',
    header: 'Round',
  },
  {
    key: 'roundLabel',
    header: 'Round Label',
  },
  {
    key: 'status',
    header: 'Status',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'type',
    header: 'Type',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'location',
    header: 'Location',
  },
  {
    key: 'scheduledFor',
    header: 'Scheduled Date',
    formatter: (value: unknown) => formatters.datetime(value as string | Date),
  },
  {
    key: 'duration',
    header: 'Duration (Minutes)',
  },
  {
    key: 'interviewerIds',
    header: 'Interviewer IDs',
    formatter: (value: unknown) => formatters.array(Array.isArray(value) ? value : []),
  },
  {
    key: 'coordinatorId',
    header: 'Coordinator ID',
  },
  {
    key: 'meetingUrl',
    header: 'Meeting URL',
  },
  {
    key: 'notes',
    header: 'Notes',
  },
  {
    key: 'overallRating',
    header: 'Overall Rating',
  },
  {
    key: 'recommendation',
    header: 'Recommendation',
    formatter: (value: unknown) => formatters.status(String(value || '')),
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
