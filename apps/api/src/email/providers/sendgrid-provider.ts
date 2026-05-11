import { Injectable } from '@nestjs/common';

import type { EmailEnvelope, EmailProvider, EmailSendResult } from './email-provider.interface';

/**
 * SendGrid stub — schema-ready, not implemented.
 *
 * Reserved for the SendGrid HTTP API integration. To activate:
 *   1. Add @sendgrid/mail dependency
 *   2. Add SENDGRID_API_KEY to env.schema.ts
 *   3. Replace this implementation
 *   4. Wire it in email.module.ts's useFactory
 *
 * Kept as a class with the EmailProvider interface so the switch in
 * email.module.ts can already reference it; runtime use throws fast.
 */
@Injectable()
export class SendgridEmailProvider implements EmailProvider {
  readonly name = 'sendgrid';

  async send(_envelope: EmailEnvelope): Promise<EmailSendResult> {
    throw new Error(
      'SendgridEmailProvider not implemented. ' +
      'Use EMAIL_DRIVER=smtp or =console until SendGrid is enabled.',
    );
  }
}
