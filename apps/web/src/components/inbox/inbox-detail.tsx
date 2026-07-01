'use client';

import { format } from 'date-fns';
import { Archive, ArrowRight, MoreHorizontal, Clock as SnoozeIcon, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { NotificationView } from '@/types/notifications';

interface InboxDetailProps {
  notification: NotificationView;
  onArchive?: (id: string) => void;
  onSnooze?: (id: string) => void;
}

/**
 * Right-pane detail view. Approved mockup calls for: message body,
 * context block, inline reply. Reply box is a Phase 4 wiring point;
 * shown here as a static input so recruiters see the affordance.
 */
export function InboxDetail({ notification, onArchive, onSnooze }: InboxDetailProps) {
  const ts = format(new Date(notification.createdAt), 'PPPp');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 border-b px-6 py-4">
        <div className="min-w-0">
          <h2 className="text-h1 font-semibold leading-tight">
            {notification.title}
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">{ts}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive?.(notification.id)}
            aria-label="Archive"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSnooze?.(notification.id)}
            aria-label="Snooze"
          >
            <SnoozeIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="More">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {notification.body && (
          <div className="mb-6 whitespace-pre-wrap text-[14px] leading-relaxed">
            {notification.body}
          </div>
        )}

        {/* Context block — the mockup surfaces the related entities here.
            Until the notification model carries typed resource refs, we
            surface a lightweight placeholder. Phase 4 replaces this with
            live context (candidate + job + stage). */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Context
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
            <span className="text-muted-foreground">Channel</span>
            <span className="font-medium">{notification.channel}</span>
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{notification.status}</span>
            {notification.deliveredAt && (
              <>
                <span className="text-muted-foreground">Delivered</span>
                <span>{format(new Date(notification.deliveredAt), 'PPp')}</span>
              </>
            )}
            {notification.reminderId && (
              <>
                <span className="text-muted-foreground">Reminder</span>
                <span className="font-mono text-[11.5px]">
                  {notification.reminderId.slice(0, 8)}…
                </span>
              </>
            )}
          </div>
        </div>

        {/* Reply box — reserved wiring, Phase 4 */}
        <div className="mt-4 rounded-lg border p-4">
          <textarea
            placeholder="Reply inline…  (@mention teammates, ⌘↵ to send)"
            className="w-full resize-y bg-transparent text-[14px] leading-relaxed placeholder:text-muted-foreground focus:outline-none"
            rows={3}
            disabled
          />
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span className="text-[11px] text-muted-foreground">
              Reply lands in Phase 4 alongside SSE
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Draft with AI
              </Button>
              <Button size="sm" disabled>
                Send reply <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
