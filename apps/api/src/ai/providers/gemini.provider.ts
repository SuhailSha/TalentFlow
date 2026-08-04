import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';

import {
  type LlmModelId,
  type LlmProvider,
  LlmProviderError,
  type LlmRequest,
  type LlmResponse,
} from '../llm-provider.interface';

/**
 * GeminiProvider — TF-1.5-1.
 *
 * Implementation of the LlmProvider contract over @google/generative-ai.
 * The provider is BOUNDED — it knows about Gemini's API and nothing else.
 * If we ever drop Gemini, only this file changes.
 *
 * Boundary discipline:
 *   - No business logic. No knowledge of candidates, jobs, prompts. We
 *     receive an opaque LlmRequest and return an opaque LlmResponse.
 *   - No Prisma. No tenant context. No HTTP request. The orchestration
 *     layer (AiService, Phase 1.5+) handles those concerns and assembles
 *     the LlmRequest.
 *   - No retries. The orchestration layer decides retry policy; this
 *     provider raises typed errors and the caller chooses.
 *
 * Production hardening NOT in this slice but the boundary supports:
 *   - Token-bucket throttling per provider (orchestration layer).
 *   - Failover routing to OpenAI / Anthropic on `kind: 'rate_limit'`
 *     (orchestration layer reads `error.retryable`).
 *   - Per-tenant model selection (just pass a different `model` field).
 */

// Pricing as of 2026-01 in USD / 1M tokens. These are intentionally
// duplicated rather than fetched at runtime — the model→price map is
// part of the deployment, and a stale price is better than a
// runtime-fetched one that might silently change cost calculations
// behind our back.
const GEMINI_PRICING: Record<string, { promptPer1M: number; completionPer1M: number }> = {
  'gemini-1.5-flash': { promptPer1M: 0.075, completionPer1M: 0.3 },
  'gemini-1.5-flash-002': { promptPer1M: 0.075, completionPer1M: 0.3 },
  'gemini-1.5-pro': { promptPer1M: 1.25, completionPer1M: 5.0 },
  'gemini-2.0-flash': { promptPer1M: 0.1, completionPer1M: 0.4 },
  'gemini-2.0-flash-001': { promptPer1M: 0.1, completionPer1M: 0.4 },
};

@Injectable()
export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini' as const;
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenerativeAI | null;

  constructor() {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY not set — GeminiProvider will throw on call(). ' +
          'In dev, the RuleBasedProvider serves as a fallback.',
      );
      this.client = null;
    } else {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  supportsModel(model: LlmModelId): boolean {
    return model.startsWith('gemini-');
  }

  estimateCost(req: { model: LlmModelId; prompt: string; maxTokens: number }): number {
    const pricing = GEMINI_PRICING[req.model];
    if (!pricing) return 0; // Unknown model → can't estimate; surfacing as $0 forces caller to either pick a known model or accept the unknown.
    // Rough token estimation: 4 chars per token. Accurate enough for budget warnings.
    const promptTokens = Math.ceil(req.prompt.length / 4);
    const cost =
      (promptTokens / 1_000_000) * pricing.promptPer1M +
      (req.maxTokens / 1_000_000) * pricing.completionPer1M;
    return Math.round(cost * 1_000_000) / 1_000_000;
  }

  async call<TOutput>(req: LlmRequest<TOutput>): Promise<LlmResponse<TOutput>> {
    if (!this.client) {
      throw new LlmProviderError('GEMINI_API_KEY is not configured', 'auth', this.name, false);
    }
    if (!this.supportsModel(req.model)) {
      throw new LlmProviderError(
        `Model "${req.model}" is not supported by GeminiProvider`,
        'unknown',
        this.name,
        false,
      );
    }

    const startedAt = Date.now();
    const model: GenerativeModel = this.client.getGenerativeModel({
      model: req.model,
      // Structured output via JSON mode + supplied schema. Gemini accepts a
      // JSON schema as a generationConfig hint; we duplicate the Zod schema
      // shape as JSON Schema in the prompt registry (TF-1.5-5). For now,
      // we instruct the model to return JSON and validate post-hoc.
      generationConfig: {
        maxOutputTokens: req.maxTokens,
        // responseMimeType: 'application/json' would force JSON but we
        // also want sources, so we use a hand-rolled JSON contract via
        // prompt instruction. Defer responseSchema until the prompt
        // registry encodes JSON schemas alongside Zod.
        temperature: 0, // Determinism for cache hits.
      },
      systemInstruction: req.systemPrompt,
    });

    let rawText: string;
    let promptTokens = 0;
    let completionTokens = 0;
    try {
      // The SDK does not accept AbortSignal natively yet; we race against
      // a timeout instead. Production should monitor the timeout vs
      // p95 latency and tune.
      const generation = await Promise.race([
        model.generateContent(req.prompt),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new LlmProviderError(
                  'Gemini call exceeded 30s timeout',
                  'timeout',
                  this.name,
                  true,
                ),
              ),
            30_000,
          ),
        ),
      ]);
      rawText = generation.response.text();
      const usage = generation.response.usageMetadata;
      promptTokens = usage?.promptTokenCount ?? 0;
      completionTokens = usage?.candidatesTokenCount ?? 0;
    } catch (err) {
      if (err instanceof LlmProviderError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      // Map common Gemini errors to typed kinds. The SDK's error surface
      // is informal; we treat anything we can't classify as `unknown`.
      if (/safety|blocked|harassment/i.test(msg)) {
        throw new LlmProviderError(msg, 'safety_blocked', this.name, false, err);
      }
      if (/quota|rate|429/i.test(msg)) {
        throw new LlmProviderError(msg, 'rate_limit', this.name, true, err);
      }
      if (/api[- _]?key|unauth|401|403/i.test(msg)) {
        throw new LlmProviderError(msg, 'auth', this.name, false, err);
      }
      throw new LlmProviderError(msg, 'unknown', this.name, true, err);
    }

    // Parse the JSON. We expect: { output: <T>, sources: [...] }.
    // Schema validation happens against `output` only; sources are
    // validated separately.
    let parsed: { output: unknown; sources: unknown };
    try {
      // Some models wrap JSON in ```json fences; strip if present.
      const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (err) {
      throw new LlmProviderError(
        `Model returned non-JSON output (first 200 chars: ${rawText.slice(0, 200)})`,
        'invalid_output',
        this.name,
        true,
        err,
      );
    }

    // Provenance gate. The prompt MUST ask for sources; we MUST receive them.
    if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
      throw new LlmProviderError(
        'Model output missing required sources[] array (provenance contract)',
        'no_provenance',
        this.name,
        false,
      );
    }

    // Schema validate the output.
    const validated = req.responseSchema.safeParse(parsed.output);
    if (!validated.success) {
      throw new LlmProviderError(
        `Output failed schema validation: ${validated.error.message}`,
        'invalid_output',
        this.name,
        true,
        validated.error,
      );
    }

    const latencyMs = Date.now() - startedAt;
    const pricing = GEMINI_PRICING[req.model];
    const costUsd = pricing
      ? Math.round(
          ((promptTokens / 1_000_000) * pricing.promptPer1M +
            (completionTokens / 1_000_000) * pricing.completionPer1M) *
            1_000_000,
        ) / 1_000_000
      : 0;

    return {
      output: validated.data,
      sources: parsed.sources as LlmResponse<TOutput>['sources'],
      usage: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
      costUsd,
      latencyMs,
      model: req.model,
      provider: this.name,
    };
  }
}
