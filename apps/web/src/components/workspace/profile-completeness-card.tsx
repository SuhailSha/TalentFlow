import { CheckCircle2, Circle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProfileCompletenessCardProps {
  score:    number;            // 0–100
  missing:  string[];
  /** Optional secondary metric placed next to the score. */
  hint?:    string;
  className?: string;
}

const FIELD_LABELS: Record<string, string> = {
  email:           'Email',
  firstName:       'First name',
  lastName:        'Last name',
  phone:           'Phone',
  linkedinUrl:     'LinkedIn URL',
  location:        'Location',
  currentTitle:    'Current title',
  currentCompany:  'Current company',
  careerStartDate: 'Career start date',
  summary:         'Summary',
  salaryRange:     'Salary expectation',
  availability:    'Availability',
  skills:          'Skills',
  resume:          'Resume',
};

function toneFor(score: number) {
  if (score >= 80) return { bar: 'bg-green-500', text: 'text-green-700' };
  if (score >= 60) return { bar: 'bg-blue-500',  text: 'text-blue-700'  };
  if (score >= 40) return { bar: 'bg-amber-500', text: 'text-amber-700' };
  return { bar: 'bg-red-500', text: 'text-red-700' };
}

export function ProfileCompletenessCard({
  score, missing, hint, className,
}: ProfileCompletenessCardProps) {
  const tone = toneFor(score);
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Profile completeness</span>
          <span className={cn('text-base font-semibold tabular-nums', tone.text)}>
            {clamped}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full transition-all', tone.bar)}
            style={{ width: `${clamped}%` }}
            aria-label={`Profile is ${clamped}% complete`}
          />
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

        {missing.length === 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            All key fields populated.
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Missing {missing.length} field{missing.length === 1 ? '' : 's'}
            </p>
            <ul className="space-y-0.5">
              {missing.slice(0, 8).map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-xs">
                  <Circle className="h-3 w-3 text-muted-foreground/60" />
                  {FIELD_LABELS[f] ?? f}
                </li>
              ))}
              {missing.length > 8 && (
                <li className="text-xs text-muted-foreground">+{missing.length - 8} more</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
