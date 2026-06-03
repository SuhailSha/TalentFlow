'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface WorkspaceTab {
  id:       string;          // also the URL hash, e.g. 'overview'
  label:    string;
  icon?:    LucideIcon;
  /** Optional small numeric badge on the tab (e.g. unread count). */
  count?:   number;
  /** Hide a tab without removing it (e.g. admin-only). */
  hidden?:  boolean;
}

interface WorkspaceTabsProps {
  tabs:     WorkspaceTab[];
  /** Tab to use when no hash is present. */
  defaultTab: string;
  children: (activeTab: string) => React.ReactNode;
}

// Lightweight hash-routed tabs. We use the URL hash (not query params) so
// switching tabs doesn't clutter the back-stack and the workspace-data
// query stays cached across tab changes.
export function WorkspaceTabs({ tabs, defaultTab, children }: WorkspaceTabsProps) {
  const [active, setActive] = useState<string>(defaultTab);

  useEffect(() => {
    const visible = tabs.filter((t) => !t.hidden).map((t) => t.id);
    function resolve(): string {
      if (typeof window === 'undefined') return defaultTab;
      const h = window.location.hash.replace(/^#/, '');
      return visible.includes(h) ? h : defaultTab;
    }
    setActive(resolve());
    function onHashChange() { setActive(resolve()); }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [tabs, defaultTab]);

  function select(id: string) {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`);
    }
    setActive(id);
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-border">
        <nav className="-mb-px flex flex-wrap gap-1" aria-label="Workspace sections">
          {tabs.filter((t) => !t.hidden).map((t) => {
            const isActive = t.id === active;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => select(t.id)}
                className={cn(
                  'group inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {t.label}
                {typeof t.count === 'number' && t.count > 0 && (
                  <span className={cn(
                    'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] tabular-nums',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      <div>{children(active)}</div>
    </div>
  );
}
