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
    formatter: formatters.status,
  },
  {
    key: 'type',
    header: 'Type',
    formatter: formatters.status,
  },
  {
    key: 'location',
    header: 'Location',
  },
  {
    key: 'scheduledFor',
    header: 'Scheduled Date',
    formatter: formatters.datetime,
  },
  {
    key: 'duration',
    header: 'Duration (Minutes)',
  },
  {
    key: 'interviewerIds',
    header: 'Interviewer IDs',
    formatter: formatters.array,
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
    formatter: formatters.status,
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
