'use client';

import { useState } from 'react';
import {
  Bell, ChevronDown, MessageSquare, Trash2, UserCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BulkActionBar, BulkConfirmDialog, notifyBulkResult,
} from '@/components/bulk';
import {
  useBulkAddCandidateNote,
  useBulkAddCandidateReminder,
  useBulkChangeCandidateStatus,
  useBulkDeleteCandidates,
} from '@/hooks/use-candidates-bulk';
import { getApiErrorMessage } from '@/lib/api/client';
import { toast } from 'sonner';
import type { CandidateStatus, NoteType } from '@/types/candidates';

const STATUS_LABELS: Record<CandidateStatus, string> = {
  ACTIVE:      'Active',
  AVAILABLE:   'Available',
  INACTIVE:    'Inactive',
  PLACED:      'Placed',
  BLACKLISTED: 'Blacklisted',
};

const BULK_STATUS_OPTIONS: CandidateStatus[] = [
  'ACTIVE', 'AVAILABLE', 'INACTIVE', 'PLACED', 'BLACKLISTED',
];

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  NOTE: 'Note', CALL: 'Call', EMAIL: 'Email', MEETING: 'Meeting',
  STATUS_CHANGE: 'Status change', SYSTEM: 'System',
};

interface CandidateBulkActionsProps {
  selectedIds:   string[];
  selectedCount: number;
  onClear:       () => void;
}

export function CandidateBulkActions({
  selectedIds, selectedCount, onClear,
}: CandidateBulkActionsProps) {
  const [statusModal,   setStatusModal]   = useState<CandidateStatus | null>(null);
  const [statusReason,  setStatusReason]  = useState('');
  const [noteModal,     setNoteModal]     = useState(false);
  const [noteContent,   setNoteContent]   = useState('');
  const [noteType,      setNoteType]      = useState<NoteType>('NOTE');
  const [reminderModal, setReminderModal] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDueAt, setReminderDueAt] = useState('');
  const [deleteModal,   setDeleteModal]   = useState(false);

  const changeStatus = useBulkChangeCandidateStatus();
  const addNote      = useBulkAddCandidateNote();
  const addReminder  = useBulkAddCandidateReminder();
  const softDelete   = useBulkDeleteCandidates();

  const handleStatusChange = () => {
    if (!statusModal) return;
    changeStatus.mutate(
      { ids: selectedIds, status: statusModal, ...(statusReason && { reason: statusReason }) },
      {
        onSuccess: (result) => {
          notifyBulkResult(result, { verb: 'moved', resource: 'candidate' });
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
          notifyBulkResult(result, { verb: 'added notes to', resource: 'candidate' });
          setNoteModal(false);
          setNoteContent('');
          setNoteType('NOTE');
          if (result.failed === 0) onClear();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  const handleReminder = () => {
    if (!reminderTitle.trim()) return;
    addReminder.mutate(
      {
        ids:    selectedIds,
        type:   'RECRUITER_ACTION_REQUIRED',
        title:  reminderTitle.trim(),
        ...(reminderDueAt && { dueAt: new Date(reminderDueAt).toISOString() }),
      },
      {
        onSuccess: (result) => {
          notifyBulkResult(result, { verb: 'added reminders to', resource: 'candidate' });
          setReminderModal(false);
          setReminderTitle('');
          setReminderDueAt('');
          if (result.failed === 0) onClear();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  const handleDelete = () => {
    softDelete.mutate(
      { ids: selectedIds },
      {
        onSuccess: (result) => {
          notifyBulkResult(result, { verb: 'deleted', resource: 'candidate' });
          setDeleteModal(false);
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
        resourceLabel={selectedCount === 1 ? 'candidate selected' : 'candidates selected'}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              <UserCheck className="mr-1.5 h-3.5 w-3.5" />
              Change status
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {BULK_STATUS_OPTIONS.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatusModal(s)}>
                {STATUS_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" variant="outline" className="h-8" onClick={() => setNoteModal(true)}>
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Add note
        </Button>

        <Button size="sm" variant="outline" className="h-8" onClick={() => setReminderModal(true)}>
          <Bell className="mr-1.5 h-3.5 w-3.5" />
          Add reminder
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-700"
          onClick={() => setDeleteModal(true)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </BulkActionBar>

      {/* Status change dialog */}
      <BulkConfirmDialog
        open={statusModal !== null}
        onOpenChange={(o) => !o && setStatusModal(null)}
        title={statusModal ? `Move ${selectedCount} candidate${selectedCount === 1 ? '' : 's'} to ${STATUS_LABELS[statusModal]}` : ''}
        description="Status FSM rules still apply per candidate. Any rejected transitions surface in the result toast."
        confirmLabel="Move"
        destructive={statusModal === 'BLACKLISTED' || statusModal === 'INACTIVE'}
        loading={changeStatus.isPending}
        onConfirm={handleStatusChange}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bulk-cand-reason">Reason (optional)</Label>
          <Textarea
            id="bulk-cand-reason"
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            rows={3}
            placeholder="Recorded as a STATUS_CHANGE note on each candidate"
          />
        </div>
      </BulkConfirmDialog>

      {/* Add note dialog */}
      <BulkConfirmDialog
        open={noteModal}
        onOpenChange={setNoteModal}
        title={`Add note to ${selectedCount} candidate${selectedCount === 1 ? '' : 's'}`}
        confirmLabel="Add notes"
        loading={addNote.isPending}
        onConfirm={handleAddNote}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bulk-cand-note-type">Type</Label>
          <select
            id="bulk-cand-note-type"
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
          <Label htmlFor="bulk-cand-note-content">Content</Label>
          <Textarea
            id="bulk-cand-note-content"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={4}
            placeholder="Same note text applied to every selected candidate"
          />
        </div>
      </BulkConfirmDialog>

      {/* Add reminder dialog */}
      <BulkConfirmDialog
        open={reminderModal}
        onOpenChange={setReminderModal}
        title={`Add reminder to ${selectedCount} candidate${selectedCount === 1 ? '' : 's'}`}
        confirmLabel="Create reminders"
        loading={addReminder.isPending}
        onConfirm={handleReminder}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bulk-cand-rem-title">Title</Label>
          <Input
            id="bulk-cand-rem-title"
            value={reminderTitle}
            onChange={(e) => setReminderTitle(e.target.value)}
            placeholder="e.g. Re-engage candidate"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bulk-cand-rem-due">Due date (optional)</Label>
          <Input
            id="bulk-cand-rem-due"
            type="datetime-local"
            value={reminderDueAt}
            onChange={(e) => setReminderDueAt(e.target.value)}
          />
        </div>
      </BulkConfirmDialog>

      {/* Delete dialog */}
      <BulkConfirmDialog
        open={deleteModal}
        onOpenChange={setDeleteModal}
        title={`Delete ${selectedCount} candidate${selectedCount === 1 ? '' : 's'}`}
        description="Soft-delete. Candidates are hidden from active lists but retained for the audit trail."
        confirmLabel="Delete"
        destructive
        loading={softDelete.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
