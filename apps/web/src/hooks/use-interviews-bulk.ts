'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  bulkAddInterviewNote,
  bulkChangeInterviewStatus,
  type BulkAddInterviewNoteBody,
  type BulkChangeInterviewStatusBody,
} from '@/lib/api/interviews-bulk';
import { interviewKeys } from '@/hooks/use-interviews';

export function useBulkChangeInterviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkChangeInterviewStatusBody) => bulkChangeInterviewStatus(body),
    onSettled:  () => { qc.invalidateQueries({ queryKey: interviewKeys.all }); },
  });
}

export function useBulkAddInterviewNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkAddInterviewNoteBody) => bulkAddInterviewNote(body),
    onSettled:  () => { qc.invalidateQueries({ queryKey: interviewKeys.all }); },
  });
}
