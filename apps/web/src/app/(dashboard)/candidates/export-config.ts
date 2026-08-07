import { formatters, type ExportColumn } from '@/lib/export/csv-export';

/**
 * Export column definitions for candidates list
 * Based on CandidateListItem structure from types/candidates.ts
 */
export const candidateExportColumns: ExportColumn[] = [
  {
    key: 'fullName',
    header: 'Full Name',
  },
  {
    key: 'firstName',
    header: 'First Name',
  },
  {
    key: 'lastName',
    header: 'Last Name',
  },
  {
    key: 'email',
    header: 'Email',
  },
  {
    key: 'phone',
    header: 'Phone',
  },
  {
    key: 'currentTitle',
    header: 'Current Title',
  },
  {
    key: 'currentCompany',
    header: 'Current Company',
  },
  {
    key: 'experienceYears',
    header: 'Years of Experience',
  },
  {
    key: 'location',
    header: 'Location',
  },
  {
    key: 'isRemote',
    header: 'Remote Work',
    formatter: (value: unknown) => formatters.boolean(Boolean(value)),
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
    key: 'status',
    header: 'Status',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'availabilityStatus',
    header: 'Availability',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'availableFrom',
    header: 'Available From',
    formatter: (value: unknown) => (value ? formatters.date(value as string | Date) : ''),
  },
  {
    key: 'source',
    header: 'Source',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'lastActivityAt',
    header: 'Last Activity',
    formatter: (value: unknown) => (value ? formatters.datetime(value as string | Date) : 'Never'),
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
