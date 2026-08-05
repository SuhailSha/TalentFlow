'use client';

import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Skill {
  name: string;
  confidence: number;
}

interface SkillsExtractionCardProps {
  skills: Skill[];
  threshold?: number;
  onAddSkill?: () => void;
  className?: string;
}

export function SkillsExtractionCard({
  skills,
  threshold = 70,
  onAddSkill,
  className,
}: SkillsExtractionCardProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getConfidenceTextColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-700';
    if (confidence >= 60) return 'text-amber-700';
    return 'text-red-700';
  };

  return (
    <Card className={cn('mb-6', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Skills (extracted with confidence)</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium dark:bg-blue-500/20 dark:text-blue-200">
              <Sparkles className="h-3 w-3" />
              AI
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddSkill}
            className="gap-1.5 h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add skill
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {skills.map((skill) => (
            <div key={skill.name} className="flex items-center gap-2.5 text-xs">
              <div className="w-24 text-muted-foreground truncate">{skill.name}</div>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', getConfidenceColor(skill.confidence))}
                  style={{ width: `${skill.confidence}%` }}
                />
              </div>
              <div
                className={cn(
                  'w-12 text-right tabular-nums font-medium',
                  getConfidenceTextColor(skill.confidence),
                )}
              >
                {skill.confidence}%
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 mb-0">
          Confidence reflects how strongly the skill appears in resume + interview notes. Below the
          org&apos;s {threshold}% threshold gets flagged for review.
        </p>
      </CardContent>
    </Card>
  );
}
