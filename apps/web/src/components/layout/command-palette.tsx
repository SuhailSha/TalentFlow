'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, Briefcase, Building2, Calendar,
  LayoutDashboard, Plus, Send, Settings, User, Users, Zap,
} from 'lucide-react';

import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command';
import { useSearch } from '@/hooks/use-search';
import { useDebounce } from '@/hooks/use-debounce';
import type { SearchResultType } from '@/types/search';

interface CommandPaletteProps {
  open:   boolean;
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

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 200);
  const { data: results = [], isFetching } = useSearch(debounced, open);

  // Reset query when palette closes
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  // Group results by type
  const grouped = results.reduce<Record<SearchResultType, typeof results>>(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type]!.push(r);
      return acc;
    },
    { candidate: [], job: [], vendor: [], submission: [] },
  );

  const hasResults = results.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search candidates, jobs, vendors… or jump to a page"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length >= 2 && !isFetching && !hasResults && (
          <CommandEmpty>No matches for &quot;{query}&quot;.</CommandEmpty>
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
                  onSelect={() => go(r.href)}
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

        {hasResults && <CommandSeparator />}

        {/* Quick navigation */}
        <CommandGroup heading="Navigate to">
          <CommandItem value="dashboard" onSelect={() => go('/dashboard')}>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            Command center
          </CommandItem>
          <CommandItem value="action-center" onSelect={() => go('/action-center')}>
            <Zap className="h-4 w-4 text-muted-foreground" />
            Action center
          </CommandItem>
          <CommandItem value="reminders" onSelect={() => go('/reminders')}>
            <Bell className="h-4 w-4 text-muted-foreground" />
            Reminders
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
          <CommandItem value="team settings" onSelect={() => go('/settings/team')}>
            <Users className="h-4 w-4 text-muted-foreground" />
            Team management
          </CommandItem>
          <CommandItem value="settings" onSelect={() => go('/settings')}>
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Quick actions */}
        <CommandGroup heading="Quick actions">
          <CommandItem value="new candidate" onSelect={() => go('/candidates/new')}>
            <Plus className="h-4 w-4 text-muted-foreground" />
            Add new candidate
            <CommandShortcut>C</CommandShortcut>
          </CommandItem>
          <CommandItem value="new job" onSelect={() => go('/jobs/new')}>
            <Plus className="h-4 w-4 text-muted-foreground" />
            Post new job
            <CommandShortcut>J</CommandShortcut>
          </CommandItem>
          <CommandItem value="new submission" onSelect={() => go('/submissions/new')}>
            <Plus className="h-4 w-4 text-muted-foreground" />
            Create submission
            <CommandShortcut>S</CommandShortcut>
          </CommandItem>
          <CommandItem value="new interview" onSelect={() => go('/interviews/new')}>
            <Plus className="h-4 w-4 text-muted-foreground" />
            Schedule interview
            <CommandShortcut>I</CommandShortcut>
          </CommandItem>
          <CommandItem value="new vendor" onSelect={() => go('/vendors/new')}>
            <Plus className="h-4 w-4 text-muted-foreground" />
            Add new vendor
            <CommandShortcut>V</CommandShortcut>
          </CommandItem>
        </CommandGroup>
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
