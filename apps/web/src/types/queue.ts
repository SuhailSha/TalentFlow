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

export type RedisConnectionState =
  | 'wait' | 'connecting' | 'connect' | 'ready'
  | 'reconnecting' | 'end' | 'close' | 'unknown';

export interface RedisConnectionStatus {
  enabled:            boolean;
  state:              RedisConnectionState;
  lastConnectedAt:    string | null;
  lastDisconnectedAt: string | null;
  lastErrorMessage:   string | null;
  reconnectCount:     number;
}

export interface QueueHealth {
  enabled:    boolean;
  connection: RedisConnectionStatus;
  totals:     QueueCounts;
  queues:     QueueStats[];
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
