'use client';

import { useState } from 'react';
import { Loader2, UserCog, UserX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OwnerCardOwner {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  fullName:  string;
}

interface OwnerCardOption {
  id:    string;
  label: string;
  email?: string;
}

interface OwnerCardProps {
  owner:       OwnerCardOwner | null;
  /** Whether the current user can reassign. */
  canEdit:     boolean;
  /** Options for reassignment — populated from organization users. */
  options?:    OwnerCardOption[];
  pending?:    boolean;
  onAssign?:   (ownerId: string | null) => void;
  emptyHint?:  string;
}

// Sidebar card showing the candidate's primary recruiter and offering
// reassignment when the user has candidates:update permission.
export function OwnerCard({
  owner, canEdit, options, pending, onAssign, emptyHint,
}: OwnerCardProps) {
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<string>(owner?.id ?? '');

  function handleSave() {
    onAssign?.(selection || null);
    setEditing(false);
  }

  function handleUnassign() {
    onAssign?.(null);
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Relationship owner</CardTitle>
        {canEdit && !editing && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => {
            setSelection(owner?.id ?? '');
            setEditing(true);
          }}>
            <UserCog className="mr-1 h-3.5 w-3.5" /> Reassign
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!editing && owner && (
          <div>
            <p className="font-medium text-foreground">{owner.fullName}</p>
            <a href={`mailto:${owner.email}`} className="text-xs text-muted-foreground hover:text-primary">
              {owner.email}
            </a>
          </div>
        )}
        {!editing && !owner && (
          <p className="text-xs text-muted-foreground">
            {emptyHint ?? 'No owner assigned.'}
          </p>
        )}
        {editing && (
          <div className="space-y-2">
            <select
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
              disabled={pending}
            >
              <option value="">— Unassigned —</option>
              {options?.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSave} disabled={pending}>
                {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
              {owner && (
                <Button size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs text-red-600 hover:text-red-700" onClick={handleUnassign} disabled={pending}>
                  <UserX className="mr-1 h-3.5 w-3.5" /> Unassign
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
