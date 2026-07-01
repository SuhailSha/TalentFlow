import type { ZodSchema } from 'zod';

import type { LlmModelId, LlmProviderName } from '../llm-provider.interface';

/**
 * Prompt registry — TF-1.5-5.
 *
 * Every AI call routes through this registry. Each entry binds:
 *   - A use-case key (referenced by the application layer)
 *   - A semantic version (`v1`, `v2`, ...)
 *   - A pinned model id (we never use `latest`)
 *   - A preferred provider, with documented fallbacks
 *   - The system prompt + user-prompt builder
 *   - A response Zod schema (so output is typed end-to-end)
 *   - Fixture inputs used by snapshot tests (Phase 1.5+)
 *
 * Promotion of a new version is a PR: copy the previous entry, increment
 * the version, change the prompt or schema, and let the prompt registry
 * route to the new version via the feature-flag-controlled
 * `currentVersion` field.
 *
 * Provenance contract (locked by ADR-004 §4):
 *   Every system prompt must end with an explicit instruction to emit
 *   `sources[]`. The GeminiProvider enforces this at the response
 *   boundary — calls without sources are rejected before business code
 *   sees them.
 */

export interface PromptDefinition<TInput, TOutput> {
  useCase:        string;
  version:        string;                   // e.g. "v1"
  model:          LlmModelId;               // pinned, e.g. "gemini-1.5-flash-002"
  preferredProvider: LlmProviderName;
  /** Ordered failover list. AiService walks this on `retryable` errors. */
  fallbackOrder:  LlmProviderName[];
  systemPrompt:   string;
  /** Build the user prompt from typed input. */
  buildPrompt:    (input: TInput) => string;
  /** Zod schema describing the validated `output` field of the response. */
  responseSchema: ZodSchema<TOutput>;
  /** Estimated max tokens for the completion. Cost-meter pre-charges this. */
  maxTokens:      number;
  /** Snapshot-test fixtures. Not exposed at runtime. */
  fixtures?:      Array<{ input: TInput; description: string }>;
}

const registry = new Map<string, PromptDefinition<unknown, unknown>>();

/**
 * Register a prompt at module load time. Re-registration of the same
 * (useCase, version) pair throws — the registry is intentionally
 * single-write to surface accidental overrides.
 */
export function registerPrompt<TInput, TOutput>(def: PromptDefinition<TInput, TOutput>): void {
  const key = registryKey(def.useCase, def.version);
  if (registry.has(key)) {
    throw new Error(`Prompt already registered: ${key}`);
  }
  // Validate the system prompt mentions sources — provenance contract.
  if (!/sources/i.test(def.systemPrompt)) {
    throw new Error(
      `Prompt "${def.useCase}@${def.version}" system prompt must instruct ` +
      'the model to emit a `sources[]` array. The provenance contract is ' +
      'enforced at the provider boundary; prompts that omit the instruction ' +
      'will fail at runtime with `no_provenance` errors.',
    );
  }
  registry.set(key, def as PromptDefinition<unknown, unknown>);
}

/**
 * Look up a prompt by use-case + version. Returns undefined when the
 * exact pairing isn't registered.
 */
export function getPrompt<TInput, TOutput>(
  useCase: string,
  version: string,
): PromptDefinition<TInput, TOutput> | undefined {
  return registry.get(registryKey(useCase, version)) as
    | PromptDefinition<TInput, TOutput>
    | undefined;
}

/** All registered prompts; used by admin tooling (Phase 7). */
export function listPrompts(): Array<{ useCase: string; version: string; model: LlmModelId; provider: LlmProviderName }> {
  const out: ReturnType<typeof listPrompts> = [];
  for (const [, def] of registry) {
    out.push({
      useCase:  def.useCase,
      version:  def.version,
      model:    def.model,
      provider: def.preferredProvider,
    });
  }
  return out.sort((a, b) => a.useCase.localeCompare(b.useCase) || a.version.localeCompare(b.version));
}

/** Visible for tests. */
export function clearRegistry(): void {
  registry.clear();
}

function registryKey(useCase: string, version: string): string {
  return `${useCase}@${version}`;
}
