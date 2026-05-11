export type ActivityVerb =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'note_added'
  | 'skill_added'
  | 'skill_removed'
  | 'assigned'
  | 'scheduled'
  | 'cancelled'
  | 'feedback_submitted'
  | 'invited'
  | 'placed'
  | 'offer_extended'
  | 'passed'
  | 'failed'
  | 'no_show'
  | 'acknowledged'
  | 'snoozed'
  | 'dismissed'
  | 'reminder_completed';

export interface ActivityEntry {
  id:           string;
  action:       string;
  verb:         ActivityVerb;
  actorId:      string | null;
  actorEmail:   string | null;
  resourceType: string;
  resourceId:   string;
  occurredAt:   string;
  metadata:     Record<string, unknown> | null;
  before:       Record<string, unknown> | null;
  after:        Record<string, unknown> | null;
}

export type EntityType =
  | 'candidate'
  | 'job'
  | 'vendor'
  | 'submission'
  | 'interview'
  | 'user'
  | 'organization';
