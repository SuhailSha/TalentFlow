'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronDown, Clock, XCircle } from 'lucide-react';

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
  useBulkCompleteReminders,
  useBulkDismissReminders,
  useBulkSnoozeReminders,
} from '@/hooks/use-reminders-bulk';
import { getApiErrorMessage } from '@/lib/api/client';
import { toast } from 'sonner';

const SNOOZE_PRESETS: { label: string; minutes: number }[] = [
  { label: '1 hour',  minutes: 60 },
  { label: '4 hours', minutes: 240 },
  { label: '1 day',   minutes: 1440 },
  { label: '3 days',  minutes: 4320 },
  { label: '1 week',  minutes: 10080 },
];

interface ReminderBulkActionsProps {
  selectedIds:   string[];
  selectedCount: number;
  onClear:       () => void;
}

export function ReminderBulkActions({
  selectedIds, selectedCount, onClear,
}: ReminderBulkActionsProps) {
  const [snoozeMinutes, setSnoozeMinutes] = useState<number | null>(null);
  const [snoozeNote,    setSnoozeNote]    = useState('');
  const [completeOpen,  setCompleteOpen]  = useState(false);
  const [completeNote,  setCompleteNote]  = useState('');
  const [dismissOpen,   setDismissOpen]   = useState(false);
  const [dismissReason, setDismissReason] = useState('');

  const snooze   = useBulkSnoozeReminders();
  const complete = useBulkCompleteReminders();
  const dismiss  = useBulkDismissReminders();

  const handleSnooze = () => {
    if (snoozeMinutes === null) return;
    snooze.mutate(
      { ids: selectedIds, minutes: snoozeMinutes, ...(snoozeNote && { note: snoozeNote }) },
      {
        onSuccess: (result) => {
          notifyBulkResult(result, { verb: 'snoozed', resource: 'reminder' });
          setSnoozeMinutes(null);
          setSnoozeNote('');
          if (result.failed === 0) onClear();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  const handleComplete = () => {
    complete.mutate(
      { ids: selectedIds, ...(completeNote && { note: completeNote }) },
      {
        onSuccess: (result) => {
          notifyBulkResult(result, { verb: 'completed', resource: 'reminder' });
          setCompleteOpen(false);
          setCompleteNote('');
          if (result.failed === 0) onClear();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  const handleDismiss = () => {
    dismiss.mutate(
      { ids: selectedIds, ...(dismissReason && { reason: dismissReason }) },
      {
        onSuccess: (result) => {
          notifyBulkResult(result, { verb: 'dismissed', resource: 'reminder' });
          setDismissOpen(false);
          setDismissReason('');
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
        resourceLabel={selectedCount === 1 ? 'reminder selected' : 'reminders selected'}
      >
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-700"
          onClick={() => setCompleteOpen(true)}
        >
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
          Complete
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Snooze
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Snooze for</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SNOOZE_PRESETS.map((p) => (
              <DropdownMenuItem key={p.minutes} onClick={() => setSnoozeMinutes(p.minutes)}>
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="outline"
          className="h-8 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-700"
          onClick={() => setDismissOpen(true)}
        >
          <XCircle className="mr-1.5 h-3.5 w-3.5" />
          Dismiss
        </Button>
      </BulkActionBar>

      {/* Snooze dialog */}
      <BulkConfirmDialog
        open={snoozeMinutes !== null}
        onOpenChange={(o) => !o && setSnoozeMinutes(null)}
        title={`Snooze ${selectedCount} reminder${selectedCount === 1 ? '' : 's'}`}
        description={snoozeMinutes
          ? `Selected items will reappear in ${SNOOZE_PRESETS.find((p) => p.minutes === snoozeMinutes)?.label ?? `${snoozeMinutes} minutes`}.`
          : ''}
        confirmLabel="Snooze"
        loading={snooze.isPending}
        onConfirm={handleSnooze}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bulk-rem-snooze-note">Note (optional)</Label>
          <Textarea
            id="bulk-rem-snooze-note"
            value={snoozeNote}
            onChange={(e) => setSnoozeNote(e.target.value)}
            rows={2}
            placeholder="Why snooze? Recorded on each reminder activity log."
          />
        </div>
      </BulkConfirmDialog>

      {/* Complete dialog */}
      <BulkConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title={`Mark ${selectedCount} reminder${selectedCount === 1 ? '' : 's'} complete`}
        confirmLabel="Complete"
        loading={complete.isPending}
        onConfirm={handleComplete}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bulk-rem-complete-note">Resolution note (optional)</Label>
          <Textarea
            id="bulk-rem-complete-note"
            value={completeNote}
            onChange={(e) => setCompleteNote(e.target.value)}
            rows={2}
            placeholder="Recorded on each reminder activity log."
          />
        </div>
      </BulkConfirmDialog>

      {/* Dismiss dialog */}
      <BulkConfirmDialog
        open={dismissOpen}
        onOpenChange={setDismissOpen}
        title={`Dismiss ${selectedCount} reminder${selectedCount === 1 ? '' : 's'}`}
        description="Dismissed reminders are marked as ignored but kept for the audit trail."
        confirmLabel="Dismiss"
        destructive
        loading={dismiss.isPending}
        onConfirm={handleDismiss}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bulk-rem-dismiss-reason">Reason (optional)</Label>
          <Textarea
            id="bulk-rem-dismiss-reason"
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            rows={2}
            placeholder="Recorded on each reminder activity log."
          />
        </div>
      </BulkConfirmDialog>
    </>
  );
}
