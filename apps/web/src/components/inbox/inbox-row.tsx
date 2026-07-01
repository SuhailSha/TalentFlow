'use client';

import { formatDistanceToNow } from 'date-fns';
import { Archive, MoreHorizontal, Clock as SnoozeIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { NotificationView } from '@/types/notifications';

interface InboxRowProps {
  notification: NotificationView;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onArchive?: (id: string) => void;
  onSnooze?: (id: string) => void;
}

/**
 * Inbox list row — matches the approved mockup (inbox.html). Left rail
 * variant: unread dot, avatar block, title + body excerpt, timestamp.
 * Hover reveals archive / snooze / more actions.
 */
export function InboxRow({
  notification,
  selected = false,
  onSelect,
  onArchive,
  onSnooze,
}: InboxRowProps) {
  const isUnread = notification.readAt === null;
  const ts = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: false });

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect?.(notification.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(notification.id);
        }
      }}
      className={cn(
        'group relative grid cursor-pointer grid-cols-[12px_32px_1fr_auto] items-start gap-2.5 border-b border-border/60 px-4 py-3 transition-colors',
        selected
          ? 'bg-brand-50 dark:bg-brand-500/10'
          : isUnread
            ? 'bg-brand-50/30 hover:bg-muted/60 dark:bg-brand-500/[0.06]'
            : 'hover:bg-muted/60',
        selected && 'border-l-2 border-l-brand-500 pl-[14px]',
      )}
    >
      {/* Unread dot column */}
      <span className="mt-2">
        {isUnread && (
          <span
            aria-label="Unread"
            className="block h-2 w-2 rounded-full bg-brand-500"
          />
        )}
      </span>

      {/* Avatar placeholder — first char of title */}
      <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
        {(notification.title[0] ?? 'N').toUpperCase()}
      </div>

      {/* Body */}
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium leading-tight">
          {notification.title}
        </div>
        {notification.body && (
          <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            {notification.body}
          </div>
        )}
      </div>

      {/* Timestamp + hover actions */}
      <div className="flex flex-col items-end gap-1.5">
        <span className="whitespace-nowrap text-[11px] text-muted-foreground">
          {ts}
        </span>
        {/* Hover actions — hidden until row hover; keyboard-accessible via focus */}
        <div className="hidden gap-0.5 group-hover:flex group-focus-within:flex">
          <button
            type="button"
            aria-label="Archive"
            onClick={(e) => { e.stopPropagation(); onArchive?.(notification.id); }}
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-border hover:text-foreground"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Snooze"
            onClick={(e) => { e.stopPropagation(); onSnooze?.(notification.id); }}
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-border hover:text-foreground"
          >
            <SnoozeIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="More"
            onClick={(e) => e.stopPropagation()}
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-border hover:text-foreground"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
