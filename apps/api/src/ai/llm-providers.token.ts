/**
 * Injection token for the collection of LlmProvider implementations.
 * Use with `@Inject(LLM_PROVIDERS) private providers: LlmProvider[]` to
 * iterate available providers in routing code.
 */
export const LLM_PROVIDERS = Symbol('LLM_PROVIDERS');
