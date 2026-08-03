'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import type { SavedView } from './types';
import { cn } from '@/lib/utils';

interface SavedViewsRowProps {
  views:      SavedView[];
  activeId?:  string;
  onSelect:   (id: string) => void;
  onSave:     (name: string) => void;
}

/**
 * Pills row rendered above the DataTable toolbar. Approved mockup calls
 * for one pill per saved view + a dashed "+ Save view" affordance.
 * Delete is deferred to a per-pill context menu (Phase 5 with sharing
 * scope).
 */
export function SavedViewsRow({ views, activeId, onSelect, onSave }: SavedViewsRowProps) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  function commit() {
    const clean = name.trim();
    if (clean) onSave(clean);
    setNaming(false);
    setName('');
  }

  if (views.length === 0 && !naming) {
    // Empty state — just the "Save view" affordance.
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Views</span>
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[12px] text-muted-foreground hover:border-brand-300 hover:text-foreground"
        >
          <Plus className="h-3 w-3" /> Save view
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Views</span>

      {views.map((v) => {
        const active = v.id === activeId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v.id)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
              active
                ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200'
                : 'border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {v.name}
          </button>
        );
      })}

      {naming ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setNaming(false); setName(''); }
          }}
          onBlur={commit}
          placeholder="View name…"
          aria-label="Save current view as"
          className="h-7 min-w-[140px] rounded-full border border-brand-300 bg-background px-3 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      ) : (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[12px] text-muted-foreground hover:border-brand-300 hover:text-foreground"
        >
          <Plus className="h-3 w-3" /> Save view
        </button>
      )}
    </div>
  );
}
