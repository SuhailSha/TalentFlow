'use client';

import { useState } from 'react';
import {
  Archive, ArrowRight, Bell, ChevronDown, UserPlus,
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
  useBulkAddReminderToSubmissions,
  useBulkArchiveSubmissions,
  useBulkAssignSubmissions,
  useBulkChangeSubmissionStatus,
} from '@/hooks/use-submissions-bulk';
import { useUsers } from '@/hooks/use-users-mgmt';
import { getApiErrorMessage } from '@/lib/api/client';
import { toast } from 'sonner';
import type { SubmissionStatus } from '@/types/submissions';

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview', OFFERED: 'Offered',
  PLACED: 'Placed', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
  ON_HOLD: 'On Hold', CLOSED: 'Closed',
};

/**
 * Statuses an admin would typically apply in bulk. Per-record FSM rules
 * still apply — partial-success surfaces failures for rows where the
 * transition isn't valid (e.g. can't move DRAFT directly to PLACED).
 */
const BULK_STATUS_OPTIONS: SubmissionStatus[] = [
  'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED',
  'ON_HOLD', 'REJECTED', 'WITHDRAWN', 'CLOSED',
];

interface SubmissionBulkActionsProps {
  selectedIds:   string[];
  selectedCount: number;
  onClear:       () => void;
}

export function SubmissionBulkActions({
  selectedIds, selectedCount, onClear,
}: SubmissionBulkActionsProps) {
  const [statusModal,   setStatusModal]   = useState<SubmissionStatus | null>(null);
  const [statusReason,  setStatusReason]  = useState('');
  const [assignModal,   setAssignModal]   = useState(false);
  const [assignTo,      setAssignTo]      = useState('');
  const [archiveModal,  setArchiveModal]  = useState(false);
  const [reminderModal, setReminderModal] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDueAt, setReminderDueAt] = useState('');

  const changeStatus = useBulkChangeSubmissionStatus();
  const assign       = useBulkAssignSubmissions();
  const archive      = useBulkArchiveSubmissions();
  const addReminder  = useBulkAddReminderToSubmissions();

  const { data: usersResp } = useUsers({ status: 'ACTIVE', limit: 100 });
  const users = usersResp?.data ?? [];

  const handleStatusChange = () => {
    if (!statusModal) return;
    changeStatus.mutate(
      { ids: selectedIds, status: statusModal, ...(statusReason && { reason: statusReason }) },
      {
        onSuccess: (result) => {
          notifyBulkResult(result, { verb: 'moved', resource: 'submission' });
          setStatusModal(null);
          setStatusReason('');
          if (result.failed === 0) onClear();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  const handleAssign = () => {
    if (!assignTo) return;
    assign.mutate(
      { ids: selectedIds, ownerId: assignTo },
      {
        onSuccess: (result) => {
          notifyBulkResult(result, { verb: 'reassigned', resource: 'submission' });
          setAssignModal(false);
          setAssignTo('');
          if (result.failed === 0) onClear();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  const handleArchive = () => {
    archive.mutate(
      { ids: selectedIds },
      {
        onSuccess: (result) => {
          notifyBulkResult(result, { verb: 'archived', resource: 'submission' });
          setArchiveModal(false);
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
          notifyBulkResult(result, { verb: 'added reminders to', resource: 'submission' });
          setReminderModal(false);
          setReminderTitle('');
          setReminderDueAt('');
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
        resourceLabel={selectedCount === 1 ? 'submission selected' : 'submissions selected'}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
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

        <Button size="sm" variant="outline" className="h-8" onClick={() => setAssignModal(true)}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Assign
        </Button>

        <Button size="sm" variant="outline" className="h-8" onClick={() => setReminderModal(true)}>
          <Bell className="mr-1.5 h-3.5 w-3.5" />
          Add reminder
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-700"
          onClick={() => setArchiveModal(true)}
        >
          <Archive className="mr-1.5 h-3.5 w-3.5" />
          Archive
        </Button>
      </BulkActionBar>

      {/* Status change dialog */}
      <BulkConfirmDialog
        open={statusModal !== null}
        onOpenChange={(o) => !o && setStatusModal(null)}
        title={statusModal ? `Move ${selectedCount} submission${selectedCount === 1 ? '' : 's'} to ${STATUS_LABELS[statusModal]}` : ''}
        description="Submissions where the FSM forbids this transition will be skipped with an explanation."
        confirmLabel="Move"
        destructive={statusModal === 'REJECTED' || statusModal === 'WITHDRAWN' || statusModal === 'CLOSED'}
        loading={changeStatus.isPending}
        onConfirm={handleStatusChange}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bulk-reason">Reason (optional)</Label>
          <Textarea
            id="bulk-reason"
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            rows={3}
            placeholder="Context applied to every selected submission"
          />
        </div>
      </BulkConfirmDialog>

      {/* Assign dialog */}
      <BulkConfirmDialog
        open={assignModal}
        onOpenChange={setAssignModal}
        title={`Reassign ${selectedCount} submission${selectedCount === 1 ? '' : 's'}`}
        confirmLabel="Reassign"
        loading={assign.isPending}
        onConfirm={handleAssign}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bulk-assign-to">New owner</Label>
          <select
            id="bulk-assign-to"
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select recruiter…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.email})
              </option>
            ))}
          </select>
        </div>
      </BulkConfirmDialog>

      {/* Archive dialog */}
      <BulkConfirmDialog
        open={archiveModal}
        onOpenChange={setArchiveModal}
        title={`Archive ${selectedCount} submission${selectedCount === 1 ? '' : 's'}`}
        description="Archived submissions are hidden from active lists but preserved for the audit trail."
        confirmLabel="Archive"
        destructive
        loading={archive.isPending}
        onConfirm={handleArchive}
      />

      {/* Add reminder dialog */}
      <BulkConfirmDialog
        open={reminderModal}
        onOpenChange={setReminderModal}
        title={`Add reminder to ${selectedCount} submission${selectedCount === 1 ? '' : 's'}`}
        confirmLabel="Create reminders"
        loading={addReminder.isPending}
        onConfirm={handleReminder}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bulk-reminder-title">Title</Label>
          <Input
            id="bulk-reminder-title"
            value={reminderTitle}
            onChange={(e) => setReminderTitle(e.target.value)}
            placeholder="e.g. Follow up on shortlist confirmation"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bulk-reminder-due">Due date (optional)</Label>
          <Input
            id="bulk-reminder-due"
            type="datetime-local"
            value={reminderDueAt}
            onChange={(e) => setReminderDueAt(e.target.value)}
          />
        </div>
      </BulkConfirmDialog>
    </>
  );
}
