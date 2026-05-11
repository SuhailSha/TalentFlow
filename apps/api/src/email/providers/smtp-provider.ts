import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import type { EmailEnvelope, EmailProvider, EmailSendResult } from './email-provider.interface';

export interface SmtpProviderConfig {
  host:     string;
  port:     number;
  secure:   boolean;
  user?:    string;
  password?: string;
}

/**
 * SMTP provider — nodemailer-backed.
 *
 * Works for SES, Mailgun, Postfix, Office365, or any RFC 5321 relay. Production
 * deployments typically point this at a managed SMTP gateway rather than a
 * self-hosted MTA.
 */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private readonly transporter: Transporter;

  constructor(config: SmtpProviderConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: (config.user && config.password)
        ? { user: config.user, pass: config.password }
        : undefined,
    });
  }

  async send(envelope: EmailEnvelope): Promise<EmailSendResult> {
    const fromHeader = envelope.fromName
      ? `"${envelope.fromName}" <${envelope.from}>`
      : envelope.from;

    const info = await this.transporter.sendMail({
      from:    fromHeader,
      to:      envelope.to,
      replyTo: envelope.replyTo,
      subject: envelope.subject,
      html:    envelope.html,
      text:    envelope.text,
      headers: envelope.headers,
    });

    this.logger.log(
      { to: envelope.to, subject: envelope.subject, messageId: info.messageId },
      `SMTP send accepted: ${info.messageId}`,
    );

    return {
      providerMessageId: info.messageId ?? null,
      rawResponse: {
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      },
    };
  }
}
