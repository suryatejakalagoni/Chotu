/**
 * Central test fixture file. Import `test` and `expect` from here, not from
 * @playwright/test directly, so fixtures are always applied consistently.
 *
 * Two test flavours:
 *
 *   test        — starts with a logged-in session (storageState from global-setup)
 *   unauthTest  — starts with a fresh browser context, no cookies
 *                 Use this for login / signup / forgot-password tests
 */

import { test as base, expect, type Page } from '@playwright/test';

export { expect };

// Default test — authenticated via storageState set in playwright.config.ts
export const test = base;

// Unauthenticated test — fresh context, no cookies, no storageState
export const unauthTest = base.extend<{ page: Page }>({
  page: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page    = await context.newPage();
    await use(page);
    await context.close();
  },
});

/**
 * Unique test-scoped label so data created by one test doesn't bleed into
 * another. Prefix anything you create in a test with this value.
 *
 * Example:
 *   const tag = testTag(testInfo);
 *   await page.getByLabel('Title').fill(`${tag} Maths assignment`);
 *
 * Then in afterEach, find rows containing `tag` and delete them.
 */
export function testTag(testInfo: { testId: string }): string {
  return `[e2e-${testInfo.testId.slice(0, 8)}]`;
}
