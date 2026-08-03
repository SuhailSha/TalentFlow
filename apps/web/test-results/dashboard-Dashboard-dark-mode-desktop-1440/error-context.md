# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard >> dark mode
- Location: tests\vr\dashboard.spec.ts:39:7

# Error details

```
Test timeout of 30000ms exceeded while setting up "authedPage".
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import { test as base, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Fixture-tenant login helper for visual-regression tests.
  5  |  *
  6  |  * The seed script (packages/database/scripts/seed-vr.cjs — created in
  7  |  * follow-up) provisions a stable tenant `vr-tenant` with fixture data
  8  |  * (10 candidates, 3 jobs, 5 submissions, 8 notifications) so every
  9  |  * baseline captures identical content.
  10 |  *
  11 |  * Credentials come from environment variables so CI can rotate them;
  12 |  * defaults match the seed script's output for local runs.
  13 |  */
  14 | 
  15 | const VR_TENANT_SLUG    = process.env['E2E_VR_TENANT']   ?? 'vr-tenant';
  16 | const VR_EMAIL          = process.env['E2E_VR_EMAIL']    ?? 'vr@acme-demo.com';
  17 | const VR_PASSWORD       = process.env['E2E_VR_PASSWORD'] ?? 'Demo1234!';
  18 | 
  19 | export const test = base.extend<{ authedPage: import('@playwright/test').Page }>({
  20 |   authedPage: async ({ page }, use) => {
  21 |     // Programmatic login: hit /login, fill the form, wait for redirect
  22 |     // to the dashboard. Alternative would be to `page.context().addCookies`
  23 |     // with a pre-issued JWT but that requires the seed script to output
  24 |     // one; login-via-form is more portable.
> 25 |     await page.goto('/login');
     |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  26 |     await page.getByLabel(/Workspace/i).fill(VR_TENANT_SLUG);
  27 |     await page.getByLabel(/Email/i).fill(VR_EMAIL);
  28 |     await page.getByLabel(/Password/i).fill(VR_PASSWORD);
  29 |     await page.getByRole('button', { name: /Sign in/i }).click();
  30 |     await page.waitForURL('**/dashboard', { timeout: 10_000 });
  31 |     await use(page);
  32 |   },
  33 | });
  34 | 
  35 | export { expect };
  36 | 
```