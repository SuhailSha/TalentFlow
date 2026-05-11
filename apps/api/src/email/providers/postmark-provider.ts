import { Injectable } from '@nestjs/common';

import type { EmailEnvelope, EmailProvider, EmailSendResult } from './email-provider.interface';

/**
 * Postmark stub — schema-ready, not implemented.
 *
 * Reserved for the Postmark HTTP API integration. To activate:
 *   1. Add the `postmark` dependency
 *   2. Add POSTMARK_SERVER_TOKEN to env.schema.ts
 *   3. Replace this implementation
 *   4. Wire it in email.module.ts's useFactory
 */
@Injectable()
export class PostmarkEmailProvider implements EmailProvider {
  readonly name = 'postmark';

  async send(_envelope: EmailEnvelope): Promise<EmailSendResult> {
    throw new Error(
      'PostmarkEmailProvider not implemented. ' +
      'Use EMAIL_DRIVER=smtp or =console until Postmark is enabled.',
    );
  }
}
