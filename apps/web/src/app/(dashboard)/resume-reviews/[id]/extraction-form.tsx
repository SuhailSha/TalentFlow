'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Check, Edit2, RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * Per-field editor used inside the right-hand pane of the review workspace.
 *
 * Three states:
 *   - accepted (default for ≥ 0.9 confidence): green check, value shown read-only
 *   - editing  (recruiter clicked Edit):       input editable
 *   - rejected (recruiter clicked X):          value struck through
 *
 * The component is controlled by the parent — it does NOT autosave by itself;
 * the parent collects all field-level changes into `editedFields` /
 * `rejectedFields` and persists via the workspace's autosave hook.
 */
type EditorMode = 'accepted' | 'editing' | 'rejected';

export function FieldEditor({
  label,
  path,
  value,
  confidence,
  edited,
  rejected,
  onEdit,
  onReject,
  onClearEdit,
}: {
  label: string;
  path: string;
  value: unknown;
  confidence?: number;
  edited?: unknown;
  rejected?: boolean;
  onEdit: (path: string, value: unknown) => void;
  onReject: (path: string) => void;
  onClearEdit: (path: string) => void;
}) {
  const initialMode: EditorMode = rejected
    ? 'rejected'
    : edited !== undefined
      ? 'editing'
      : 'accepted';
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [draft, setDraft] = useState<string>(stringify(edited ?? value));

  // Reset draft when the parent passes a fresh edited value (e.g. after server save).
  useEffect(() => {
    setDraft(stringify(edited ?? value));
    if (rejected) setMode('rejected');
    else if (edited !== undefined) setMode('editing');
    else setMode('accepted');
  }, [value, edited, rejected]);

  const confBadge = confidence == null ? null : confidenceBadge(confidence);
  const displayValue = stringify(value);

  return (
    <div
      className={`grid grid-cols-[160px_1fr_auto] items-start gap-2 py-1.5 ${mode === 'rejected' ? 'opacity-60' : ''}`}
    >
      <div className="text-xs text-muted-foreground pt-1.5 truncate" title={path}>
        {label}
      </div>
      <div>
        {mode === 'editing' ? (
          isMultiline(draft) ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => onEdit(path, draft)}
              className="text-sm min-h-[2.25rem]"
              rows={Math.min(6, draft.split('\n').length + 1)}
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => onEdit(path, draft)}
              className="text-sm h-8"
            />
          )
        ) : (
          <div
            className={`text-sm py-1 px-2 rounded border bg-muted/30 ${mode === 'rejected' ? 'line-through' : ''}`}
          >
            {displayValue || <span className="text-muted-foreground italic">—</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 pt-0.5">
        {confBadge}
        {mode !== 'rejected' && (
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'editing' ? 'accepted' : 'editing');
              if (mode === 'editing') onClearEdit(path);
            }}
            title={mode === 'editing' ? 'Discard edit' : 'Edit'}
            className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center"
          >
            {mode === 'editing' ? (
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (rejected) {
              onClearEdit(path);
              setMode('accepted');
            } else {
              onReject(path);
              setMode('rejected');
            }
          }}
          title={rejected ? 'Restore' : 'Reject this field'}
          className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center"
        >
          {rejected ? (
            <Check className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stringify(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(stringify).filter(Boolean).join(', ');

  // Handle skill objects - show normalized name or raw value instead of JSON
  if (typeof v === 'object' && v !== null) {
    const obj = v as Record<string, unknown>;
    // Skills have 'raw' and optionally 'normalized' fields
    if ('raw' in obj) {
      return String(obj.normalized || obj.raw || '');
    }
    // Other objects might have 'name' or 'value' fields
    if ('name' in obj) return String(obj.name || '');
    if ('value' in obj) return String(obj.value || '');
  }

  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function isMultiline(s: string): boolean {
  return s.includes('\n') || s.length > 80;
}

function confidenceBadge(c: number) {
  const pct = Math.round(c * 100);
  if (c >= 0.9)
    return (
      <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800">
        {pct}%
      </Badge>
    );
  if (c >= 0.6)
    return (
      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800">
        {pct}%
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-800">
      {pct}%
    </Badge>
  );
}
