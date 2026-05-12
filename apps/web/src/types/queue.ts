export type QueueName =
  | 'resume-parse'
  | 'notification-email'
  | 'notification-push'
  | 'report-generate'
  | 'cleanup-scheduled';

export interface QueueCounts {
  waiting:   number;
  active:    number;
  completed: number;
  failed:    number;
  delayed:   number;
}

export interface QueueStats {
  queueName: QueueName;
  paused:    boolean;
  counts:    QueueCounts;
}

export interface QueueHealth {
  enabled: boolean;
  totals:  QueueCounts;
  queues:  QueueStats[];
  process: {
    nodeVersion:   string;
    uptimeSeconds: number;
    memoryHeapMB:  number;
  };
}

export interface FailedJobView {
  id:           string;
  name:         string;
  queueName:    QueueName;
  data:         unknown;
  failedReason: string | null;
  stacktrace:   string[];
  attemptsMade: number;
  finishedOn:   string | null;
  processedOn:  string | null;
  timestamp:    string;
}
