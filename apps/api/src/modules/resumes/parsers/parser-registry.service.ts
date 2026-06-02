import { Injectable, Logger } from '@nestjs/common';
import type { ResumeParserProvider } from '@repo/database';

import { GeminiFlashParser } from './gemini-flash.parser';
import { RuleBasedParser } from './rule-based.parser';
import type { ResumeParserProviderAdapter } from './parser-provider.interface';

/**
 * ParserRegistry — single seam business logic touches.
 *
 * Given an organisation's preferred + fallback providers, returns an ordered
 * list of provider adapters to try. The orchestrator iterates this list in
 * order; first success wins, failures fall over to the next.
 *
 * The final entry is ALWAYS RuleBasedParser — it has no external deps and is
 * the contract-bound safety net that guarantees ParsingJob always reaches a
 * terminal state.
 *
 * Adding a new provider:
 *   1. Implement ResumeParserProviderAdapter (see GeminiFlashParser for the
 *      template).
 *   2. Register it as a NestJS @Injectable.
 *   3. Inject it into ParserRegistry's constructor and append to providers.
 *   No other code in the platform needs to change.
 */
@Injectable()
export class ParserRegistry {
  private readonly logger = new Logger(ParserRegistry.name);
  private readonly providers: ResumeParserProviderAdapter[];

  constructor(
    private readonly gemini:    GeminiFlashParser,
    private readonly ruleBased: RuleBasedParser,
  ) {
    this.providers = [this.gemini, this.ruleBased];
  }

  /** Look up a provider by enum value. Returns null when unknown. */
  byName(name: ResumeParserProvider): ResumeParserProviderAdapter | null {
    return this.providers.find((p) => p.name === name) ?? null;
  }

  /**
   * Resolve the failover chain for one parse attempt.
   *
   * Order:
   *   1. preferred (if available and known)
   *   2. fallback  (if different from preferred and available)
   *   3. RULE_BASED safety net (always last; always available)
   *
   * Unavailable providers are skipped so e.g. Gemini is silently dropped when
   * GEMINI_API_KEY is missing in dev.
   */
  resolveChain(
    preferred: ResumeParserProvider,
    fallback?: ResumeParserProvider | null,
  ): ResumeParserProviderAdapter[] {
    const seen = new Set<string>();
    const chain: ResumeParserProviderAdapter[] = [];

    const tryAdd = (name: ResumeParserProvider | null | undefined) => {
      if (!name) return;
      if (seen.has(name)) return;
      const p = this.byName(name);
      if (!p) {
        this.logger.warn(`Unknown provider in chain: ${name}`);
        return;
      }
      if (!p.isAvailable()) {
        this.logger.debug(`Provider ${name} is not available — skipping`);
        return;
      }
      seen.add(name);
      chain.push(p);
    };

    tryAdd(preferred);
    tryAdd(fallback);
    // RuleBased is the always-on safety net.
    if (!seen.has(this.ruleBased.name)) chain.push(this.ruleBased);

    return chain;
  }

  /** All registered providers — useful for `/admin/parsing-providers` later. */
  list(): ResumeParserProviderAdapter[] {
    return this.providers.slice();
  }
}
