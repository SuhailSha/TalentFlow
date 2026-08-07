import { formatters, type ExportColumn } from '@/lib/export/csv-export';

/**
 * Export column definitions for vendors list
 */
export const vendorExportColumns: ExportColumn[] = [
  {
    key: 'name',
    header: 'Vendor Name',
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
    key: 'website',
    header: 'Website',
  },
  {
    key: 'status',
    header: 'Status',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'tier',
    header: 'Tier',
    formatter: (value: unknown) => formatters.status(String(value || '')),
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
    key: 'specializations',
    header: 'Specializations',
    formatter: (value: unknown) => formatters.array(Array.isArray(value) ? value : []),
  },
  {
    key: 'rateStructure.currency',
    header: 'Rate Currency',
  },
  {
    key: 'rateStructure.standardRate',
    header: 'Standard Rate',
  },
  {
    key: 'rateStructure.urgentRate',
    header: 'Urgent Rate',
  },
  {
    key: 'rateStructure.guaranteePeriodDays',
    header: 'Guarantee Period (Days)',
  },
  {
    key: 'paymentTerms.invoicingFrequency',
    header: 'Invoicing Frequency',
    formatter: (value: unknown) => formatters.status(String(value || '')),
  },
  {
    key: 'paymentTerms.paymentDueDays',
    header: 'Payment Due (Days)',
  },
  {
    key: 'primaryContactId',
    header: 'Primary Contact ID',
  },
  {
    key: 'accountManagerId',
    header: 'Account Manager ID',
  },
  {
    key: 'notes',
    header: 'Notes',
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
