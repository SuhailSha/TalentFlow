import { type EnvConfig, envSchema } from './env.schema';

/**
 * Called by ConfigModule's `validate` option.
 *
 * Receives the raw merged environment (process.env + .env file).
 * Validates it against the Zod schema and returns the typed, coerced config.
 *
 * Throws a descriptive error if validation fails — NestJS will surface this
 * during module initialization and prevent the app from starting with a
 * broken configuration.
 */
export function validateEnv(rawConfig: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(rawConfig);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`\n❌ Environment configuration is invalid:\n\n${issues}\n`);
  }

  return result.data;
}
