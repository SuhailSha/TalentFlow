import { defineConfig, devices } from '@playwright/test';

/**
 * TF-1-VR — Visual Regression baseline.
 *
 * Runs Playwright against a dev server serving the pre-seeded fixture
 * tenant. Baselines live under `apps/web/tests/vr/__screenshots__/`.
 *
 * Local dev: assumes `pnpm dev` in `apps/web` is already running
 * (config's `webServer` block is intentionally omitted so a locally-
 * running dev server can serve the tests without contention).
 *
 * CI: a GitHub Actions job will:
 *   1. spin up Postgres + Redis service containers
 *   2. seed the fixture tenant via `packages/database/scripts/seed-vr.cjs`
 *      (created in a follow-up ticket)
 *   3. build + start the API in the background
 *   4. run `pnpm --filter @repo/web exec playwright test`
 *   5. upload the diff report on failure
 *
 * Two projects: desktop-1440 (design target) + desktop-1920 (widescreen
 * regression). Mobile viewports are not tested here — mobile has
 * separate visual coverage post-Phase 5 responsive pass.
 */
export default defineConfig({
  testDir: './tests/vr',
  fullyParallel: true,
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Deterministic rendering
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  expect: {
    toHaveScreenshot: {
      // Anti-aliasing + subpixel text vary between machines. 0.15% pixel
      // tolerance is Playwright's guidance for text-heavy UIs.
      maxDiffPixelRatio: 0.0015,
      // Disable animations before capture so entrance transitions don't
      // race the screenshot.
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'desktop-1440',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env['PLAYWRIGHT_CHANNEL'] ?? undefined,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'desktop-1920',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env['PLAYWRIGHT_CHANNEL'] ?? undefined,
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
