'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Users } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SelectionCheckbox, useTableSelection } from '@/components/bulk';
import { useCandidates } from '@/hooks/use-candidates';
import type { CandidateListItem, CandidateStatus, AvailabilityStatus, ListCandidatesParams } from '@/types/candidates';
import { useDebounce } from '@/hooks/use-debounce';
import { CandidateBulkActions } from './bulk-actions';

const STATUS_COLORS: Record<CandidateStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
  AVAILABLE: 'bg-teal-100 text-teal-800',
  PLACED: 'bg-blue-100 text-blue-800',
  BLACKLISTED: 'bg-red-100 text-red-800',
};

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  IMMEDIATELY: 'Available now',
  TWO_WEEKS: '2 weeks notice',
  ONE_MONTH: '1 month notice',
  THREE_MONTHS: '3 months notice',
  NOT_LOOKING: 'Not looking',
};

interface CandidateRowProps {
  candidate:  CandidateListItem;
  isSelected: boolean;
  onToggle:   (id: string) => void;
}

function CandidateRow({ candidate, isSelected, onToggle }: CandidateRowProps) {
  return (
    <Link
      href={`/candidates/${candidate.id}`}
      className={`block rounded-lg border bg-card p-4 transition-colors ${isSelected ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/50'}`}
    >
      <div className="flex items-start gap-3">
        <span className="pt-0.5">
          <SelectionCheckbox
            checked={isSelected}
            onChange={() => onToggle(candidate.id)}
            aria-label={`Select ${candidate.fullName}`}
          />
        </span>
        <div className="flex flex-1 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{candidate.fullName}</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[candidate.status]}`}
            >
              {candidate.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {candidate.email}
          </p>
          {(candidate.currentTitle || candidate.currentCompany) && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {[candidate.currentTitle, candidate.currentCompany].filter(Boolean).join(' at ')}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right space-y-1">
          <p className="text-xs text-muted-foreground">
            {AVAILABILITY_LABELS[candidate.availabilityStatus]}
          </p>
          {candidate.experienceYears !== null && (
            <p className="text-xs text-muted-foreground">
              {candidate.experienceYears}y exp
            </p>
          )}
          {candidate.location && (
            <p className="text-xs text-muted-foreground truncate max-w-32">
              {candidate.location}
            </p>
          )}
        </div>
      </div>
      </div>

      {candidate.topSkills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {candidate.topSkills.slice(0, 5).map((cs) => (
            <Badge key={cs.id} variant="secondary" className="text-xs">
              {cs.skill.displayName}
            </Badge>
          ))}
          {candidate.topSkills.length > 5 && (
            <Badge variant="secondary" className="text-xs">
              +{candidate.topSkills.length - 5}
            </Badge>
          )}
        </div>
      )}
    </Link>
  );
}

function CandidateRowSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="space-y-1 text-right">
          <Skeleton className="h-3 w-24 ml-auto" />
          <Skeleton className="h-3 w-12 ml-auto" />
        </div>
      </div>
      <div className="flex gap-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const params: ListCandidatesParams = {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading, isError } = useCandidates(params);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const totalPages = data?.meta.totalPages ?? 1;

  const items = data?.data ?? [];
  const selection = useTableSelection<CandidateListItem>(items);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="Manage your candidate pipeline"
        breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Candidates' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/candidates/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Add candidate
            </Link>
          </Button>
        }
      />

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, title..."
          value={search}
          onChange={handleSearch}
          className="pl-9"
        />
      </div>

      {/* Results */}
      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">Failed to load candidates. Please try again.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <CandidateRowSkeleton key={i} />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No candidates found</p>
            {search ? (
              <p className="text-xs text-muted-foreground">
                Try a different search term or{' '}
                <button
                  onClick={() => setSearch('')}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  clear the search
                </button>
              </p>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/candidates/new">Add your first candidate</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {items.length > 0 && (
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <SelectionCheckbox
                checked={selection.isAllSelected}
                indeterminate={selection.isIndeterminate}
                onChange={(c) => (c ? selection.selectAll() : selection.clear())}
                aria-label={selection.isAllSelected ? 'Clear selection' : 'Select all visible'}
                stopPropagation={false}
              />
              <span>
                {selection.selectedCount > 0
                  ? `${selection.selectedCount} of ${items.length} selected`
                  : `Select all ${items.length} on this page`}
              </span>
            </div>
          )}

          <div className="space-y-3">
            {items.map((c) => (
              <CandidateRow
                key={c.id}
                candidate={c}
                isSelected={selection.isSelected(c.id)}
                onToggle={selection.toggle}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data?.meta.total} total &bull; page {page} of {totalPages}
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

      <CandidateBulkActions
        selectedIds={Array.from(selection.selectedIds)}
        selectedCount={selection.selectedCount}
        onClear={selection.clear}
      />
    </div>
  );
}
