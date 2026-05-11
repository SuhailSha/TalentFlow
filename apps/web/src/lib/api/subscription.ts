import type { Plan, SeatStats, Subscription, UsageRecord } from '@/types/settings';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export async function getSubscription(): Promise<Subscription> {
  const { data } = await apiClient.get<ApiResponse<Subscription>>('/subscription');
  return data.data;
}

export async function getAllPlans(): Promise<Plan[]> {
  const { data } = await apiClient.get<ApiResponse<Plan[]>>('/subscription/plans');
  return data.data;
}

export async function getUsageRecords(): Promise<UsageRecord[]> {
  const { data } = await apiClient.get<ApiResponse<UsageRecord[]>>('/subscription/usage');
  return data.data;
}

export async function getSeatStats(): Promise<SeatStats> {
  const { data } = await apiClient.get<ApiResponse<SeatStats>>('/subscription/seats');
  return data.data;
}
