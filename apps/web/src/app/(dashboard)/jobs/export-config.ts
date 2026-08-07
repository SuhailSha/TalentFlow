import { formatters, type ExportColumn } from '@/lib/export/csv-export';

/**
 * Export column definitions for jobs list
 * Based on JobListItem structure from types/jobs.ts
 */
export const jobExportColumns: ExportColumn[] = [
  {
    key: 'reqId',
    header: 'Req ID',
  },
  {
    key: 'title',
    header: 'Job Title',
  },
  {
    key: 'department',
    header: 'Department',
  },
  {
    key: 'employmentType',
    header: 'Employment Type',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'workMode',
    header: 'Work Mode',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'status',
    header: 'Status',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'hiringPriority',
    header: 'Priority',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'hiringManagerName',
    header: 'Hiring Manager',
  },
  {
    key: 'openPositions',
    header: 'Open Positions',
  },
  {
    key: 'filledPositions',
    header: 'Filled Positions',
  },
  {
    key: 'experienceMin',
    header: 'Min Experience (Years)',
  },
  {
    key: 'experienceMax',
    header: 'Max Experience (Years)',
  },
  {
    key: 'city',
    header: 'City',
  },
  {
    key: 'country',
    header: 'Country',
  },
  {
    key: 'topSkills',
    header: 'Top Skills',
    formatter: (skills: unknown) => {
      if (!Array.isArray(skills)) return '';
      return skills
        .map((skillView) => {
          if (skillView && typeof skillView === 'object') {
            const sv = skillView as { skill?: { displayName?: string; name?: string } };
            return sv.skill?.displayName || sv.skill?.name || '';
          }
          return String(skillView || '');
        })
        .filter(Boolean)
        .join(', ');
    },
  },
  {
    key: 'targetHireDate',
    header: 'Target Hire Date',
    formatter: (value: unknown) => (value ? formatters.date(value as string | Date) : ''),
  },
  {
    key: 'openedAt',
    header: 'Opened Date',
    formatter: (value: unknown) => (value ? formatters.date(value as string | Date) : ''),
  },
  {
    key: 'closedAt',
    header: 'Closed Date',
    formatter: (value: unknown) => (value ? formatters.date(value as string | Date) : ''),
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
