'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAddNote, useCandidateNotes } from '@/hooks/use-candidates';
import type { CandidateDetail, NoteType } from '@/types/candidates';

import { NOTE_TYPE_LABELS } from './shared';

interface NotesTabProps {
  candidate: CandidateDetail;
  canUpdate: boolean;
}

export function NotesTab({ candidate, canUpdate }: NotesTabProps) {
  const { data: notes } = useCandidateNotes(candidate.id);
  const addNoteMutation = useAddNote(candidate.id);

  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('NOTE');

  const visibleNotes = notes ?? candidate.notes;

  function handleAddNote() {
    if (!noteContent.trim()) return;
    addNoteMutation.mutate(
      { content: noteContent.trim(), noteType },
      { onSuccess: () => setNoteContent('') },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4" />
          Notes
          <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{visibleNotes.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canUpdate && (
          <div className="space-y-2">
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as NoteType)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            >
              {(Object.keys(NOTE_TYPE_LABELS) as NoteType[])
                .filter((t) => t !== 'STATUS_CHANGE' && t !== 'SYSTEM')
                .map((t) => (
                  <option key={t} value={t}>{NOTE_TYPE_LABELS[t]}</option>
                ))}
            </select>
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
              placeholder="Add a note…"
            />
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!noteContent.trim() || addNoteMutation.isPending}
            >
              {addNoteMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Add note
            </Button>
          </div>
        )}

        <div className="space-y-3 border-t pt-3">
          {visibleNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No notes yet.</p>
          ) : (
            visibleNotes.map((note) => (
              <div key={note.id} className="rounded-md bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">
                    <Badge variant="outline" className="mr-1.5 text-[10px]">
                      {NOTE_TYPE_LABELS[note.noteType]}
                    </Badge>
                    {note.authorName}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm">{note.content}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
