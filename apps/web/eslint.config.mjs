import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

// eslint-plugin-jsx-a11y provides ~40 accessibility rules covering ARIA
// misuse, missing alt text, click handlers without keyboard equivalents,
// invalid role usage, etc. `next/core-web-vitals` already re-exports a
// permissive subset; we layer the plugin's `strict` config on top so
// the full ruleset lints in CI.
//
// Rationale for a couple of rule overrides:
//   - `no-autofocus`: kept off for the login page + inline editors where
//     autofocus is UX-correct. Enable per file if a scan turns up abuse.
//   - `label-has-associated-control`: strict mode requires `htmlFor` OR
//     nested control; shadcn Label is Radix Label which passes at
//     runtime but confuses this rule. Documented workaround: pass
//     `htmlFor={id}` consistently — which we already do everywhere.
const config = [
  ...compat.extends(
    'next/core-web-vitals',
    'next/typescript',
    'plugin:jsx-a11y/strict',
  ),
  {
    ignores: ['.next/', 'node_modules/', 'dist/', 'public/mockups/'],
  },
  {
    rules: {
      // Nesting is the only reliable way to associate a label with a
      // React component that renders its own input in practice; strict
      // mode fights this. We already pass htmlFor consistently.
      'jsx-a11y/label-has-associated-control': ['warn', { assert: 'either' }],
    },
  },
];

export default config;
