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
    formatter: formatters.status,
  },
  {
    key: 'tier',
    header: 'Tier',
    formatter: formatters.status,
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
    formatter: formatters.array,
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
    formatter: formatters.status,
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
    formatter: formatters.date,
  },
  {
    key: 'updatedAt',
    header: 'Last Updated',
    formatter: formatters.datetime,
  },
];
