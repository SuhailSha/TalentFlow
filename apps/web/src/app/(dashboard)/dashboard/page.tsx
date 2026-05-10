import type { Metadata } from 'next';

import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * Dashboard home — stub.
 *
 * Step 6 (Core Workflow) will implement:
 *   - KPI summary cards (open jobs, active candidates, pending submissions)
 *   - Recent activity feed
 *   - Quick actions (post job, add candidate, invite vendor)
 *   - Pipeline funnel chart
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your recruitment pipeline"
        breadcrumbs={[{ title: 'Dashboard' }]}
      />

      {/* KPI cards — placeholder skeleton layout */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <Skeleton className="h-4 w-24" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Implemented in Step 6</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Implemented in Step 6</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
