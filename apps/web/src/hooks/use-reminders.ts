'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acknowledgeReminder,
  completeReminder,
  createReminder,
  deleteReminder,
  dismissReminder,
  getActionCenter,
  getReminder,
  getReminderStats,
  listReminders,
  reopenReminder,
  snoozeReminder,
  updateReminder,
} from '@/lib/api/reminders';
import type {
  CompleteReminderDto,
  CreateReminderDto,
  DismissReminderDto,
  ListRemindersParams,
  SnoozeReminderDto,
  UpdateReminderDto,
} from '@/types/reminders';

// ── Query key factory ──────────────────────────────────────────────────────────

export const reminderKeys = {
  all:          ['reminders']                   as const,
  lists:        ()                              => [...reminderKeys.all, 'list']         as const,
  list:         (p: ListRemindersParams)        => [...reminderKeys.lists(), p]          as const,
  details:      ()                              => [...reminderKeys.all, 'detail']       as const,
  detail:       (id: string)                    => [...reminderKeys.details(), id]       as const,
  stats:        ()                              => [...reminderKeys.all, 'stats']        as const,
  actionCenter: ()                              => [...reminderKeys.all, 'action-center'] as const,
};

// ── Query hooks ───────────────────────────────────────────────────────────────

export function useReminders(params: ListRemindersParams = {}) {
  return useQuery({
    queryKey: reminderKeys.list(params),
    queryFn:  () => listReminders(params),
  });
}

export function useReminder(id: string) {
  return useQuery({
    queryKey: reminderKeys.detail(id),
    queryFn:  () => getReminder(id),
    enabled:  !!id,
  });
}

export function useReminderStats() {
  return useQuery({
    queryKey: reminderKeys.stats(),
    queryFn:  () => getReminderStats(),
    refetchInterval: 60_000,
  });
}

export function useActionCenter() {
  return useQuery({
    queryKey: reminderKeys.actionCenter(),
    queryFn:  () => getActionCenter(),
    refetchInterval: 60_000,
  });
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateReminderDto) => createReminder(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.stats() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.actionCenter() });
    },
  });
}

export function useUpdateReminder(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateReminderDto) => updateReminder(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.stats() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.actionCenter() });
    },
  });
}

export function useAcknowledgeReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => acknowledgeReminder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: reminderKeys.actionCenter() });
    },
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: CompleteReminderDto }) =>
      completeReminder(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.stats() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.actionCenter() });
    },
  });
}

export function useSnoozeReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SnoozeReminderDto }) =>
      snoozeReminder(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: reminderKeys.actionCenter() });
    },
  });
}

export function useDismissReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: DismissReminderDto }) =>
      dismissReminder(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.stats() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.actionCenter() });
    },
  });
}

export function useReopenReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reopenReminder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reminderKeys.actionCenter() });
    },
  });
}
