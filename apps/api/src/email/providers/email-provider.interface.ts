/**
 * Provider-agnostic envelope handed to an EmailProvider implementation.
 * The EmailService renders the template into html/text before this point —
 * providers never touch the template registry.
 */
export interface EmailEnvelope {
  /** Final RFC 5322 "From" address. */
  from:        string;
  /** Optional sender display name combined with `from`. */
  fromName?:   string;
  /** Single recipient. Bulk send is a future job type, not a provider concern. */
  to:          string;
  subject:     string;
  /** Rendered HTML body. */
  html:        string;
  /** Rendered plain-text body. Required — providers always send multipart. */
  text:        string;
  /** Free-form headers (e.g. List-Unsubscribe). Optional. */
  headers?:    Record<string, string>;
  /**
   * Per-message reply-to override. When unset, the provider falls back to
   * From. Useful for transactional replies routed back to a recruiter inbox.
   */
  replyTo?:    string;
}

export interface EmailSendResult {
  /** Stable provider-issued message ID. Stored on the EmailDelivery row. */
  providerMessageId: string | null;
  /** Last raw response from the provider, JSON-serialisable. */
  rawResponse?:      unknown;
}

/**
 * Implementations:
 *   - ConsoleProvider  : dev no-op that logs and writes .eml files
 *   - SmtpProvider     : nodemailer-backed; works against any SMTP relay
 *   - SendgridProvider : stub — throws NotImplementedError
 *   - PostmarkProvider : stub — throws NotImplementedError
 *
 * Add a new provider by:
 *   1. Implementing this interface in `src/email/providers/<name>-provider.ts`
 *   2. Adding the new value to EMAIL_DRIVER in env.schema.ts
 *   3. Switching on it inside EmailModule.useFactory()
 */
export interface EmailProvider {
  /** Human-readable provider name, written to EmailDelivery.provider. */
  readonly name: string;

  /**
   * Send a single message. Throw on any failure.
   * Workers convert thrown errors into a FAILED delivery + scheduled retry.
   */
  send(envelope: EmailEnvelope): Promise<EmailSendResult>;
}
