'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Building2, Plus, Search } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useVendors } from '@/hooks/use-vendors';
import { useDebounce } from '@/hooks/use-debounce';
import type { ListVendorsParams, VendorListItem, VendorPriority, VendorStatus, VendorType } from '@/types/vendors';

// ── Display maps ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<VendorStatus, string> = {
  PROSPECT: 'bg-purple-100 text-purple-800',
  ACTIVE:   'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
  BLOCKED:  'bg-red-100 text-red-800',
  ARCHIVED: 'bg-gray-100 text-gray-400',
};

const PRIORITY_STYLES: Record<VendorPriority, string> = {
  LOW:       'bg-gray-100 text-gray-600',
  NORMAL:    'bg-blue-50 text-blue-700',
  HIGH:      'bg-orange-100 text-orange-700',
  STRATEGIC: 'bg-amber-100 text-amber-800',
};

const TYPE_LABELS: Record<VendorType, string> = {
  STAFFING_AGENCY:      'Staffing',
  CONSULTING_FIRM:      'Consulting',
  FREELANCE_PLATFORM:   'Freelance Platform',
  RECRUITMENT_PARTNER:  'Recruitment Partner',
  DIRECT_CLIENT:        'Direct Client',
  OTHER:                'Other',
};

const STATUS_FILTERS: { label: string; value: VendorStatus }[] = [
  { label: 'Prospect', value: 'PROSPECT' },
  { label: 'Active',   value: 'ACTIVE'   },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Blocked',  value: 'BLOCKED'  },
];

// ── Vendor row ─────────────────────────────────────────────────────────────────

function VendorRow({ vendor }: { vendor: VendorListItem }) {
  return (
    <Link
      href={`/vendors/${vendor.id}`}
      className="block rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {vendor.vendorCode && (
              <span className="text-xs text-muted-foreground font-mono">{vendor.vendorCode}</span>
            )}
            <span className="font-medium text-sm">{vendor.companyName}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[vendor.status]}`}>
              {vendor.status}
            </span>
            {vendor.priority !== 'NORMAL' && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[vendor.priority]}`}>
                {vendor.priority}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            <span>{TYPE_LABELS[vendor.type]}</span>
            {vendor.location && <span>{vendor.location}</span>}
            {vendor.primaryContactName && (
              <span>{vendor.primaryContactName}</span>
            )}
            {vendor.primaryContactEmail && (
              <span className="truncate max-w-48">{vendor.primaryContactEmail}</span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right space-y-1 text-xs text-muted-foreground">
          {vendor.lastActivityAt && (
            <p>Active {new Date(vendor.lastActivityAt).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {vendor.domains.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {vendor.domains.slice(0, 4).map((d) => (
            <Badge key={d} variant="secondary" className="text-xs">
              {d}
            </Badge>
          ))}
          {vendor.domains.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{vendor.domains.length - 4}
            </Badge>
          )}
        </div>
      )}
    </Link>
  );
}

function VendorRowSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex gap-1">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [statusFilter, setStatusFilter] = useState<VendorStatus[]>([]);
  const debouncedSearch               = useDebounce(search, 300);

  const params: ListVendorsParams = {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusFilter.length ? statusFilter : undefined,
  };

  const { data, isLoading, isError } = useVendors(params);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const toggleStatus = (s: VendorStatus) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
    setPage(1);
  };

  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Manage staffing partners and recruitment relationships"
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Vendors' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/vendors/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New vendor
            </Link>
          </Button>
        }
      />

      {/* Search + status filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, contact, specialization..."
            value={search}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => toggleStatus(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                statusFilter.includes(value)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">Failed to load vendors. Please try again.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <VendorRowSkeleton key={i} />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No vendors found</p>
            {search || statusFilter.length ? (
              <button
                onClick={() => { setSearch(''); setStatusFilter([]); }}
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/vendors/new">Add your first vendor</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data?.data.map((v) => <VendorRow key={v.id} vendor={v} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data?.meta?.total} total &bull; page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
