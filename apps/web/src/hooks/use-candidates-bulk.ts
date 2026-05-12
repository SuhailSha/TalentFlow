'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  bulkAddCandidateNote,
  bulkAddCandidateReminder,
  bulkChangeCandidateStatus,
  bulkDeleteCandidates,
  type BulkAddCandidateNoteBody,
  type BulkAddCandidateReminderBody,
  type BulkChangeCandidateStatusBody,
  type BulkDeleteCandidatesBody,
} from '@/lib/api/candidates-bulk';
import { candidateKeys } from '@/hooks/use-candidates';
import { reminderKeys } from '@/hooks/use-reminders';

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: candidateKeys.all });
  qc.invalidateQueries({ queryKey: reminderKeys.all });
}

export function useBulkChangeCandidateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkChangeCandidateStatusBody) => bulkChangeCandidateStatus(body),
    onSettled:  () => invalidateAll(qc),
  });
}

export function useBulkAddCandidateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkAddCandidateNoteBody) => bulkAddCandidateNote(body),
    onSettled:  () => invalidateAll(qc),
  });
}

export function useBulkAddCandidateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkAddCandidateReminderBody) => bulkAddCandidateReminder(body),
    onSettled:  () => invalidateAll(qc),
  });
}

export function useBulkDeleteCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkDeleteCandidatesBody) => bulkDeleteCandidates(body),
    onSettled:  () => invalidateAll(qc),
  });
}
