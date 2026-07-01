'use client';

import { CheckCheck, Settings2 } from 'lucide-react';
import { useState } from 'react';

import { InboxDetail } from '@/components/inbox/inbox-detail';
import { InboxEmptyState } from '@/components/inbox/inbox-empty-state';
import { InboxRow } from '@/components/inbox/inbox-row';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

/**
 * /inbox (TF-1-12) — two-pane inbox shell per approved mockup.
 *
 * List (left) + detail (right). Filter tabs across the top. Empty state
 * when no notifications match. Live-updates via SSE lands in Phase 4;
 * today we rely on TanStack Query's default refetch cadence.
 */

type FilterTab = 'all' | 'mentions' | 'assigned' | 'watching';

const TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all',       label: 'All' },
  { id: 'mentions',  label: 'Mentions' },
  { id: 'assigned',  label: 'Assigned to me' },
  { id: 'watching',  label: 'Watching' },
];

export default function InboxPage() {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // TF-1-12 ships the shell against the existing GET /notifications
  // endpoint. Categorization (mentions vs watching etc.) requires the
  // notification.category field landing in Phase 4; until then all
  // filters show the same list. The tabs are wired anyway so the
  // pattern is present.
  const { data, isLoading } = useNotifications(1, 50, filter !== 'all' ? false : false);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter((n) => n.readAt === null).length;
  const selected = notifications.find((n) => n.id === selectedId) ?? null;

  function handleSelect(id: string) {
    setSelectedId(id);
    const target = notifications.find((n) => n.id === id);
    if (target && target.readAt === null) {
      // Optimistic-ish: fire and forget. Mark-read is idempotent.
      markRead.mutate(id);
    }
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-56px)] flex-col">
      {/* Two-pane grid */}
      <div className="grid flex-1 grid-cols-[380px_1fr] overflow-hidden">
        {/* ── Left: list ─────────────────────────────────────────────── */}
        <div className="flex flex-col border-r bg-background">
          {/* List header */}
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-h1 font-semibold leading-tight">Inbox</h1>
                <p className="text-[11.5px] text-muted-foreground">
                  {unreadCount} unread · {notifications.length} total
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Mark all read"
                  disabled={unreadCount === 0}
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Preferences">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="mt-3 flex items-center gap-1">
              {TABS.map((t) => {
                const active = filter === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilter(t.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
                      active
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                    aria-pressed={active}
                  >
                    {t.label}
                    {t.id === 'all' && notifications.length > 0 && (
                      <span
                        className={cn(
                          'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] tabular-nums',
                          active ? 'bg-brand-100 text-brand-700' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {notifications.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List body */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isLoading && notifications.length === 0 && (
              <InboxEmptyState variant={filter === 'all' ? 'zero' : 'filtered'} />
            )}
            {!isLoading && notifications.map((n) => (
              <InboxRow
                key={n.id}
                notification={n}
                selected={n.id === selectedId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>

        {/* ── Right: detail ────────────────────────────────────────────── */}
        <div className="flex flex-col overflow-hidden bg-background">
          {selected ? (
            <InboxDetail notification={selected} />
          ) : (
            <div className="flex h-full items-center justify-center px-12 py-20">
              <div className="max-w-sm text-center text-muted-foreground">
                <h2 className="text-h2 font-semibold text-foreground">Select a notification</h2>
                <p className="mt-1 text-sm">
                  Choose an item from the list to read its full context and reply inline.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
