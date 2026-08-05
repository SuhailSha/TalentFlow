'use client';

import { Eye, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface JobMatch {
  id: string;
  title: string;
  department: string;
  location: string;
  salaryRange: string;
  matchPercentage: number;
  reqId: string;
}

interface AIJobMatchCardProps {
  matches: JobMatch[];
  totalMatches?: number;
  onSubmitToJob?: (jobId: string) => void;
  onViewRationale?: () => void;
  className?: string;
}

export function AIJobMatchCard({
  matches,
  totalMatches = 23,
  onSubmitToJob,
  onViewRationale,
  className,
}: AIJobMatchCardProps) {
  const topMatch = matches[0];

  return (
    <Card className={cn('mb-6', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">AI Match against open jobs</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium dark:bg-blue-500/20 dark:text-blue-200">
              <Sparkles className="h-3 w-3" />
              AI
            </div>
          </div>
          <a
            href="#"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            onClick={(e) => e.preventDefault()}
          >
            View all {totalMatches} →
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {matches.map((match) => (
            <div key={match.id} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {match.reqId} · {match.title}{' '}
                  <span className="text-xs text-muted-foreground font-normal">
                    {match.department} · {match.location} · {match.salaryRange}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        match.matchPercentage >= 90
                          ? 'bg-green-500'
                          : match.matchPercentage >= 80
                            ? 'bg-blue-500'
                            : match.matchPercentage >= 70
                              ? 'bg-amber-500'
                              : 'bg-gray-400',
                      )}
                      style={{ width: `${match.matchPercentage}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium tabular-nums',
                      match.matchPercentage >= 90
                        ? 'text-green-700'
                        : match.matchPercentage >= 70
                          ? 'text-amber-700'
                          : 'text-muted-foreground',
                    )}
                  >
                    {match.matchPercentage}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
          {topMatch && (
            <Button size="sm" onClick={() => onSubmitToJob?.(topMatch.id)} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Submit to {topMatch.reqId}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onViewRationale} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            See AI rationale
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
