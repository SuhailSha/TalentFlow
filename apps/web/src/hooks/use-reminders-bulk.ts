'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  bulkCompleteReminders,
  bulkDismissReminders,
  bulkSnoozeReminders,
  type BulkCompleteRemindersBody,
  type BulkDismissRemindersBody,
  type BulkSnoozeRemindersBody,
} from '@/lib/api/reminders-bulk';
import { reminderKeys } from '@/hooks/use-reminders';

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: reminderKeys.all });
}

export function useBulkSnoozeReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkSnoozeRemindersBody) => bulkSnoozeReminders(body),
    onSettled:  () => invalidate(qc),
  });
}

export function useBulkCompleteReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkCompleteRemindersBody) => bulkCompleteReminders(body),
    onSettled:  () => invalidate(qc),
  });
}

export function useBulkDismissReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkDismissRemindersBody) => bulkDismissReminders(body),
    onSettled:  () => invalidate(qc),
  });
}
