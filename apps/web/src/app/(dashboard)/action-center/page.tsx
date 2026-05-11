'use client';

import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useAcknowledgeReminder,
  useActionCenter,
  useCompleteReminder,
  useSnoozeReminder,
} from '@/hooks/use-reminders';
import {
  REMINDER_PRIORITY_LABELS,
  REMINDER_TYPE_LABELS,
  type ReminderListItem,
  type ReminderPriority,
} from '@/types/reminders';
import { formatDistanceToNow, isPast } from 'date-fns';

const priorityBadgeVariant: Record<ReminderPriority, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  CRITICAL: 'destructive',
  HIGH:     'default',
  MEDIUM:   'secondary',
  LOW:      'outline',
};

function ReminderCard({ reminder }: { reminder: ReminderListItem }) {
  const acknowledge = useAcknowledgeReminder();
  const complete    = useCompleteReminder();
  const snooze      = useSnoozeReminder();

  const isOverdue = reminder.dueAt && isPast(new Date(reminder.dueAt)) && reminder.status !== 'COMPLETED';

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Badge variant={priorityBadgeVariant[reminder.priority]} className="text-[10px]">
            {REMINDER_PRIORITY_LABELS[reminder.priority]}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {REMINDER_TYPE_LABELS[reminder.type]}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
          )}
        </div>

        <p className="text-sm font-medium leading-snug">{reminder.title}</p>

        {reminder.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{reminder.description}</p>
        )}

        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          {reminder.dueAt && (
            <span className={isOverdue ? 'text-destructive' : ''}>
              <Clock className="inline h-3 w-3 mr-0.5" />
              Due {formatDistanceToNow(new Date(reminder.dueAt), { addSuffix: true })}
            </span>
          )}
          {reminder.candidate && (
            <Link
              href={`/candidates/${reminder.candidate.id}`}
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {reminder.candidate.firstName} {reminder.candidate.lastName}
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {reminder.status === 'PENDING' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Acknowledge"
            disabled={acknowledge.isPending}
            onClick={() => acknowledge.mutate(reminder.id)}
          >
            <Bell className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Snooze 1 hour"
          disabled={snooze.isPending}
          onClick={() => snooze.mutate({ id: reminder.id, dto: { minutes: 60 } })}
        >
          <Clock className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-green-600 hover:text-green-700"
          title="Mark complete"
          disabled={complete.isPending}
          onClick={() => complete.mutate({ id: reminder.id })}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SectionEmpty({ label }: { label: string }) {
  return (
    <div className="py-6 text-center text-sm text-muted-foreground">
      No {label} reminders
    </div>
  );
}

export default function ActionCenterPage() {
  const { data, isLoading, refetch, isFetching } = useActionCenter();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { stats, sections } = data ?? {
    stats:    { total: 0, overdue: 0, dueToday: 0, upcoming: 0, pendingFeedback: 0, critical: 0 },
    sections: { overdue: [], dueToday: [], upcoming: [], pendingFeedback: [] },
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Action Center</h1>
            <p className="text-sm text-muted-foreground">Your pending tasks and reminders</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/reminders">
            <Button variant="outline" size="sm">View All Reminders</Button>
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Active',     value: stats.total,          icon: Bell,         className: '' },
          { label: 'Overdue',          value: stats.overdue,        icon: AlertCircle,  className: stats.overdue   > 0 ? 'text-destructive' : '' },
          { label: 'Due Today',        value: stats.dueToday,       icon: Clock,        className: stats.dueToday  > 0 ? 'text-orange-600' : '' },
          { label: 'Upcoming (7d)',    value: stats.upcoming,       icon: RefreshCw,    className: '' },
          { label: 'Feedback Pending', value: stats.pendingFeedback,icon: Bell,         className: stats.pendingFeedback > 0 ? 'text-amber-600' : '' },
          { label: 'Critical',         value: stats.critical,       icon: AlertCircle,  className: stats.critical  > 0 ? 'text-destructive font-bold' : '' },
        ].map(({ label, value, icon: Icon, className }) => (
          <Card key={label} className="p-3">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 text-muted-foreground ${className}`} />
              <div>
                <p className={`text-xl font-bold leading-none ${className}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Overdue
              {sections.overdue.length > 0 && (
                <Badge variant="destructive" className="ml-auto">{sections.overdue.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sections.overdue.length === 0
              ? <SectionEmpty label="overdue" />
              : sections.overdue.map(r => <ReminderCard key={r.id} reminder={r} />)
            }
          </CardContent>
        </Card>

        {/* Due Today */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-orange-600" />
              Due Today
              {sections.dueToday.length > 0 && (
                <Badge className="ml-auto bg-orange-100 text-orange-700 border-orange-200">
                  {sections.dueToday.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sections.dueToday.length === 0
              ? <SectionEmpty label="due today" />
              : sections.dueToday.map(r => <ReminderCard key={r.id} reminder={r} />)
            }
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              Upcoming (Next 7 Days)
              {sections.upcoming.length > 0 && (
                <Badge variant="secondary" className="ml-auto">{sections.upcoming.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sections.upcoming.length === 0
              ? <SectionEmpty label="upcoming" />
              : sections.upcoming.map(r => <ReminderCard key={r.id} reminder={r} />)
            }
          </CardContent>
        </Card>

        {/* Pending Feedback */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-amber-600" />
              Pending Feedback
              {sections.pendingFeedback.length > 0 && (
                <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200">
                  {sections.pendingFeedback.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sections.pendingFeedback.length === 0
              ? <SectionEmpty label="pending feedback" />
              : sections.pendingFeedback.map(r => <ReminderCard key={r.id} reminder={r} />)
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
