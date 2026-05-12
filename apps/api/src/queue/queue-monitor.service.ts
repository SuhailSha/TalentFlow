import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';

import { QUEUE_NAMES, type QueueName } from './queue.constants';
import { RedisConnectionMonitor, type RedisConnectionStatus } from './redis-connection.monitor';

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

export interface QueueHealthResponse {
  /** Whether Redis is enabled and queues are functional. */
  enabled: boolean;
  /** Live Redis connection state + reconnect counters. */
  connection: RedisConnectionStatus;
  /** Aggregate counts across all queues. Empty when disabled. */
  totals:  QueueCounts;
  /** Per-queue breakdown. Empty when disabled. */
  queues:  QueueStats[];
  /** Worker process info — derived from the process running the API. */
  process: {
    nodeVersion:    string;
    uptimeSeconds:  number;
    memoryHeapMB:   number;
  };
}

export interface FailedJobView {
  id:           string;
  name:         string;
  queueName:    QueueName;
  data:         unknown;
  failedReason: string | null;
  /** Truncated stack trace (last 10 lines). */
  stacktrace:   string[];
  attemptsMade: number;
  finishedOn:   string | null;
  processedOn:  string | null;
  timestamp:    string;
}

/**
 * QueueMonitorService — operational visibility into BullMQ queues.
 *
 * All queues are injected with @Optional() because when REDIS_ENABLED=false
 * the BullModule never registers them. In that mode, getAllStats() returns
 * { enabled: false } so the UI can render a "queues disabled" placeholder.
 *
 * Auth: callers are expected to be permission-gated at the controller level
 * (SETTINGS_READ for reads, SETTINGS_UPDATE for retry/remove). Since BullMQ
 * jobs are cross-tenant (one Redis instance), the data here is org-agnostic;
 * only platform operators should see it.
 */
@Injectable()
export class QueueMonitorService {
  private readonly logger = new Logger(QueueMonitorService.name);

  constructor(
    private readonly connection: RedisConnectionMonitor,
    @Optional() @InjectQueue(QUEUE_NAMES.NOTIFICATION_EMAIL) private readonly emailQueue?:    Queue,
    @Optional() @InjectQueue(QUEUE_NAMES.NOTIFICATION_PUSH)  private readonly pushQueue?:     Queue,
    @Optional() @InjectQueue(QUEUE_NAMES.RESUME_PARSE)       private readonly resumeQueue?:   Queue,
    @Optional() @InjectQueue(QUEUE_NAMES.REPORT_GENERATE)    private readonly reportQueue?:   Queue,
    @Optional() @InjectQueue(QUEUE_NAMES.CLEANUP_SCHEDULED)  private readonly cleanupQueue?:  Queue,
  ) {}

  isEnabled(): boolean {
    return !!this.emailQueue;
  }

  private getAllQueues(): Map<QueueName, Queue> {
    const map = new Map<QueueName, Queue>();
    if (this.emailQueue)   map.set(QUEUE_NAMES.NOTIFICATION_EMAIL, this.emailQueue);
    if (this.pushQueue)    map.set(QUEUE_NAMES.NOTIFICATION_PUSH,  this.pushQueue);
    if (this.resumeQueue)  map.set(QUEUE_NAMES.RESUME_PARSE,       this.resumeQueue);
    if (this.reportQueue)  map.set(QUEUE_NAMES.REPORT_GENERATE,    this.reportQueue);
    if (this.cleanupQueue) map.set(QUEUE_NAMES.CLEANUP_SCHEDULED,  this.cleanupQueue);
    return map;
  }

  async getAllStats(): Promise<QueueHealthResponse> {
    const processInfo = {
      nodeVersion:   process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryHeapMB:  Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
    };

    const queues = this.getAllQueues();
    const connection = this.connection.getStatus();

    if (queues.size === 0) {
      return {
        enabled:    false,
        connection,
        totals:     { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        queues:     [],
        process:    processInfo,
      };
    }

    const results = await Promise.all(
      Array.from(queues.entries()).map(async ([name, queue]) => {
        try {
          const [rawCounts, paused] = await Promise.all([
            queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
            queue.isPaused(),
          ]);
          const counts: QueueCounts = {
            waiting:   rawCounts.waiting   ?? 0,
            active:    rawCounts.active    ?? 0,
            completed: rawCounts.completed ?? 0,
            failed:    rawCounts.failed    ?? 0,
            delayed:   rawCounts.delayed   ?? 0,
          };
          return { queueName: name, paused, counts };
        } catch (err) {
          this.logger.warn({ err, queueName: name }, 'Failed to read queue stats');
          return {
            queueName: name,
            paused:    false,
            counts:    { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
          };
        }
      }),
    );

    const totals = results.reduce<QueueCounts>((acc, q) => ({
      waiting:   acc.waiting   + q.counts.waiting,
      active:    acc.active    + q.counts.active,
      completed: acc.completed + q.counts.completed,
      failed:    acc.failed    + q.counts.failed,
      delayed:   acc.delayed   + q.counts.delayed,
    }), { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 });

    return {
      enabled:    true,
      connection,
      totals,
      queues:     results,
      process:    processInfo,
    };
  }

  async getFailedJobs(queueName: QueueName, limit = 20): Promise<FailedJobView[]> {
    const queue = this.getAllQueues().get(queueName);
    if (!queue) return [];

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const jobs = await queue.getFailed(0, safeLimit - 1);
    return jobs.map((j) => this.toFailedJobView(queueName, j));
  }

  async retryFailedJob(queueName: QueueName, jobId: string): Promise<void> {
    const queue = this.getAllQueues().get(queueName);
    if (!queue) throw new NotFoundException('Queue not active');
    const job = await queue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found');
    await job.retry();
    this.logger.log({ queueName, jobId }, 'Manually retried failed job');
  }

  async removeFailedJob(queueName: QueueName, jobId: string): Promise<void> {
    const queue = this.getAllQueues().get(queueName);
    if (!queue) throw new NotFoundException('Queue not active');
    const job = await queue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found');
    await job.remove();
    this.logger.log({ queueName, jobId }, 'Manually removed failed job');
  }

  private toFailedJobView(queueName: QueueName, job: Job): FailedJobView {
    const stacktrace = Array.isArray(job.stacktrace)
      ? job.stacktrace.slice(0, 10).map((line) => String(line).split('\n')[0] ?? '')
      : [];
    return {
      id:           String(job.id ?? ''),
      name:         job.name,
      queueName,
      data:         job.data,
      failedReason: job.failedReason ?? null,
      stacktrace,
      attemptsMade: job.attemptsMade ?? 0,
      finishedOn:   job.finishedOn  ? new Date(job.finishedOn).toISOString()  : null,
      processedOn:  job.processedOn ? new Date(job.processedOn).toISOString() : null,
      timestamp:    new Date(job.timestamp).toISOString(),
    };
  }
}
