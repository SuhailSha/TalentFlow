import { test as base, expect } from '@playwright/test';

/**
 * Fixture-tenant login helper for visual-regression tests.
 *
 * The seed script (packages/database/scripts/seed-vr.cjs — created in
 * follow-up) provisions a stable tenant `vr-tenant` with fixture data
 * (10 candidates, 3 jobs, 5 submissions, 8 notifications) so every
 * baseline captures identical content.
 *
 * Credentials come from environment variables so CI can rotate them;
 * defaults match the seed script's output for local runs.
 */

const VR_TENANT_SLUG    = process.env['E2E_VR_TENANT']   ?? 'vr-tenant';
const VR_EMAIL          = process.env['E2E_VR_EMAIL']    ?? 'vr@acme-demo.com';
const VR_PASSWORD       = process.env['E2E_VR_PASSWORD'] ?? 'Demo1234!';

export const test = base.extend<{ authedPage: import('@playwright/test').Page }>({
  authedPage: async ({ page }, use) => {
    // Programmatic login: hit /login, fill the form, wait for redirect
    // to the dashboard. Alternative would be to `page.context().addCookies`
    // with a pre-issued JWT but that requires the seed script to output
    // one; login-via-form is more portable.
    await page.goto('/login');
    await page.getByLabel(/Workspace/i).fill(VR_TENANT_SLUG);
    await page.getByLabel(/Email/i).fill(VR_EMAIL);
    await page.getByLabel(/Password/i).fill(VR_PASSWORD);
    await page.getByRole('button', { name: /Sign in/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await use(page);
  },
});

export { expect };
