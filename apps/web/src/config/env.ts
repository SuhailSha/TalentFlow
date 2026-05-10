import { z } from 'zod';

/**
 * Frontend environment schema.
 *
 * Only NEXT_PUBLIC_ variables are available in client bundles.
 * Server-only variables (no prefix) are only accessible in Server Components,
 * Route Handlers, and Middleware — never shipped to the browser.
 */
const envSchema = z.object({
  // ─── Public (client + server) ─────────────────────────────────────────────
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL must be a valid URL')
    .default('http://localhost:3001/api/v1'),

  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .default('http://localhost:3000'),

  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('Recruitment Platform'),

  NEXT_PUBLIC_ENABLE_DEVTOOLS: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),

  // ─── Runtime ──────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const result = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'],
  NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
  NEXT_PUBLIC_APP_NAME: process.env['NEXT_PUBLIC_APP_NAME'],
  NEXT_PUBLIC_ENABLE_DEVTOOLS: process.env['NEXT_PUBLIC_ENABLE_DEVTOOLS'],
  NODE_ENV: process.env['NODE_ENV'],
});

if (!result.success) {
  const issues = result.error.issues
    .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`\n❌ Invalid frontend environment:\n\n${issues}\n`);
}

export const env = result.data;
export type Env = typeof env;
