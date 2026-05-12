'use client';

import { useState } from 'react';
import { ChevronDown, MessageSquare, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BulkActionBar, BulkConfirmDialog, notifyBulkResult,
} from '@/components/bulk';
import {
  useBulkAddInterviewNote,
  useBulkChangeInterviewStatus,
} from '@/hooks/use-interviews-bulk';
import { getApiErrorMessage } from '@/lib/api/client';
import { toast } from 'sonner';
import type { InterviewStatus } from '@/types/interviews';
import { INTERVIEW_STATUS_LABELS } from '@/types/interviews';
import type { NoteType } from '@/types/candidates';

/**
 * Bulk transitions a recruiter realistically applies to many interviews
 * at once. The per-record FSM still gates each transition; rejected
 * transitions surface as per-id failures in the result toast.
 */
const BULK_STATUS_OPTIONS: InterviewStatus[] = [
  'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
];

const REQUIRES_REASON = new Set<InterviewStatus>(['CANCELLED', 'NO_SHOW']);

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  NOTE: 'Note', CALL: 'Call', EMAIL: 'Email', MEETING: 'Meeting',
  STATUS_CHANGE: 'Status change', SYSTEM: 'System',
};

interface InterviewBulkActionsProps {
  selectedIds:   string[];
  selectedCount: number;
  onClear:       () => void;
}

export function InterviewBulkActions({
  selectedIds, selectedCount, onClear,
}: InterviewBulkActionsProps) {
  const [statusModal,  setStatusModal]  = useState<InterviewStatus | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [noteModal,    setNoteModal]    = useState(false);
  const [noteContent,  setNoteContent]  = useState('');
  const [noteType,     setNoteType]     = useState<NoteType>('NOTE');

  const changeStatus = useBulkChangeInterviewStatus();
  const addNote      = useBulkAddInterviewNote();

  const handleStatusChange = () => {
    if (!statusModal) return;
    if (REQUIRES_REASON.has(statusModal) && !statusReason.trim()) {
      toast.error(`A reason is required for ${INTERVIEW_STATUS_LABELS[statusModal]} transitions`);
      return;
    }
    changeStatus.mutate(
      { ids: selectedIds, status: statusModal, ...(statusReason && { reason: statusReason }) },
      {
        onSuccess: (result) => {
          notifyBulkResult(result, { verb: 'transitioned', resource: 'interview' });
          setStatusModal(null);
          setStatusReason('');
          if (result.failed === 0) onClear();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addNote.mutate(
      { ids: selectedIds, content: noteContent.trim(), noteType },
      {
        onSuccess: (result) => {
          notifyBulkResult(result, { verb: 'added notes to', resource: 'interview' });
          setNoteModal(false);
          setNoteContent('');
          setNoteType('NOTE');
          if (result.failed === 0) onClear();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  return (
    <>
      <BulkActionBar
        selectedCount={selectedCount}
        onClear={onClear}
        resourceLabel={selectedCount === 1 ? 'interview selected' : 'interviews selected'}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              Status
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {BULK_STATUS_OPTIONS.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatusModal(s)}>
                {INTERVIEW_STATUS_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" variant="outline" className="h-8" onClick={() => setNoteModal(true)}>
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Add note
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-700"
          onClick={() => setStatusModal('CANCELLED')}
        >
          <XCircle className="mr-1.5 h-3.5 w-3.5" />
          Cancel
        </Button>
      </BulkActionBar>

      {/* Status change dialog (also handles Cancel + No-Show with reason) */}
      <BulkConfirmDialog
        open={statusModal !== null}
        onOpenChange={(o) => !o && setStatusModal(null)}
        title={statusModal ? `Move ${selectedCount} interview${selectedCount === 1 ? '' : 's'} to ${INTERVIEW_STATUS_LABELS[statusModal]}` : ''}
        description={statusModal && REQUIRES_REASON.has(statusModal)
          ? 'A reason is required and will be recorded on each interview.'
          : 'Per-interview FSM rules still apply. Invalid transitions surface in the result toast.'}
        confirmLabel={statusModal === 'CANCELLED' ? 'Cancel interviews' : 'Apply'}
        destructive={statusModal === 'CANCELLED' || statusModal === 'NO_SHOW'}
        loading={changeStatus.isPending}
        onConfirm={handleStatusChange}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bulk-iv-reason">
            Reason
            {statusModal && REQUIRES_REASON.has(statusModal) && (
              <span className="ml-1 text-red-600">*</span>
            )}
          </Label>
          <Textarea
            id="bulk-iv-reason"
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            rows={3}
            placeholder={statusModal && REQUIRES_REASON.has(statusModal)
              ? 'Required for cancellation / no-show'
              : 'Optional context recorded as a system note'}
          />
        </div>
      </BulkConfirmDialog>

      {/* Add note dialog */}
      <BulkConfirmDialog
        open={noteModal}
        onOpenChange={setNoteModal}
        title={`Add note to ${selectedCount} interview${selectedCount === 1 ? '' : 's'}`}
        confirmLabel="Add notes"
        loading={addNote.isPending}
        onConfirm={handleAddNote}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bulk-iv-note-type">Type</Label>
          <select
            id="bulk-iv-note-type"
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as NoteType)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {(['NOTE', 'CALL', 'EMAIL', 'MEETING'] as NoteType[]).map((t) => (
              <option key={t} value={t}>{NOTE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bulk-iv-note-content">Content</Label>
          <Textarea
            id="bulk-iv-note-content"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={4}
            placeholder="Same note applied to every selected interview"
          />
        </div>
      </BulkConfirmDialog>
    </>
  );
}
