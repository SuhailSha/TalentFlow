'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Activity, Bell, BellOff, Calendar, CheckCircle2, CircleSlash, Edit,
  FileText, MessageSquare, Pause, Plus, Sparkles, Trash2, TrendingUp,
  UserPlus, XCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ActivityEntry, ActivityVerb } from '@/types/activity';

interface ActivityTimelineProps {
  entries:  ActivityEntry[];
  loading?: boolean;
  emptyMessage?: string;
  /** Optional render override for an individual entry's summary. */
  renderSummary?: (entry: ActivityEntry) => React.ReactNode;
  className?: string;
}

const VERB_LABEL: Record<ActivityVerb, string> = {
  created:           'created',
  updated:           'updated',
  deleted:           'deleted',
  status_changed:    'changed status',
  note_added:        'added a note',
  skill_added:       'added a skill',
  skill_removed:     'removed a skill',
  assigned:          'reassigned',
  scheduled:         'scheduled',
  cancelled:         'cancelled',
  feedback_submitted:'submitted feedback',
  invited:           'invited',
  placed:            'placed candidate',
  offer_extended:    'extended offer',
  passed:            'passed',
  failed:            'did not pass',
  no_show:           'marked no-show',
  acknowledged:      'acknowledged',
  snoozed:           'snoozed',
  dismissed:         'dismissed',
  reminder_completed:'completed reminder',
};

const VERB_ICON: Record<ActivityVerb, React.ComponentType<{ className?: string }>> = {
  created:            Plus,
  updated:            Edit,
  deleted:            Trash2,
  status_changed:     TrendingUp,
  note_added:         MessageSquare,
  skill_added:        Sparkles,
  skill_removed:      CircleSlash,
  assigned:           UserPlus,
  scheduled:          Calendar,
  cancelled:          XCircle,
  feedback_submitted: FileText,
  invited:            UserPlus,
  placed:             CheckCircle2,
  offer_extended:     TrendingUp,
  passed:             CheckCircle2,
  failed:             XCircle,
  no_show:            BellOff,
  acknowledged:       Bell,
  snoozed:            Pause,
  dismissed:          CircleSlash,
  reminder_completed: CheckCircle2,
};

const VERB_TONE: Record<ActivityVerb, string> = {
  created:            'bg-blue-100 text-blue-700',
  updated:            'bg-gray-100 text-gray-700',
  deleted:            'bg-red-100 text-red-700',
  status_changed:     'bg-purple-100 text-purple-700',
  note_added:         'bg-sky-100 text-sky-700',
  skill_added:        'bg-emerald-100 text-emerald-700',
  skill_removed:      'bg-gray-100 text-gray-600',
  assigned:           'bg-indigo-100 text-indigo-700',
  scheduled:          'bg-amber-100 text-amber-700',
  cancelled:          'bg-red-100 text-red-700',
  feedback_submitted: 'bg-teal-100 text-teal-700',
  invited:            'bg-blue-100 text-blue-700',
  placed:             'bg-green-100 text-green-700',
  offer_extended:     'bg-orange-100 text-orange-700',
  passed:             'bg-green-100 text-green-700',
  failed:             'bg-red-100 text-red-700',
  no_show:            'bg-rose-100 text-rose-700',
  acknowledged:       'bg-blue-100 text-blue-700',
  snoozed:            'bg-amber-100 text-amber-700',
  dismissed:          'bg-gray-100 text-gray-600',
  reminder_completed: 'bg-green-100 text-green-700',
};

function actorLabel(entry: ActivityEntry): string {
  if (entry.actorEmail) return entry.actorEmail.split('@')[0] ?? entry.actorEmail;
  return 'System';
}

function defaultSummary(entry: ActivityEntry): React.ReactNode {
  const verbLabel = VERB_LABEL[entry.verb] ?? entry.verb.replace(/_/g, ' ');
  const meta = entry.metadata as Record<string, unknown> | null;
  const after = entry.after as Record<string, unknown> | null;

  // Status change with from/to
  if (entry.verb === 'status_changed') {
    const from = meta?.fromStatus ?? meta?.from;
    const to   = meta?.toStatus   ?? meta?.to ?? after?.status;
    if (from && to) {
      return (
        <span>
          {verbLabel}: <span className="font-medium">{String(from)}</span> →{' '}
          <span className="font-medium">{String(to)}</span>
        </span>
      );
    }
  }

  // Note added — show first line if available
  if (entry.verb === 'note_added' && meta) {
    const content = meta.content ?? meta.noteContent;
    if (typeof content === 'string') {
      const firstLine = content.trim().split('\n')[0] ?? '';
      const trimmed = firstLine.slice(0, 120);
      return <span>{verbLabel}: <span className="text-muted-foreground">{trimmed}</span></span>;
    }
  }

  return <span>{verbLabel}</span>;
}

export function ActivityTimeline({
  entries, loading, emptyMessage = 'No activity yet.', renderSummary, className,
}: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground', className)}>
        <Activity className="h-4 w-4" />
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol className={cn('relative space-y-3 border-l border-border pl-4', className)}>
      {entries.map((entry) => {
        const Icon = VERB_ICON[entry.verb] ?? Activity;
        const tone = VERB_TONE[entry.verb] ?? 'bg-gray-100 text-gray-700';
        const summary = renderSummary ? renderSummary(entry) : defaultSummary(entry);
        return (
          <li key={entry.id} className="relative">
            <span className={cn(
              'absolute -left-[1.6rem] flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-background',
              tone,
            )}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="space-y-0.5 pl-2">
              <div className="text-sm">
                <span className="font-medium text-foreground">{actorLabel(entry)}</span>{' '}
                <span className="text-foreground">{summary}</span>
              </div>
              <div
                className="text-xs text-muted-foreground"
                title={new Date(entry.occurredAt).toLocaleString()}
              >
                {formatDistanceToNow(new Date(entry.occurredAt), { addSuffix: true })}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
