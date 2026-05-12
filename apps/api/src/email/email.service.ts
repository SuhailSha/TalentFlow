import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { type EmailDelivery, EmailDeliveryStatus } from '@repo/database';
import type { Queue } from 'bullmq';

import type { EnvConfig } from '../config';
import { PrismaService } from '../database';
import { JOB_NAMES, QUEUE_NAMES } from '../queue/queue.constants';
import { EMAIL_PROVIDER } from './email.tokens';
import type { EmailProvider } from './providers/email-provider.interface';
import { TemplateRenderer } from './templates/template.renderer';
import type { EmailTemplateName, EmailTemplatePayload } from './templates/template.registry';

export interface SendEmailParams<T extends EmailTemplateName> {
  template:        T;
  payload:         EmailTemplatePayload<T>;
  to:              string;
  organizationId:  string;
  recipientUserId?: string;
  replyTo?:        string;
  /** Polymorphic source reference for tracking. */
  resourceType?:   string;
  resourceId?:     string;
  /**
   * Stable dedup key. When two send() calls share this key inside the
   * EMAIL_DEDUP_WINDOW_SECONDS window AND the prior row is in a non-terminal
   * state (PENDING/QUEUED/RETRYING) or recently SENT, the second call
   * returns the existing row instead of creating a new one.
   *
   * Pass nothing to force a new send (e.g. admin "Resend" buttons).
   */
  idempotencyKey?: string;
  /** Free-form context stored on the delivery row. */
  metadata?:       Record<string, unknown>;
}

export interface EmailJobData {
  deliveryId: string;
}

/**
 * EmailService — the only entry point for outbound email.
 *
 * Flow:
 *   1. Render template -> get subject/html/text
 *   2. Insert EmailDelivery row (status PENDING/QUEUED)
 *   3. Enqueue worker job via BullMQ if Redis is on
 *   4. Otherwise fall back to a synchronous send (dev convenience)
 *
 * The worker (EmailWorker) is the only consumer of `deliveryId` — it loads
 * the row, sends via the configured provider, and updates the row status.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly renderer: TemplateRenderer,
    private readonly config: ConfigService<EnvConfig, true>,
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    @Optional() @InjectQueue(QUEUE_NAMES.NOTIFICATION_EMAIL)
    private readonly queue?: Queue<EmailJobData>,
  ) {}

  /**
   * Enqueue an email for delivery.
   * Returns the created EmailDelivery row immediately; actual send is async.
   *
   * When `idempotencyKey` is provided and a recent matching row exists,
   * returns that row instead of creating a new send. See SendEmailParams
   * for the exact dedup window semantics.
   */
  async send<T extends EmailTemplateName>(params: SendEmailParams<T>): Promise<EmailDelivery> {
    // Idempotency check — short-circuits before render to keep the hot path
    // cheap when a key is provided.
    if (params.idempotencyKey) {
      const existing = await this.findRecentByIdempotencyKey(
        params.organizationId,
        params.idempotencyKey,
      );
      if (existing) {
        this.logger.debug(
          { deliveryId: existing.id, idempotencyKey: params.idempotencyKey, status: existing.status },
          'Idempotent send — returning existing delivery',
        );
        return existing;
      }
    }

    const rendered = this.renderer.render(params.template, params.payload);

    const queueEnabled = !!this.queue;

    const delivery = await this.db.emailDelivery.create({
      data: {
        organizationId:  params.organizationId,
        template:        params.template,
        provider:        this.provider.name,
        recipientEmail:  params.to,
        recipientUserId: params.recipientUserId,
        subject:         rendered.subject,
        status:          queueEnabled ? EmailDeliveryStatus.QUEUED : EmailDeliveryStatus.PENDING,
        resourceType:    params.resourceType,
        resourceId:      params.resourceId,
        idempotencyKey:  params.idempotencyKey,
        metadata: {
          ...(params.metadata ?? {}),
          // Persist rendered bodies so retries can replay without re-rendering;
          // small cost, big debugging benefit when templates change.
          renderedHtml: rendered.html,
          renderedText: rendered.text,
          replyTo:      params.replyTo,
        },
      },
    });

    if (queueEnabled && this.queue) {
      try {
        await this.queue.add(
          JOB_NAMES.EMAIL_SEND,
          { deliveryId: delivery.id },
          // Job-level idempotency: jobId === deliveryId means even if this method
          // is called twice with the same delivery (shouldn't happen but...), only
          // one job is registered.
          { jobId: delivery.id },
        );
        this.logger.debug({ deliveryId: delivery.id }, 'Email queued');
        return delivery;
      } catch (err) {
        // Redis is configured but currently unreachable. Keep the row in
        // PENDING so DeliveryRetryRecoveryCron or manual retry can re-enqueue
        // once Redis is back. We deliberately DON'T fall through to the sync
        // path here — that would silently deliver via a different provider
        // than the operator configured.
        this.logger.warn(
          { err: { message: (err as Error).message }, deliveryId: delivery.id },
          'Failed to enqueue email (Redis unreachable). Row left in PENDING for recovery cron.',
        );
        await this.db.emailDelivery.update({
          where: { id: delivery.id },
          data:  { status: EmailDeliveryStatus.PENDING, failureReason: 'Failed to enqueue: Redis unreachable' },
        });
        return { ...delivery, status: EmailDeliveryStatus.PENDING };
      }
    }

    // Synchronous fallback for dev environments without Redis.
    return this.processSynchronously(delivery.id);
  }

  /**
   * Manual re-enqueue for a delivery that's stuck in a non-terminal state.
   * Used by the admin Retry button and by DeliveryRetryRecoveryCron.
   *
   * Idempotent: if the row is already SENT, returns the existing row. The
   * BullMQ jobId === deliveryId guarantees no duplicate job runs.
   */
  async requeueDelivery(deliveryId: string, organizationId: string): Promise<EmailDelivery> {
    const delivery = await this.db.emailDelivery.findFirst({
      where: { id: deliveryId, organizationId },
    });
    if (!delivery) throw new Error(`EmailDelivery ${deliveryId} not found`);
    if (delivery.status === EmailDeliveryStatus.SENT) return delivery;

    if (this.queue) {
      await this.queue.add(
        JOB_NAMES.EMAIL_SEND,
        { deliveryId: delivery.id },
        { jobId: delivery.id },
      );
      const updated = await this.db.emailDelivery.update({
        where: { id: delivery.id },
        data:  { status: EmailDeliveryStatus.QUEUED, failureReason: null },
      });
      this.logger.log({ deliveryId }, 'Delivery manually requeued');
      return updated;
    }

    // No queue active — process synchronously so the admin's click still
    // results in a send attempt.
    return this.processSynchronously(delivery.id);
  }

  /**
   * Worker-callable: load delivery, send via provider, update status.
   * Throws on send failure so the worker can record retries.
   */
  async processDelivery(deliveryId: string): Promise<EmailDelivery> {
    const delivery = await this.db.emailDelivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new Error(`EmailDelivery ${deliveryId} not found`);
    if (delivery.status === EmailDeliveryStatus.SENT) {
      // Idempotency: already sent. Nothing to do.
      return delivery;
    }

    const meta = (delivery.metadata ?? {}) as Record<string, unknown>;
    const html = String(meta['renderedHtml'] ?? '');
    const text = String(meta['renderedText'] ?? '');
    const replyTo = typeof meta['replyTo'] === 'string' ? meta['replyTo'] : undefined;

    await this.db.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status: delivery.attempts > 0 ? EmailDeliveryStatus.RETRYING : EmailDeliveryStatus.QUEUED,
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    try {
      const result = await this.provider.send({
        from:     this.config.get('EMAIL_FROM_ADDRESS', { infer: true }),
        fromName: this.config.get('EMAIL_FROM_NAME', { infer: true }),
        to:       delivery.recipientEmail,
        subject:  delivery.subject,
        html,
        text,
        replyTo,
      });

      return await this.db.emailDelivery.update({
        where: { id: deliveryId },
        data: {
          status:            EmailDeliveryStatus.SENT,
          sentAt:            new Date(),
          providerMessageId: result.providerMessageId,
          providerResponse:  result.rawResponse as never,
          failureReason:     null,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.db.emailDelivery.update({
        where: { id: deliveryId },
        data: {
          status: EmailDeliveryStatus.FAILED,
          failedAt: new Date(),
          failureReason: message.slice(0, 2000),
        },
      });
      throw err; // surface to BullMQ for retry scheduling
    }
  }

  private async processSynchronously(deliveryId: string): Promise<EmailDelivery> {
    try {
      return await this.processDelivery(deliveryId);
    } catch (err) {
      this.logger.warn(
        { err, deliveryId },
        'Synchronous email delivery failed (no queue active). Marked FAILED.',
      );
      // Return the current state instead of re-throwing — sync path is dev only;
      // the caller (e.g. a recruiter clicking "invite") should not get a 500.
      const current = await this.db.emailDelivery.findUnique({ where: { id: deliveryId } });
      if (!current) throw err;
      return current;
    }
  }

  /**
   * Looks for an existing delivery row matching the idempotency key that is
   * still "live" (in-flight) or was recently delivered. A row is considered
   * a dedup hit when:
   *   - status is PENDING / QUEUED / RETRYING (in-flight, regardless of age) OR
   *   - status is SENT and createdAt is within the dedup window
   *
   * FAILED, BOUNCED, SKIPPED rows do NOT block — those are legitimate retry
   * triggers; the caller should be allowed to attempt again.
   */
  private async findRecentByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<EmailDelivery | null> {
    const windowSec = this.config.get('EMAIL_DEDUP_WINDOW_SECONDS', { infer: true });
    const sentCutoff = new Date(Date.now() - windowSec * 1000);

    return this.db.emailDelivery.findFirst({
      where: {
        organizationId,
        idempotencyKey,
        OR: [
          {
            status: {
              in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.QUEUED, EmailDeliveryStatus.RETRYING],
            },
          },
          {
            status:    EmailDeliveryStatus.SENT,
            createdAt: { gte: sentCutoff },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
