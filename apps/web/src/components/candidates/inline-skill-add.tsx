'use client';

import { useState } from 'react';
import { Check, Loader2, Plus, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useAssignSkill, useSkillSearch } from '@/hooks/use-candidates';
import type { ProficiencyLevel } from '@/types/candidates';
import { cn } from '@/lib/utils';

const PROFICIENCY_OPTIONS: ProficiencyLevel[] = [
  'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT',
];

interface InlineSkillAddProps {
  candidateId: string;
  /** Currently assigned skill IDs — used to mark "Already added" in the picker. */
  assignedSkillIds: string[];
  /** Caller controls open/close. */
  open:    boolean;
  onClose: () => void;
}

// Inline picker that fetches skills via /skills?q=... and assigns them
// without leaving the page. Falls back to "create new" if the query
// doesn't match an existing skill exactly.
export function InlineSkillAdd({
  candidateId, assignedSkillIds, open, onClose,
}: InlineSkillAddProps) {
  const [query, setQuery] = useState('');
  const [proficiency, setProficiency] = useState<ProficiencyLevel>('INTERMEDIATE');
  const [years, setYears] = useState<string>('');
  const debounced = useDebounce(query, 200);

  const { data: results = [], isLoading } = useSkillSearch(debounced);
  const assign = useAssignSkill(candidateId);

  function handleAssign(skillId?: string, skillName?: string) {
    assign.mutate(
      {
        skillId,
        skillName,
        proficiencyLevel: proficiency,
        yearsOfExperience: years ? Number(years) : undefined,
      },
      {
        onSuccess: () => {
          setQuery('');
          setYears('');
          onClose();
        },
      },
    );
  }

  if (!open) return null;

  const exactMatch = results.find((s) => s.displayName.toLowerCase() === query.trim().toLowerCase());
  const canCreate = query.trim().length >= 2 && !exactMatch;

  return (
    <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Add skill
        </span>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search skills (e.g. TypeScript, AWS)"
        className="h-8 text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={proficiency}
          onChange={(e) => setProficiency(e.target.value as ProficiencyLevel)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          {PROFICIENCY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p[0]}{p.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <Input
          value={years}
          onChange={(e) => setYears(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="Years"
          inputMode="numeric"
          className="h-7 w-20 text-xs"
        />
      </div>

      {/* Results */}
      <div className="max-h-44 space-y-1 overflow-auto rounded-md border bg-background p-1">
        {isLoading && (
          <p className="px-2 py-2 text-xs text-muted-foreground">Searching…</p>
        )}
        {!isLoading && results.length === 0 && query.length === 0 && (
          <p className="px-2 py-2 text-xs text-muted-foreground">Start typing to find a skill.</p>
        )}
        {!isLoading && results.map((s) => {
          const alreadyAssigned = assignedSkillIds.includes(s.id);
          return (
            <button
              type="button"
              key={s.id}
              disabled={alreadyAssigned || assign.isPending}
              onClick={() => handleAssign(s.id)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm',
                alreadyAssigned
                  ? 'cursor-not-allowed text-muted-foreground'
                  : 'hover:bg-accent',
              )}
            >
              <span className="flex items-center gap-2">
                <span>{s.displayName}</span>
                <Badge variant="outline" className="text-[10px]">{s.category.replace(/_/g, ' ')}</Badge>
              </span>
              {alreadyAssigned ? (
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <Check className="h-3 w-3" /> Added
                </span>
              ) : (
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          );
        })}
        {canCreate && (
          <button
            type="button"
            onClick={() => handleAssign(undefined, query.trim())}
            disabled={assign.isPending}
            className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            <span>Create &quot;{query.trim()}&quot;</span>
            {assign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
