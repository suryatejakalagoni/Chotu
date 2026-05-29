import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.test for local runs (CI injects vars directly via secrets)
const envTestPath = resolve(process.cwd(), '.env.test');
if (existsSync(envTestPath)) {
  for (const line of readFileSync(envTestPath, 'utf8').split('\n')) {
    const match = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',

  // Playwright starts (or reuses) the dev server before running any tests.
  // `reuseExistingServer: true` means if you already have `npm run dev`
  // running, Playwright won't start a second one — it just waits for the port.
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000, // 2 min — Turbopack cold-start on first run
    stdout: 'pipe',
    stderr: 'pipe',
  },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL,
    // All tests start authenticated by default.
    // Tests that need a fresh (unauthenticated) context use `unauthTest` from fixtures.ts.
    storageState: 'tests/e2e/.auth/user.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
