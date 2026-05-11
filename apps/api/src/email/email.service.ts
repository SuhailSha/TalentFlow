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
   */
  async send<T extends EmailTemplateName>(params: SendEmailParams<T>): Promise<EmailDelivery> {
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
    }

    // Synchronous fallback for dev environments without Redis.
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
}
