'use client';

import {
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SelectionCheckbox, useTableSelection } from '@/components/bulk';
import {
  useAcknowledgeReminder,
  useCompleteReminder,
  useCreateReminder,
  useDeleteReminder,
  useDismissReminder,
  useReminders,
  useReminderStats,
  useReopenReminder,
  useSnoozeReminder,
} from '@/hooks/use-reminders';
import { ReminderBulkActions } from './bulk-actions';
import {
  REMINDER_PRIORITY_LABELS,
  REMINDER_STATUS_LABELS,
  REMINDER_TYPE_LABELS,
  type CreateReminderDto,
  type ListRemindersParams,
  type ReminderListItem,
  type ReminderPriority,
  type ReminderStatus,
  type ReminderType,
} from '@/types/reminders';
import { formatDistanceToNow } from 'date-fns';

const STATUSES: ReminderStatus[] = ['PENDING', 'ACKNOWLEDGED', 'SNOOZED', 'COMPLETED', 'DISMISSED', 'EXPIRED'];
const PRIORITIES: ReminderPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const statusVariant: Record<ReminderStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDING:      'default',
  ACKNOWLEDGED: 'secondary',
  SNOOZED:      'outline',
  COMPLETED:    'outline',
  DISMISSED:    'outline',
  EXPIRED:      'destructive',
};

const priorityVariant: Record<ReminderPriority, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  CRITICAL: 'destructive',
  HIGH:     'default',
  MEDIUM:   'secondary',
  LOW:      'outline',
};

// ── Create Reminder Dialog ─────────────────────────────────────────────────────

function CreateReminderDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<CreateReminderDto>({
    type:        'CUSTOM',
    title:       '',
    description: '',
    dueAt:       '',
    priority:    'MEDIUM',
  });
  const create = useCreateReminder();

  const handleSubmit = () => {
    create.mutate(
      { ...form, dueAt: form.dueAt || undefined, description: form.description || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>Create Reminder</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Select
            value={form.type}
            onValueChange={(v) => setForm(f => ({ ...f, type: v as ReminderType }))}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REMINDER_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Reminder title"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional description"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm(f => ({ ...f, priority: v as ReminderPriority }))}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => (
                  <SelectItem key={p} value={p}>{REMINDER_PRIORITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="dueAt">Due Date</Label>
            <Input
              id="dueAt"
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => setForm(f => ({ ...f, dueAt: e.target.value }))}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={!form.title.trim() || create.isPending}
        >
          {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Reminder
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Reminder Row ───────────────────────────────────────────────────────────────

interface ReminderRowProps {
  reminder:   ReminderListItem;
  isSelected: boolean;
  onToggle:   (id: string) => void;
}

function ReminderRow({ reminder, isSelected, onToggle }: ReminderRowProps) {
  const acknowledge = useAcknowledgeReminder();
  const complete    = useCompleteReminder();
  const snooze      = useSnoozeReminder();
  const dismiss     = useDismissReminder();
  const reopen      = useReopenReminder();
  const remove      = useDeleteReminder();

  const isActive = ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'].includes(reminder.status);

  return (
    <div className={`flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors ${isSelected ? 'border-primary/40 bg-primary/5' : 'hover:bg-accent/30'}`}>
      <span className="pt-1">
        <SelectionCheckbox
          checked={isSelected}
          onChange={() => onToggle(reminder.id)}
          stopPropagation={false}
          aria-label={`Select reminder ${reminder.title}`}
        />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Badge variant={priorityVariant[reminder.priority]} className="text-[10px]">
            {REMINDER_PRIORITY_LABELS[reminder.priority]}
          </Badge>
          <Badge variant={statusVariant[reminder.status]} className="text-[10px]">
            {REMINDER_STATUS_LABELS[reminder.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">{REMINDER_TYPE_LABELS[reminder.type]}</span>
        </div>

        <p className="text-sm font-medium leading-snug">{reminder.title}</p>

        {reminder.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{reminder.description}</p>
        )}

        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {reminder.dueAt && (
            <span>
              <Clock className="inline h-3 w-3 mr-0.5" />
              Due {formatDistanceToNow(new Date(reminder.dueAt), { addSuffix: true })}
            </span>
          )}
          <span>
            Created {formatDistanceToNow(new Date(reminder.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isActive && reminder.status === 'PENDING' && (
            <DropdownMenuItem onClick={() => acknowledge.mutate(reminder.id)}>
              <Bell className="mr-2 h-4 w-4" />
              Acknowledge
            </DropdownMenuItem>
          )}
          {isActive && (
            <>
              <DropdownMenuItem onClick={() => complete.mutate({ id: reminder.id })}>
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                Mark Complete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => snooze.mutate({ id: reminder.id, dto: { minutes: 60 } })}>
                <Clock className="mr-2 h-4 w-4" />
                Snooze 1 hour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => snooze.mutate({ id: reminder.id, dto: { minutes: 1440 } })}>
                <Clock className="mr-2 h-4 w-4" />
                Snooze 1 day
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => dismiss.mutate({ id: reminder.id })}
              >
                <X className="mr-2 h-4 w-4" />
                Dismiss
              </DropdownMenuItem>
            </>
          )}
          {!isActive && (
            <DropdownMenuItem onClick={() => reopen.mutate(reminder.id)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reopen
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => remove.mutate(reminder.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<ListRemindersParams>({
    page: 1, limit: 20, sortBy: 'dueAt', sortOrder: 'asc',
  });
  const [statusFilter, setStatusFilter] = useState<ReminderStatus | 'ALL'>('ALL');

  const params: ListRemindersParams = {
    ...filters,
    status: statusFilter === 'ALL' ? undefined : [statusFilter],
  };

  const { data, isLoading, isFetching, refetch } = useReminders(params);
  const { data: stats } = useReminderStats();

  const items = data?.data ?? [];
  const selection = useTableSelection<ReminderListItem>(items);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Reminders</h1>
            <p className="text-sm text-muted-foreground">Manage your tasks and follow-ups</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Reminder
        </Button>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Active',          value: stats.total },
            { label: 'Pending',         value: stats.pending },
            { label: 'Overdue',         value: stats.overdue,        danger: stats.overdue > 0 },
            { label: 'Critical',        value: stats.critical,       danger: stats.critical > 0 },
            { label: 'Completed Today', value: stats.completedToday, success: true },
          ].map(({ label, value, danger, success }) => (
            <Card key={label} className="p-3">
              <p className={`text-xl font-bold ${danger ? 'text-destructive' : success ? 'text-green-600' : ''}`}>
                {value}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ReminderStatus | 'ALL')}
        >
          <SelectTrigger className="w-40 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{REMINDER_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sortBy ?? 'dueAt'}
          onValueChange={(v) => setFilters(f => ({ ...f, sortBy: v as ListRemindersParams['sortBy'] }))}
        >
          <SelectTrigger className="w-36 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueAt">Sort: Due Date</SelectItem>
            <SelectItem value="priority">Sort: Priority</SelectItem>
            <SelectItem value="createdAt">Sort: Created</SelectItem>
            <SelectItem value="status">Sort: Status</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {data?.meta.total ?? 0} reminder{data?.meta.total !== 1 ? 's' : ''}
          </CardTitle>
          {items.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <SelectionCheckbox
                checked={selection.isAllSelected}
                indeterminate={selection.isIndeterminate}
                onChange={(c) => (c ? selection.selectAll() : selection.clear())}
                aria-label={selection.isAllSelected ? 'Clear selection' : 'Select all visible'}
                stopPropagation={false}
              />
              <span>
                {selection.selectedCount > 0
                  ? `${selection.selectedCount} of ${items.length} selected`
                  : `Select all ${items.length}`}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No reminders found
            </div>
          ) : (
            items.map(r => (
              <ReminderRow
                key={r.id}
                reminder={r}
                isSelected={selection.isSelected(r.id)}
                onToggle={selection.toggle}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <CreateReminderDialog onClose={() => setCreateOpen(false)} />
      </Dialog>

      <ReminderBulkActions
        selectedIds={Array.from(selection.selectedIds)}
        selectedCount={selection.selectedCount}
        onClear={selection.clear}
      />
    </div>
  );
}
