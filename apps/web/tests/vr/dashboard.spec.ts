import { expect, test } from './fixtures';

/**
 * Dashboard baselines (TF-2-5).
 *
 * The fixture tenant is seeded so that action-required lists are all
 * non-empty and deterministic — the greeting reads "N things need you
 * today" and the CommandCenter renders one row per severity. To capture
 * the "all-clear" variant separately, seed a second tenant with no
 * action-required data and set VR_TENANT_SLUG accordingly.
 */

test.describe('Dashboard', () => {
  test('action-required (light)', async ({ authedPage }) => {
    await authedPage.goto('/dashboard');
    // Wait for the KPI strip AND the AI Command Center to be mounted.
    await authedPage.getByRole('region', { name: /AI Command Center/i }).waitFor({ timeout: 5_000 });
    // Formatted counts + relative timestamps need a beat to hydrate.
    await authedPage.waitForTimeout(400);
    await expect(authedPage).toHaveScreenshot('dashboard-action-required-light.png', { fullPage: true });
  });

  test('kpi strip only (crop)', async ({ authedPage }) => {
    // Crop-focused capture of just the KPI strip. Helps designers audit
    // spacing + delta rendering without the whole page context.
    await authedPage.goto('/dashboard');
    const strip = authedPage.locator('nav, main').locator('..').getByRole('link', { name: /Overdue reminders/i }).locator('..');
    await strip.waitFor({ timeout: 5_000 });
    await expect(strip).toHaveScreenshot('dashboard-kpi-strip.png');
  });

  test('command center only (crop)', async ({ authedPage }) => {
    await authedPage.goto('/dashboard');
    const cc = authedPage.getByRole('region', { name: /AI Command Center/i });
    await cc.waitFor({ timeout: 5_000 });
    await expect(cc).toHaveScreenshot('dashboard-command-center.png');
  });

  test('dark mode', async ({ authedPage }) => {
    await authedPage.emulateMedia({ colorScheme: 'dark' });
    await authedPage.evaluate(() => document.documentElement.classList.add('dark'));
    await authedPage.goto('/dashboard');
    await authedPage.getByRole('region', { name: /AI Command Center/i }).waitFor({ timeout: 5_000 });
    await authedPage.waitForTimeout(400);
    await expect(authedPage).toHaveScreenshot('dashboard-action-required-dark.png', { fullPage: true });
  });
});
