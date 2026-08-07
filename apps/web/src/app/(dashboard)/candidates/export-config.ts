import { formatters, type ExportColumn } from '@/lib/export/csv-export';

/**
 * Export column definitions for candidates list
 */
export const candidateExportColumns: ExportColumn[] = [
  {
    key: 'identity.fullName',
    header: 'Full Name',
  },
  {
    key: 'identity.firstName',
    header: 'First Name',
  },
  {
    key: 'identity.lastName',
    header: 'Last Name',
  },
  {
    key: 'identity.emails.0',
    header: 'Email',
  },
  {
    key: 'identity.phones.0',
    header: 'Phone',
  },
  {
    key: 'professional.currentTitle',
    header: 'Current Title',
  },
  {
    key: 'professional.currentCompany',
    header: 'Current Company',
  },
  {
    key: 'professional.yearsOfExperience',
    header: 'Years of Experience',
  },
  {
    key: 'professional.skills',
    header: 'Skills',
    formatter: (skills: unknown) => {
      if (!Array.isArray(skills)) return '';
      return skills
        .map((skill) => {
          if (skill && typeof skill === 'object') {
            const skillObj = skill as { normalized?: string; raw?: string };
            return skillObj.normalized || skillObj.raw || String(skill);
          }
          return String(skill || '');
        })
        .filter(Boolean)
        .join(', ');
    },
  },
  {
    key: 'identity.location.city',
    header: 'City',
  },
  {
    key: 'identity.location.state',
    header: 'State',
  },
  {
    key: 'identity.location.country',
    header: 'Country',
  },
  {
    key: 'status',
    header: 'Status',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'source',
    header: 'Source',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'recruiting.currentCtc.amount',
    header: 'Current CTC',
    formatter: (value: unknown) => formatters.currency(typeof value === 'number' ? value : 0),
  },
  {
    key: 'recruiting.expectedCtc.amount',
    header: 'Expected CTC',
    formatter: (value: unknown) => formatters.currency(typeof value === 'number' ? value : 0),
  },
  {
    key: 'recruiting.noticePeriodDays',
    header: 'Notice Period (Days)',
  },
  {
    key: 'recruiting.visaStatus',
    header: 'Visa Status',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'recruiting.workAuthorization',
    header: 'Work Authorization',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'ownerId',
    header: 'Owner ID',
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
