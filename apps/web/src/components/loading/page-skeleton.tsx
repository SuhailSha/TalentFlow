'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PageSkeletonProps {
  /** Show page header skeleton */
  showHeader?: boolean;
  /** Show action buttons in header */
  showActions?: boolean;
  /** Number of content rows to show */
  rows?: number;
  /** Show sidebar-style content */
  showSidebar?: boolean;
  /** Custom className */
  className?: string;
}

export function PageSkeleton({
  showHeader = true,
  showActions = true,
  rows = 5,
  showSidebar = false,
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6 animate-pulse', className)}>
      {/* Page Header Skeleton */}
      {showHeader && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" /> {/* Title */}
              <Skeleton className="h-4 w-96" /> {/* Description */}
            </div>
            {showActions && (
              <div className="flex space-x-2">
                <Skeleton className="h-9 w-20" /> {/* Button */}
                <Skeleton className="h-9 w-24" /> {/* Button */}
              </div>
            )}
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-16" />
            <span className="text-muted-foreground">/</span>
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className={cn('space-y-4', showSidebar && 'flex space-x-6 space-y-0')}>
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Filter/Search Bar */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-64" /> {/* Search */}
            <div className="flex space-x-2">
              <Skeleton className="h-9 w-20" /> {/* Filter */}
              <Skeleton className="h-9 w-20" /> {/* Filter */}
            </div>
          </div>

          {/* Content Rows */}
          <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
              <ContentRowSkeleton key={i} variant={i % 3 === 0 ? 'wide' : 'normal'} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ContentRowSkeletonProps {
  variant?: 'normal' | 'wide' | 'compact';
}

function ContentRowSkeleton({ variant = 'normal' }: ContentRowSkeletonProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Avatar/Icon */}
          <Skeleton className="h-10 w-10 rounded-full" />

          {/* Content */}
          <div className="space-y-2">
            <Skeleton
              className={cn(
                'h-4',
                variant === 'wide' ? 'w-48' : variant === 'compact' ? 'w-24' : 'w-36',
              )}
            />
            <Skeleton
              className={cn(
                'h-3',
                variant === 'wide' ? 'w-64' : variant === 'compact' ? 'w-32' : 'w-48',
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-6 w-16 rounded-full" /> {/* Badge */}
          <Skeleton className="h-8 w-8 rounded" /> {/* Icon button */}
        </div>
      </div>

      {/* Additional content for wide variant */}
      {variant === 'wide' && (
        <div className="mt-4 space-y-2">
          <div className="flex space-x-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
      )}
    </div>
  );
}

/** Dashboard-specific skeleton */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts/Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-48 w-full rounded" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-28" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Table skeleton for data tables */
export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4 rounded" /> {/* Checkbox */}
                  <Skeleton className="h-8 w-8 rounded-full" /> {/* Avatar */}
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-6 w-20 rounded-full" /> {/* Status */}
                  <Skeleton className="h-4 w-16" /> {/* Date */}
                  <Skeleton className="h-8 w-8 rounded" /> {/* Actions */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}
