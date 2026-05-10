// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // ─── Global ignores ───────────────────────────────────────────────────────
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/packages/database/src/generated/**',
      '**/*.config.mjs',
      '**/*.config.js',
    ],
  },

  // ─── Base JavaScript rules ─────────────────────────────────────────────────
  js.configs.recommended,

  // ─── TypeScript rules ─────────────────────────────────────────────────────
  ...tseslint.configs.recommended,

  // ─── Custom rules applied across all apps and packages ────────────────────
  {
    rules: {
      // Prevent accidental any — warn for gradual adoption, upgrade to error later
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow unused vars prefixed with _ (e.g. _req in express middleware)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Enforce `import type` for type-only imports — reduces runtime bundle
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      // Prevent accidental console.log in production code
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Never ship debugger statements
      'no-debugger': 'error',

      // Prefer === over ==
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // No var — use const/let
      'no-var': 'error',

      // Prefer const
      'prefer-const': 'error',
    },
  },
);
