'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, FileText, Plus, Sparkles, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AISummaryCard,
  AIJobMatchCard,
  AISuggestedActionsCard,
  SkillsExtractionCard,
  OverdueIndicator,
  RelatedEntityCard,
} from '@/components/workspace';
import { InlineSkillAdd } from '@/components/candidates/inline-skill-add';
import { useRemoveSkill } from '@/hooks/use-candidates';
import type { CandidateDetail } from '@/types/candidates';
import type { CandidateWorkspace } from '@/types/candidate-workspace';

import { REMINDER_TONE } from './shared';

interface OverviewTabProps {
  candidate: CandidateDetail;
  workspace: CandidateWorkspace | undefined;
  canUpdate: boolean;
}

export function OverviewTab({ candidate, workspace, canUpdate }: OverviewTabProps) {
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const removeSkillMutation = useRemoveSkill(candidate.id);

  const openReminders = workspace?.openReminders ?? [];
  const upcomingInterviews = workspace?.upcomingInterviews ?? [];

  return (
    <div className="space-y-4">
      {/* AI Summary - Enhanced version */}
      <AISummaryCard
        summary={
          candidate.summary ||
          "Sarah is a senior platform-reliability engineer with 7 years at high-scale fintechs (ex-Stripe, ex-Square). Strong fit for backend roles with distributed systems and observability requirements. Recently shipped Acme's incident-response platform; mentioned looking for staff-level work with broader scope. High likelihood of accepting at $200k+ base if onsite is on the table."
        }
        generatedAt={new Date(Date.now() - 12 * 60 * 1000)} // 12 minutes ago
        sentiment="Positive (interview notes)"
        risk="Mentioned 2 competing offers"
        bestFitRole="Staff SRE"
        onRegenerate={() => {
          // TODO: Implement AI summary regeneration
          console.log('Regenerating AI summary...');
        }}
      />

      {/* AI Job Matches */}
      <AIJobMatchCard
        matches={[
          {
            id: 'req-0017',
            title: 'Staff SRE',
            department: 'Engineering',
            location: 'Remote',
            salaryRange: '$200k–$260k',
            matchPercentage: 94,
            reqId: 'REQ-0017',
          },
          {
            id: 'req-0014',
            title: 'Senior Software Engineer',
            department: 'Platform',
            location: 'SF',
            salaryRange: '$180k–$240k',
            matchPercentage: 92,
            reqId: 'REQ-0014',
          },
          {
            id: 'req-0009',
            title: 'Backend Engineer',
            department: 'Payments',
            location: 'Hybrid',
            salaryRange: '$170k–$210k',
            matchPercentage: 81,
            reqId: 'REQ-0009',
          },
          {
            id: 'req-0021',
            title: 'Tech Lead',
            department: 'Marketplace',
            location: 'Remote',
            salaryRange: '$190k–$230k',
            matchPercentage: 72,
            reqId: 'REQ-0021',
          },
        ]}
        onSubmitToJob={(jobId) => console.log('Submit to job:', jobId)}
        onViewRationale={() => console.log('View AI rationale')}
      />

      {/* AI Suggested Actions */}
      <AISuggestedActionsCard
        actions={[
          {
            id: '1',
            type: 'submit',
            title: 'Submit Sarah to REQ-0017 Staff SRE',
            description: '94% AI match · candidate available immediately · job opened 1d ago',
            priority: 'high',
            actionLabel: 'Submit',
            onAction: () => console.log('Submit action'),
          },
          {
            id: '2',
            type: 'contact',
            title: 'Send "still interested?" check-in',
            description: 'No contact in 2 days · 2 competing offers mentioned · time-sensitive',
            priority: 'medium',
            actionLabel: 'Draft email',
            onAction: () => console.log('Draft email'),
          },
          {
            id: '3',
            type: 'edit',
            title: 'Fill in salary expectation range',
            description: 'Missing data limits AI matching against compensation bands',
            priority: 'low',
            actionLabel: 'Add',
            onAction: () => console.log('Add salary'),
          },
          {
            id: '4',
            type: 'schedule',
            title: 'Reconfirm Round 3 onsite for tomorrow',
            description: 'Panel: Diego (HM), Priya (IC), Sam (IC)',
            priority: 'low',
            actionLabel: 'Open',
            onAction: () => console.log('Open calendar'),
          },
        ]}
      />

      {/* Skills Extraction */}
      <SkillsExtractionCard
        skills={[
          { name: 'Go', confidence: 96 },
          { name: 'Kubernetes', confidence: 92 },
          { name: 'Distributed sys.', confidence: 89 },
          { name: 'Observability', confidence: 86 },
          { name: 'React', confidence: 74 },
          { name: 'TypeScript', confidence: 71 },
          { name: 'SQL', confidence: 68 },
          { name: 'Mentorship', confidence: 42 },
        ]}
        threshold={70}
        onAddSkill={() => console.log('Add skill')}
      />

      {/* Legacy Summary - Keep as fallback */}
      {candidate.summary && false && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{candidate.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming interviews snapshot */}
      {upcomingInterviews.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Upcoming interviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingInterviews.slice(0, 3).map((iv) => (
              <RelatedEntityCard
                key={iv.id}
                eyebrow={iv.roundLabel ?? `Round ${iv.round}`}
                title={`${iv.type} · ${iv.jobTitle}`}
                subtitle={
                  iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleString() : 'Not scheduled'
                }
                status={iv.status}
                statusTone="blue"
                href={`/interviews/${iv.id}`}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Open reminders */}
      {openReminders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4" />
              Open reminders
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">
                {openReminders.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openReminders.slice(0, 6).map((r) => (
              <RelatedEntityCard
                key={r.id}
                eyebrow={r.priority}
                title={r.title}
                status={r.status}
                statusTone={REMINDER_TONE[r.status as keyof typeof REMINDER_TONE] ?? 'gray'}
                href={`/reminders?id=${r.id}`}
                meta={<OverdueIndicator dueAt={r.dueAt} />}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4" />
            Skills
            <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">
              {candidate.allSkills.length}
            </span>
          </CardTitle>
          {canUpdate && !showSkillPicker && (
            <Button size="sm" variant="ghost" onClick={() => setShowSkillPicker(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {showSkillPicker && (
            <InlineSkillAdd
              candidateId={candidate.id}
              assignedSkillIds={candidate.allSkills.map((s) => s.skill.id)}
              open={showSkillPicker}
              onClose={() => setShowSkillPicker(false)}
            />
          )}
          {candidate.allSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills added yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {candidate.allSkills.map((cs) => (
                <div key={cs.id} className="group flex items-center gap-1">
                  <Badge variant={cs.isPrimary ? 'default' : 'secondary'} className="text-xs">
                    {cs.skill.displayName}
                    {cs.yearsOfExperience !== null && (
                      <span className="ml-1 opacity-60">· {cs.yearsOfExperience}y</span>
                    )}
                  </Badge>
                  {canUpdate && (
                    <button
                      onClick={() => removeSkillMutation.mutate(cs.skill.id)}
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                      aria-label={`Remove ${cs.skill.displayName}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top recruiters / vendors */}
      {workspace && (workspace.topRecruiters.length > 0 || workspace.topVendors.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {workspace.topRecruiters.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Top recruiters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {workspace.topRecruiters.map((r) => (
                  <div key={r.id} className="flex items-center justify-between">
                    <span>{r.fullName}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {r.submissionCount} sub.
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {workspace.topVendors.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Top vendors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {workspace.topVendors.map((v) => (
                  <div key={v.id} className="flex items-center justify-between">
                    <span>{v.companyName}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {v.submissionCount} sub.
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Meta footer */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-xs text-muted-foreground">
          <span>
            Source: <span className="text-foreground">{candidate.source}</span>
          </span>
          {candidate.sourceDetail && <span>{candidate.sourceDetail}</span>}
          <span>
            Added {formatDistanceToNow(new Date(candidate.createdAt), { addSuffix: true })}
          </span>
          <span>
            Updated {formatDistanceToNow(new Date(candidate.updatedAt), { addSuffix: true })}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
