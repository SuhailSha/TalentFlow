'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  bulkAddReminderToSubmissions,
  bulkArchiveSubmissions,
  bulkAssignSubmissions,
  bulkChangeSubmissionStatus,
  type BulkAddReminderBody,
  type BulkArchiveBody,
  type BulkAssignOwnerBody,
  type BulkChangeStatusBody,
} from '@/lib/api/submissions-bulk';
import { submissionKeys } from '@/hooks/use-submissions';
import { reminderKeys } from '@/hooks/use-reminders';

/**
 * After any bulk write, invalidate the submission caches AND the reminder
 * caches (some operations create reminders). One place, no per-hook drift.
 */
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: submissionKeys.all });
  qc.invalidateQueries({ queryKey: reminderKeys.all });
}

export function useBulkChangeSubmissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkChangeStatusBody) => bulkChangeSubmissionStatus(body),
    onSettled:  () => invalidateAll(qc),
  });
}

export function useBulkAssignSubmissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkAssignOwnerBody) => bulkAssignSubmissions(body),
    onSettled:  () => invalidateAll(qc),
  });
}

export function useBulkArchiveSubmissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkArchiveBody) => bulkArchiveSubmissions(body),
    onSettled:  () => invalidateAll(qc),
  });
}

export function useBulkAddReminderToSubmissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkAddReminderBody) => bulkAddReminderToSubmissions(body),
    onSettled:  () => invalidateAll(qc),
  });
}
