/**
 * Structured error categorisation for parsing failures.
 *
 * The orchestrator inspects errorCode to decide:
 *   - whether to retry (transient / rate_limit → yes; permanent → no)
 *   - whether to fail over to the next provider (any error → try next)
 *   - whether to surface to the operator (budget_exceeded → admin alert)
 */
export type ParsingErrorCode =
  | 'transient'              // network blip, timeout, 5xx — retryable
  | 'rate_limit'             // 429 from provider — retry with longer backoff
  | 'provider_unavailable'   // SDK not configured, key missing
  | 'permanent'              // 4xx other than 429, mime not supported, etc.
  | 'validation_failed'      // provider returned malformed JSON or out-of-schema fields
  | 'budget_exceeded'        // monthly parse budget hit for the org
  | 'unknown';

export class ParsingError extends Error {
  constructor(
    public readonly code: ParsingErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ParsingError';
  }
}

export function isRetryable(code: ParsingErrorCode): boolean {
  return code === 'transient' || code === 'rate_limit';
}
