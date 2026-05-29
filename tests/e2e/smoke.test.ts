/**
 * Phase 2 smoke test — verifies the auth fixture works.
 * The storageState from global-setup.ts is applied automatically.
 * This test should pass before we write the full Phase 3 suite.
 */

import { test, expect } from './fixtures';

test('authenticated session loads dashboard without a login redirect', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/dashboard');

  // Must stay on /dashboard — not bounced to /login
  await expect(page).toHaveURL(/\/dashboard/);

  // The "CHOTU" brand link in the top bar is the most stable landmark:
  // it renders on every viewport and is always the first link in the header.
  await expect(page.getByRole('link', { name: 'CHOTU' })).toBeVisible();

  // No console errors during load (catches hydration mismatches and runtime crashes)
  expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
});
