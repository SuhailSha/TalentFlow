'use client';

import { Calendar, Clock, Edit, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SuggestedAction {
  id: string;
  type: 'submit' | 'contact' | 'edit' | 'schedule';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  onAction?: () => void;
}

interface AISuggestedActionsCardProps {
  actions: SuggestedAction[];
  className?: string;
}

const actionIcons = {
  submit: Send,
  contact: Clock,
  edit: Edit,
  schedule: Calendar,
};

const actionColors = {
  submit: 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  contact: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  edit: 'bg-gray-50 text-gray-700 dark:bg-gray-500/20 dark:text-gray-200',
  schedule: 'bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-200',
};

export function AISuggestedActionsCard({ actions, className }: AISuggestedActionsCardProps) {
  return (
    <Card className={cn('mb-6', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Suggested next actions</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium dark:bg-blue-500/20 dark:text-blue-200">
            <Sparkles className="h-3 w-3" />
            AI
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0">
          {actions.map((action, index) => {
            const Icon = actionIcons[action.type];
            return (
              <div
                key={action.id}
                className={cn(
                  'flex items-center gap-3 py-3',
                  index < actions.length - 1 && 'border-b border-border/60',
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center',
                    actionColors[action.type],
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{action.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{action.description}</div>
                </div>
                <Button
                  variant={
                    action.priority === 'high'
                      ? 'default'
                      : action.priority === 'medium'
                        ? 'outline'
                        : 'ghost'
                  }
                  size="sm"
                  onClick={action.onAction}
                  className="flex-shrink-0"
                >
                  {action.actionLabel}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
