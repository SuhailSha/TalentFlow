'use client';

import { useQuery } from '@tanstack/react-query';

import {
  getAllPlans,
  getSeatStats,
  getSubscription,
  getUsageRecords,
} from '@/lib/api/subscription';

// ── Query key factory ──────────────────────────────────────────────────────────

export const subscriptionKeys = {
  all:    ['subscription']      as const,
  detail: ()                    => [...subscriptionKeys.all, 'detail']  as const,
  plans:  ()                    => [...subscriptionKeys.all, 'plans']   as const,
  usage:  ()                    => [...subscriptionKeys.all, 'usage']   as const,
  seats:  ()                    => [...subscriptionKeys.all, 'seats']   as const,
};

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useSubscription() {
  return useQuery({
    queryKey: subscriptionKeys.detail(),
    queryFn:  () => getSubscription(),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans(),
    queryFn:  () => getAllPlans(),
  });
}

export function useUsageRecords() {
  return useQuery({
    queryKey: subscriptionKeys.usage(),
    queryFn:  () => getUsageRecords(),
  });
}

export function useSeatStats() {
  return useQuery({
    queryKey: subscriptionKeys.seats(),
    queryFn:  () => getSeatStats(),
  });
}
