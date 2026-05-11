'use client';

import { format } from 'date-fns';
import { CreditCard, Loader2, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlans, useSeatStats, useSubscription, useUsageRecords } from '@/hooks/use-subscription';
import {
  SUBSCRIPTION_STATUS_LABELS,
  type SubscriptionStatus,
  type UsageMetric,
} from '@/types/settings';

// ── Status badge variant ───────────────────────────────────────────────────────

const subStatusVariant: Record<SubscriptionStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  TRIALING:  'secondary',
  ACTIVE:    'default',
  PAST_DUE:  'destructive',
  CANCELLED: 'outline',
  EXPIRED:   'destructive',
};

// ── Metric labels ──────────────────────────────────────────────────────────────

const USAGE_METRIC_LABELS: Record<UsageMetric, string> = {
  ACTIVE_SEATS:        'Active Seats',
  TOTAL_CANDIDATES:    'Total Candidates',
  ACTIVE_JOBS:         'Active Jobs',
  ACTIVE_VENDORS:      'Active Vendors',
  MONTHLY_SUBMISSIONS: 'Monthly Submissions',
  MONTHLY_INTERVIEWS:  'Monthly Interviews',
};

const DISPLAY_METRICS: UsageMetric[] = [
  'TOTAL_CANDIDATES',
  'ACTIVE_JOBS',
  'MONTHLY_SUBMISSIONS',
  'MONTHLY_INTERVIEWS',
];

// ── Seat progress bar ──────────────────────────────────────────────────────────

function SeatUsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{used} used</span>
        <span>{limit} seats</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{pct}% utilization</p>
    </div>
  );
}

// ── Current Plan Card ──────────────────────────────────────────────────────────

function CurrentPlanCard() {
  const { data: subscription, isLoading, error } = useSubscription();
  const { data: seatStats } = useSeatStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !subscription) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-destructive">Failed to load subscription details.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Current Plan</CardTitle>
          </div>
          <Badge variant={subStatusVariant[subscription.status]}>
            {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
          </Badge>
        </div>
        <CardDescription>{subscription.plan.description ?? subscription.plan.displayName}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{subscription.plan.displayName}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(subscription.currentPeriodStart), 'MMM d, yyyy')} —{' '}
              {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {subscription.seatsUsed} / {subscription.seatLimit} seats
              </span>
            </div>
          </div>
        </div>

        {/* Seat usage bar */}
        <SeatUsageBar
          used={seatStats?.seatsUsed ?? subscription.seatsUsed}
          limit={seatStats?.seatLimit ?? subscription.seatLimit}
        />
      </CardContent>
    </Card>
  );
}

// ── Usage Metrics ──────────────────────────────────────────────────────────────

function UsageMetricsCard() {
  const { data: usageRecords, isLoading } = useUsageRecords();
  const { data: subscription } = useSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Build a map of metric → latest value
  const metricMap = new Map<UsageMetric, number>();
  (usageRecords ?? []).forEach((r) => {
    // Keep the highest value per metric (latest period)
    if (!metricMap.has(r.metric) || metricMap.get(r.metric)! < r.value) {
      metricMap.set(r.metric, r.value);
    }
  });

  const plan = subscription?.plan;

  const limits: Partial<Record<UsageMetric, number | null>> = {
    TOTAL_CANDIDATES:    plan?.maxCandidates         ?? null,
    ACTIVE_JOBS:         plan?.maxActiveJobs          ?? null,
    MONTHLY_SUBMISSIONS: plan?.maxMonthlySubmissions  ?? null,
    MONTHLY_INTERVIEWS:  plan?.maxMonthlyInterviews   ?? null,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage This Period</CardTitle>
        <CardDescription>Current consumption against your plan limits</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {DISPLAY_METRICS.map((metric) => {
            const value = metricMap.get(metric) ?? 0;
            const limit = limits[metric];
            return (
              <div key={metric} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{USAGE_METRIC_LABELS[metric]}</p>
                {limit != null && (
                  <p className="text-xs text-muted-foreground">limit: {limit}</p>
                )}
                {limit == null && (
                  <p className="text-xs text-muted-foreground">Unlimited</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Plans Comparison ───────────────────────────────────────────────────────────

function PlansComparisonCard() {
  const { data: plans, isLoading } = usePlans();
  const { data: subscription } = useSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!plans || plans.length === 0) return null;

  const currentPlanCode = subscription?.plan.code;

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Plans</CardTitle>
        <CardDescription>Compare features and limits across available plans</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 text-left font-medium text-muted-foreground w-48">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.id} className="py-3 px-4 text-center font-medium">
                    <div className="flex flex-col items-center gap-1">
                      {plan.displayName}
                      {plan.code === currentPlanCode && (
                        <Badge variant="default" className="text-[10px]">Current</Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { label: 'Seats',                key: 'maxSeats'               as keyof typeof plans[0] },
                { label: 'Candidates',           key: 'maxCandidates'          as keyof typeof plans[0] },
                { label: 'Active Jobs',          key: 'maxActiveJobs'          as keyof typeof plans[0] },
                { label: 'Vendors',              key: 'maxVendors'             as keyof typeof plans[0] },
                { label: 'Monthly Submissions',  key: 'maxMonthlySubmissions'  as keyof typeof plans[0] },
                { label: 'Monthly Interviews',   key: 'maxMonthlyInterviews'   as keyof typeof plans[0] },
              ].map(({ label, key }) => (
                <tr key={label} className="hover:bg-muted/30">
                  <td className="py-2.5 text-muted-foreground">{label}</td>
                  {plans.map((plan) => {
                    const val = plan[key] as number | null;
                    return (
                      <td key={plan.id} className="py-2.5 px-4 text-center">
                        {val == null ? <span className="text-muted-foreground">∞</span> : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="hover:bg-muted/30">
                <td className="py-2.5 text-muted-foreground align-top">Features</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="py-2.5 px-4 text-center">
                    {plan.features.length > 0 ? (
                      <ul className="space-y-0.5">
                        {plan.features.map((f) => (
                          <li key={f} className="text-xs">
                            {f}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Subscription &amp; Billing</h2>
        <p className="text-sm text-muted-foreground">Your current plan and usage overview</p>
      </div>

      <CurrentPlanCard />
      <UsageMetricsCard />
      <PlansComparisonCard />
    </div>
  );
}
