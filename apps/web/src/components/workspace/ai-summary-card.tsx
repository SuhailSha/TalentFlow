'use client';

import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AISummaryCardProps {
  summary: string;
  generatedAt?: Date;
  sentiment?: string;
  risk?: string;
  bestFitRole?: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  className?: string;
}

export function AISummaryCard({
  summary,
  generatedAt,
  sentiment,
  risk,
  bestFitRole,
  onRegenerate,
  isRegenerating = false,
  className,
}: AISummaryCardProps) {
  // Highlight key terms in the summary
  const highlightedSummary = summary.replace(
    /(high likelihood|distributed systems|observability|staff-level|7 years|\$\d+k\+?|positive|negative|competing offers)/gi,
    '<span class="bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-medium dark:bg-blue-500/20 dark:text-blue-200">$1</span>',
  );

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Card
      className={cn(
        'mb-6 border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800',
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium dark:bg-blue-500/20 dark:text-blue-200">
              <Sparkles className="h-3 w-3" />
              AI Summary
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {generatedAt && (
              <span>Generated {formatTimeAgo(generatedAt)} from resume + interview notes</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isRegenerating && 'animate-spin')} />
              Regenerate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className="text-sm leading-relaxed text-foreground mb-4"
          dangerouslySetInnerHTML={{ __html: highlightedSummary }}
        />

        {(sentiment || risk || bestFitRole) && (
          <>
            <div className="h-px bg-border my-4" />
            <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
              {sentiment && (
                <div>
                  <span className="font-medium text-foreground">Sentiment:</span> {sentiment}
                </div>
              )}
              {risk && (
                <>
                  <div className="w-px h-3 bg-border" />
                  <div>
                    <span className="font-medium text-foreground">Risk:</span> {risk}
                  </div>
                </>
              )}
              {bestFitRole && (
                <>
                  <div className="w-px h-3 bg-border" />
                  <div>
                    <span className="font-medium text-foreground">Best-fit role:</span>{' '}
                    {bestFitRole}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
