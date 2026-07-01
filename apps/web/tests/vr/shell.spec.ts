import { expect, test } from './fixtures';

/**
 * Baseline captures for the Slice 3 shell surfaces (TF-1-10 / TF-1-11 /
 * TF-1-12). Each test navigates to the target state, waits for
 * animations to settle, and captures a full-page screenshot.
 *
 * Baselines land under `__screenshots__/`. Running `playwright test
 * --update-snapshots` regenerates them; committing the diff is a
 * design-review event.
 */

test.describe('Sidebar', () => {
  test('expanded sidebar (light)', async ({ authedPage }) => {
    // Force expanded mode.
    await authedPage.evaluate(() => localStorage.setItem('tf.sidebar.collapsed', 'false'));
    await authedPage.reload();
    await expect(authedPage).toHaveScreenshot('sidebar-expanded-light.png', { fullPage: true });
  });

  test('collapsed sidebar (light)', async ({ authedPage }) => {
    await authedPage.evaluate(() => localStorage.setItem('tf.sidebar.collapsed', 'true'));
    await authedPage.reload();
    await expect(authedPage).toHaveScreenshot('sidebar-collapsed-light.png', { fullPage: true });
  });

  test('expanded sidebar (dark)', async ({ authedPage }) => {
    await authedPage.emulateMedia({ colorScheme: 'dark' });
    await authedPage.evaluate(() => {
      localStorage.setItem('tf.sidebar.collapsed', 'false');
      // next-themes uses a class on <html>; force it explicitly.
      document.documentElement.classList.add('dark');
    });
    await authedPage.reload();
    await expect(authedPage).toHaveScreenshot('sidebar-expanded-dark.png', { fullPage: true });
  });

  test('workspace switcher open', async ({ authedPage }) => {
    await authedPage.evaluate(() => localStorage.setItem('tf.sidebar.collapsed', 'false'));
    await authedPage.reload();
    await authedPage.getByLabel(/Workspace: .*Click to switch/i).click();
    // Wait for the popover to settle.
    await authedPage.waitForTimeout(200);
    await expect(authedPage).toHaveScreenshot('workspace-switcher-open.png', { fullPage: true });
  });
});

test.describe('Command Palette', () => {
  test('empty state', async ({ authedPage }) => {
    await authedPage.keyboard.press('Meta+k');
    // Fallback for platforms where Meta isn't the modifier.
    if (!(await authedPage.getByRole('dialog').isVisible().catch(() => false))) {
      await authedPage.keyboard.press('Control+k');
    }
    await authedPage.waitForTimeout(150);
    await expect(authedPage).toHaveScreenshot('cmdpal-empty.png', { fullPage: true });
  });

  test('search results', async ({ authedPage }) => {
    await authedPage.keyboard.press('Meta+k');
    if (!(await authedPage.getByRole('dialog').isVisible().catch(() => false))) {
      await authedPage.keyboard.press('Control+k');
    }
    await authedPage.getByRole('combobox').fill('sarah');
    // Debounced search — allow a moment for results.
    await authedPage.waitForTimeout(600);
    await expect(authedPage).toHaveScreenshot('cmdpal-search-results.png', { fullPage: true });
  });

  test('keyboard shortcut hints', async ({ authedPage }) => {
    // Same as empty — the Tips section is visible when the query is empty.
    // Distinct baseline so future prefix changes don't collide with the
    // vanilla empty state.
    await authedPage.keyboard.press('Meta+k');
    if (!(await authedPage.getByRole('dialog').isVisible().catch(() => false))) {
      await authedPage.keyboard.press('Control+k');
    }
    await authedPage.waitForTimeout(150);
    // Scroll to the Tips group so it's visible in a viewport-height crop.
    await authedPage.getByText(/Type c:, j:, s:, or v:/i).scrollIntoViewIfNeeded();
    await expect(authedPage).toHaveScreenshot('cmdpal-hints.png', { fullPage: true });
  });
});

test.describe('Inbox', () => {
  test('empty state (inbox zero)', async ({ authedPage }) => {
    // Fixture tenant "vr-tenant-empty-inbox" is a seeded variant that
    // owns no notifications. If the default fixture has some, this test
    // navigates to the filtered-empty state via `Mentions`.
    await authedPage.goto('/inbox');
    // If there are notifications, click Mentions (usually zero on fixture).
    const mentionsTab = authedPage.getByRole('button', { name: /^Mentions/i });
    if (await mentionsTab.isVisible()) await mentionsTab.click();
    await authedPage.waitForTimeout(200);
    await expect(authedPage).toHaveScreenshot('inbox-empty.png', { fullPage: true });
  });

  test('list state', async ({ authedPage }) => {
    await authedPage.goto('/inbox');
    // Wait for the first row.
    await authedPage.locator('[role=button][aria-current]').first().waitFor({ timeout: 5_000 }).catch(() => { /* may be empty fixture */ });
    await expect(authedPage).toHaveScreenshot('inbox-list.png', { fullPage: true });
  });

  test('detail state', async ({ authedPage }) => {
    await authedPage.goto('/inbox');
    // Click the first list row to open detail.
    const firstRow = authedPage.locator('[role=button]').filter({ hasText: /./ }).first();
    if (await firstRow.isVisible()) await firstRow.click();
    await authedPage.waitForTimeout(200);
    await expect(authedPage).toHaveScreenshot('inbox-detail.png', { fullPage: true });
  });
});
