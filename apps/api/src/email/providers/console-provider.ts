import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import type { EmailEnvelope, EmailProvider, EmailSendResult } from './email-provider.interface';

/**
 * ConsoleProvider — dev default.
 *
 * Logs every "sent" message and writes a .eml file under `EMAIL_OUTPUT_DIR`
 * (defaults to ./uploads/emails). Useful for inspecting what would have been
 * sent without configuring an SMTP relay.
 *
 * Never used in production — env validation will reject EMAIL_DRIVER=console
 * if NODE_ENV=production (enforced at app boot, not here).
 */
@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  private readonly logger = new Logger(ConsoleEmailProvider.name);
  private readonly outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  async send(envelope: EmailEnvelope): Promise<EmailSendResult> {
    const messageId = `console-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    this.logger.log(
      { to: envelope.to, subject: envelope.subject, messageId },
      `[ConsoleProvider] Would have sent: "${envelope.subject}" -> ${envelope.to}`,
    );

    // Write a basic .eml file so developers can open it in an email client.
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      const filename = `${messageId}.eml`;
      const filepath = path.join(this.outputDir, filename);
      const eml = this.formatEml(envelope, messageId);
      await fs.writeFile(filepath, eml, 'utf-8');
      this.logger.debug({ filepath }, 'Wrote .eml dump');
    } catch (err) {
      // Filesystem failures here are non-fatal — the log line above is the
      // primary signal. Continue.
      this.logger.warn({ err }, 'Failed to write .eml file');
    }

    return {
      providerMessageId: messageId,
      rawResponse: { provider: 'console', writtenTo: this.outputDir },
    };
  }

  private formatEml(envelope: EmailEnvelope, messageId: string): string {
    const fromHeader = envelope.fromName
      ? `"${envelope.fromName}" <${envelope.from}>`
      : envelope.from;
    return [
      `Message-ID: <${messageId}>`,
      `From: ${fromHeader}`,
      `To: ${envelope.to}`,
      envelope.replyTo ? `Reply-To: ${envelope.replyTo}` : '',
      `Subject: ${envelope.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="boundary-text-html"',
      ...Object.entries(envelope.headers ?? {}).map(([k, v]) => `${k}: ${v}`),
      '',
      '--boundary-text-html',
      'Content-Type: text/plain; charset="utf-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      envelope.text,
      '',
      '--boundary-text-html',
      'Content-Type: text/html; charset="utf-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      envelope.html,
      '',
      '--boundary-text-html--',
    ].filter(Boolean).join('\r\n');
  }
}
