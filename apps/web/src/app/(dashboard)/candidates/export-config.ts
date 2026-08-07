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
    formatter: (skills: any[]) => {
      if (!Array.isArray(skills)) return '';
      return skills
        .map((skill) => skill?.normalized || skill?.raw || skill)
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
    formatter: formatters.status,
  },
  {
    key: 'source',
    header: 'Source',
    formatter: formatters.status,
  },
  {
    key: 'recruiting.currentCtc.amount',
    header: 'Current CTC',
    formatter: formatters.currency,
  },
  {
    key: 'recruiting.expectedCtc.amount',
    header: 'Expected CTC',
    formatter: formatters.currency,
  },
  {
    key: 'recruiting.noticePeriodDays',
    header: 'Notice Period (Days)',
  },
  {
    key: 'recruiting.visaStatus',
    header: 'Visa Status',
    formatter: formatters.status,
  },
  {
    key: 'recruiting.workAuthorization',
    header: 'Work Authorization',
    formatter: formatters.status,
  },
  {
    key: 'ownerId',
    header: 'Owner ID',
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
