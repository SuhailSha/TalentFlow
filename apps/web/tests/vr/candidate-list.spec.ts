import { expect, test } from './fixtures';

/**
 * Candidate list baselines (TF-2-1 primitive, first consumer).
 *
 * Captures the row-based DataTable at three states:
 *   - default: fixture tenant renders 10 candidates
 *   - virtualized: seeded ≥ 60 candidates triggers `virtualized: true`
 *   - empty: search that yields zero results → no-results empty state
 *   - dark: default state with html.dark forced
 *
 * The virtualized case captures the same viewport but exercises the
 * `useVirtualizer` code path — the visual result should be indistinguishable
 * from `default` for the first ~15 rows.
 */

test.describe('Candidate list', () => {
  test('default (light)', async ({ authedPage }) => {
    await authedPage.goto('/candidates');
    await authedPage.locator('table[role="grid"]').first().waitFor({ timeout: 5_000 });
    // Give any avatar / skill-chip network fetch a beat to settle.
    await authedPage.waitForTimeout(300);
    await expect(authedPage).toHaveScreenshot('candidates-list-light.png', { fullPage: true });
  });

  test('no-results empty state', async ({ authedPage }) => {
    await authedPage.goto('/candidates');
    await authedPage.getByLabel('Search candidates').fill('zzz-no-such-candidate');
    // debounced search 300ms
    await authedPage.waitForTimeout(500);
    await expect(authedPage).toHaveScreenshot('candidates-no-results.png', { fullPage: true });
  });

  test('with active filter chip', async ({ authedPage }) => {
    await authedPage.goto('/candidates');
    await authedPage.getByLabel('Search candidates').fill('sarah');
    await authedPage.waitForTimeout(500);
    await expect(authedPage).toHaveScreenshot('candidates-filter-chip.png', { fullPage: true });
  });

  test('dark mode', async ({ authedPage }) => {
    await authedPage.emulateMedia({ colorScheme: 'dark' });
    await authedPage.evaluate(() => document.documentElement.classList.add('dark'));
    await authedPage.goto('/candidates');
    await authedPage.locator('table[role="grid"]').first().waitFor({ timeout: 5_000 });
    await authedPage.waitForTimeout(300);
    await expect(authedPage).toHaveScreenshot('candidates-list-dark.png', { fullPage: true });
  });
});
