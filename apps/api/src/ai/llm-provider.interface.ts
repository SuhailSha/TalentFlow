import type { ZodSchema } from 'zod';

/**
 * LlmProvider — TF-1.5-1, the AI architecture's outermost boundary.
 *
 * Every LLM call in the application MUST go through this interface. Business
 * code never imports a vendor SDK directly. Adding OpenAI or Anthropic is a
 * matter of writing a new adapter that satisfies this contract — zero
 * business-logic change required.
 *
 * Contract guarantees (locked by ADR-004):
 *
 *   1. Structured output. Every call declares a Zod schema; the provider
 *      validates the model's response against it and rejects unparseable
 *      output. Callers get a typed result, never raw JSON or text.
 *
 *   2. Provenance is mandatory. The response includes a `sources[]` array
 *      citing the input data used. The provider rejects model output that
 *      omits sources (e.g., the prompt asked for them and they're missing).
 *      This is the safeguard against hallucination-as-fact.
 *
 *   3. Cost is reported in the response. Tokens used (prompt + completion),
 *      dollar cost (provider-published rate × tokens), latency, model id,
 *      and provider name. Six-axis cost tracking per the user requirement.
 *
 *   4. Advisory-only — the provider exposes no decision-making methods.
 *      It returns suggestions; the application surfaces them; recruiters
 *      decide.
 *
 *   5. Cancellation. Optional AbortSignal lets callers tear down a slow
 *      request when the user navigates away.
 *
 * Implementations live in `apps/api/src/ai/providers/`:
 *   - gemini.provider.ts (default; Phase 1.5)
 *   - openai.provider.ts (Phase 1.5+; pluggable)
 *   - anthropic.provider.ts (Phase 1.5+; pluggable)
 *   - rule-based.provider.ts (deterministic fallback; never an LLM call)
 *
 * @see docs/architecture/adr/adr-004-ai-architecture.md
 */

export type LlmProviderName = 'gemini' | 'openai' | 'anthropic' | 'rule-based';

/** Identifies a specific model within a provider, e.g. "gemini-1.5-flash". */
export type LlmModelId = string;

/** Token usage breakdown. */
export interface LlmTokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

/** A single source citation supporting a model claim. */
export interface LlmSource {
  type: 'resume_version' | 'interview_note' | 'submission' | 'job' | 'candidate' | 'system';
  id: string;
  excerpt?: string;
}

/** Outbound request to the provider. */
export interface LlmRequest<TOutput> {
  /** Logical use-case identifier; routes to a prompt in the prompt registry (TF-1.5-5). */
  useCase: string;
  /** Provider-pinned model id (e.g. "gemini-1.5-flash-002"). */
  model: LlmModelId;
  /** System prompt — instructions to the model. */
  systemPrompt: string;
  /** User prompt — the actual question / data block. */
  prompt: string;
  /** Zod schema describing the structured output. */
  responseSchema: ZodSchema<TOutput>;
  /** Max tokens to generate. Provider-enforced. */
  maxTokens: number;
  /** Required: every response must cite sources (provenance contract). */
  requireSources: true;
  /** Tracking metadata; never sent to the model. */
  metadata: {
    tenantId: string;
    userId:   string;
    contextHash: string;
  };
  /** Optional abort. */
  signal?: AbortSignal;
}

/** Inbound response from the provider. */
export interface LlmResponse<TOutput> {
  output:    TOutput;            // schema-validated
  sources:   LlmSource[];        // provenance — non-empty per contract
  usage:     LlmTokenUsage;
  costUsd:   number;             // 6-decimal precision
  latencyMs: number;
  model:     LlmModelId;
  provider:  LlmProviderName;
}

/** Possible failures, surfaced as typed exceptions. */
export class LlmProviderError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | 'timeout'
      | 'rate_limit'
      | 'invalid_output'
      | 'no_provenance'
      | 'safety_blocked'
      | 'auth'
      | 'unknown',
    public readonly providerName: LlmProviderName,
    public readonly retryable: boolean,
    public readonly underlying?: unknown,
  ) {
    super(`[${providerName}/${kind}] ${message}`);
    this.name = 'LlmProviderError';
  }
}

/**
 * The contract every adapter implements. No business logic should import
 * from this file beyond these types.
 */
export interface LlmProvider {
  readonly name: LlmProviderName;

  /**
   * Execute a single inference. Returns a typed, validated response.
   * Throws LlmProviderError on any non-success path.
   */
  call<TOutput>(req: LlmRequest<TOutput>): Promise<LlmResponse<TOutput>>;

  /**
   * Estimate cost in USD without calling the model. Used by the cost
   * meter to enforce per-tenant budgets BEFORE incurring spend.
   */
  estimateCost(req: { model: LlmModelId; prompt: string; maxTokens: number }): number;

  /**
   * True if this provider knows how to serve `model`. Used by the router
   * to dispatch requests to the correct adapter when multiple providers
   * are configured.
   */
  supportsModel(model: LlmModelId): boolean;
}
