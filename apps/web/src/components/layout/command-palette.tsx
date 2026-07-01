'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, Briefcase, Building2, Calendar, Clock,
  Home, Inbox, LayoutDashboard, Plus, Send, Settings, Sparkles, User, Users,
} from 'lucide-react';

import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command';
import { useDebounce } from '@/hooks/use-debounce';
import { useRecentRecords, type RecentRecord } from '@/hooks/use-recent-records';
import { useSearch } from '@/hooks/use-search';
import type { SearchResultType } from '@/types/search';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_ICON: Record<SearchResultType, React.ComponentType<{ className?: string }>> = {
  candidate:  User,
  job:        Briefcase,
  vendor:     Building2,
  submission: Send,
};

const TYPE_LABEL: Record<SearchResultType, string> = {
  candidate:  'Candidates',
  job:        'Jobs',
  vendor:     'Vendors',
  submission: 'Submissions',
};

// Entity-prefix routing. Typing `c:sarah` filters the search to candidates,
// `j:REQ-0014` filters to jobs, etc. Prefixes match the create-shortcut
// letters so the mnemonic is uniform across the palette.
const PREFIX_MAP: Record<string, SearchResultType> = {
  c: 'candidate',
  j: 'job',
  s: 'submission',
  v: 'vendor',
};

function parseQuery(raw: string): { types: SearchResultType[] | null; term: string } {
  const trimmed = raw.trim();
  const match = /^([cjsv]):(.*)$/i.exec(trimmed);
  if (match) {
    const prefix = match[1]!.toLowerCase();
    const term   = match[2]!.trim();
    const type   = PREFIX_MAP[prefix];
    return { types: type ? [type] : null, term };
  }
  return { types: null, term: trimmed };
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { term, types } = useMemo(() => parseQuery(query), [query]);
  const debounced = useDebounce(term, 200);
  const { data: rawResults = [], isFetching } = useSearch(debounced, open);
  const { recents, add: recordRecent } = useRecentRecords();

  // Apply the entity-prefix filter on the client. The server already
  // returns a mixed result set; we narrow before grouping so a `c:` prefix
  // hides every non-candidate row.
  const results = useMemo(
    () => (types ? rawResults.filter((r) => types.includes(r.type)) : rawResults),
    [rawResults, types],
  );

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function go(href: string, record?: Omit<RecentRecord, 'visitedAt'>) {
    onOpenChange(false);
    if (record) recordRecent(record);
    router.push(href);
  }

  // Group results by type for the sectioned view.
  const grouped = results.reduce<Record<SearchResultType, typeof results>>(
    (acc, r) => {
      (acc[r.type] ??= []).push(r);
      return acc;
    },
    { candidate: [], job: [], vendor: [], submission: [] },
  );

  const hasQuery   = term.length > 0;
  const hasResults = results.length > 0;
  const showRecents = !hasQuery && recents.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search or jump to…  (try c:sarah  ·  j:REQ-0014  ·  ⌘K)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {hasQuery && !isFetching && !hasResults && (
          <CommandEmpty>
            No matches for &quot;{query}&quot;.
            {types && (
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Filtered to {TYPE_LABEL[types[0]!].toLowerCase()}. Remove the prefix to widen.
              </span>
            )}
          </CommandEmpty>
        )}

        {/* Recent records — shown only when the query is empty */}
        {showRecents && (
          <>
            <CommandGroup heading="Recent">
              {recents.map((r) => {
                const Icon = TYPE_ICON[r.type];
                return (
                  <CommandItem
                    key={`${r.type}:${r.id}`}
                    value={`recent ${r.title} ${r.subtitle ?? ''}`}
                    onSelect={() => go(r.href)}
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="truncate font-medium">{r.title}</span>
                      {r.subtitle && (
                        <span className="truncate text-xs text-muted-foreground">
                          {r.subtitle}
                        </span>
                      )}
                    </span>
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Icon className="inline h-3 w-3 mr-0.5" /> {TYPE_LABEL[r.type].slice(0, -1)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Search results grouped by type */}
        {(['candidate', 'job', 'vendor', 'submission'] as SearchResultType[]).map((type) => {
          const items = grouped[type];
          if (!items || items.length === 0) return null;
          const Icon = TYPE_ICON[type];
          return (
            <CommandGroup key={type} heading={TYPE_LABEL[type]}>
              {items.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.title} ${r.subtitle ?? ''}`}
                  onSelect={() => go(r.href, {
                    id: r.id,
                    type: r.type,
                    title: r.title,
                    ...(r.subtitle ? { subtitle: r.subtitle } : {}),
                    href: r.href,
                  })}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{r.title}</span>
                    {r.subtitle && (
                      <span className="truncate text-xs text-muted-foreground">{r.subtitle}</span>
                    )}
                  </div>
                  {r.status && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {r.status}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {(hasResults || showRecents) && <CommandSeparator />}

        {/* Jump-to navigation */}
        <CommandGroup heading="Jump to">
          <CommandItem value="home dashboard" onSelect={() => go('/dashboard')}>
            <Home className="h-4 w-4 text-muted-foreground" />
            Home
          </CommandItem>
          <CommandItem value="inbox" onSelect={() => go('/inbox')}>
            <Inbox className="h-4 w-4 text-muted-foreground" />
            Inbox
          </CommandItem>
          <CommandItem value="candidates list" onSelect={() => go('/candidates')}>
            <User className="h-4 w-4 text-muted-foreground" />
            Candidates
          </CommandItem>
          <CommandItem value="jobs list" onSelect={() => go('/jobs')}>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Jobs
          </CommandItem>
          <CommandItem value="submissions list" onSelect={() => go('/submissions')}>
            <Send className="h-4 w-4 text-muted-foreground" />
            Submissions
          </CommandItem>
          <CommandItem value="interviews list" onSelect={() => go('/interviews')}>
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Interviews
          </CommandItem>
          <CommandItem value="vendors list" onSelect={() => go('/vendors')}>
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Vendors
          </CommandItem>
          <CommandItem value="reminders list" onSelect={() => go('/reminders')}>
            <Bell className="h-4 w-4 text-muted-foreground" />
            Reminders
          </CommandItem>
          <CommandItem value="team settings" onSelect={() => go('/settings/team')}>
            <Users className="h-4 w-4 text-muted-foreground" />
            Team management
          </CommandItem>
          <CommandItem value="settings" onSelect={() => go('/settings')}>
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </CommandItem>
          <CommandItem value="action center" onSelect={() => go('/action-center')}>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            Action center
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Create actions */}
        <CommandGroup heading="Create">
          <CommandItem value="new candidate" onSelect={() => go('/candidates/new')}>
            <Plus className="h-4 w-4 text-muted-foreground" />
            Add new candidate
            <CommandShortcut>c:</CommandShortcut>
          </CommandItem>
          <CommandItem value="new job" onSelect={() => go('/jobs/new')}>
            <Plus className="h-4 w-4 text-muted-foreground" />
            Post new job
            <CommandShortcut>j:</CommandShortcut>
          </CommandItem>
          <CommandItem value="new submission" onSelect={() => go('/submissions/new')}>
            <Plus className="h-4 w-4 text-muted-foreground" />
            Create submission
            <CommandShortcut>s:</CommandShortcut>
          </CommandItem>
          <CommandItem value="new interview" onSelect={() => go('/interviews/new')}>
            <Plus className="h-4 w-4 text-muted-foreground" />
            Schedule interview
            <CommandShortcut>i:</CommandShortcut>
          </CommandItem>
          <CommandItem value="new vendor" onSelect={() => go('/vendors/new')}>
            <Plus className="h-4 w-4 text-muted-foreground" />
            Add new vendor
            <CommandShortcut>v:</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Hints — visible in empty state so users learn prefix shortcuts */}
        {!hasQuery && (
          <CommandGroup heading="Tips">
            <CommandItem value="hint prefix" onSelect={() => setQuery('c:')}>
              <Sparkles className="h-4 w-4 text-brand-500" />
              Type <span className="mx-1 rounded bg-muted px-1 font-mono">c:</span>, <span className="mx-1 rounded bg-muted px-1 font-mono">j:</span>, <span className="mx-1 rounded bg-muted px-1 font-mono">s:</span>, or <span className="mx-1 rounded bg-muted px-1 font-mono">v:</span> to filter by entity.
            </CommandItem>
            <CommandItem value="hint kbd" disabled>
              <Sparkles className="h-4 w-4 text-brand-500" />
              Open anywhere with <CommandShortcut>⌘K</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/** Hook to manage global open state + ⌘K shortcut. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isModKey = e.metaKey || e.ctrlKey;
      if (isModKey && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return { open, setOpen };
}
