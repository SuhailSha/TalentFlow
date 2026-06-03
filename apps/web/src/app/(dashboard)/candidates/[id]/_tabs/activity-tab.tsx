'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityTimeline } from '@/components/workspace';
import { useEntityActivity } from '@/hooks/use-activity';

interface ActivityTabProps {
  candidateId: string;
}

export function ActivityTab({ candidateId }: ActivityTabProps) {
  const { data: entries = [], isLoading } = useEntityActivity('candidate', candidateId, 200);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Activity timeline</CardTitle>
        <span className="text-xs text-muted-foreground">{entries.length}</span>
      </CardHeader>
      <CardContent>
        <ActivityTimeline
          entries={entries}
          loading={isLoading}
          emptyMessage="No recorded activity yet."
        />
      </CardContent>
    </Card>
  );
}
