import { Global, Module } from '@nestjs/common';

import { GeminiProvider } from './providers/gemini.provider';
import { LLM_PROVIDERS } from './llm-providers.token';

/**
 * AiModule — Phase 1.5 boundary module.
 *
 * Owns the LlmProvider implementations. Business modules (Phase 6) will
 * inject `AiService` which routes requests to the appropriate provider
 * based on the prompt registry (TF-1.5-5).
 *
 * For now we register a single provider (Gemini). Adding OpenAI or
 * Anthropic is a matter of:
 *
 *   1. Implementing the LlmProvider interface in providers/openai.provider.ts
 *   2. Adding the class to the providers + LLM_PROVIDERS array below
 *   3. Updating the prompt registry to route some use cases to that
 *      provider via its model id.
 *
 * Business modules NEVER import a provider directly. They inject either
 * `AiService` (TF-1.5+) or the `LLM_PROVIDERS` collection if they need
 * to introspect available providers.
 */
@Global()
@Module({
  providers: [
    GeminiProvider,
    {
      provide: LLM_PROVIDERS,
      // List form so the router can iterate. When OpenAI / Anthropic
      // adapters land, append them to this useFactory output.
      useFactory: (gemini: GeminiProvider) => [gemini],
      inject: [GeminiProvider],
    },
  ],
  exports: [LLM_PROVIDERS, GeminiProvider],
})
export class AiModule {}
