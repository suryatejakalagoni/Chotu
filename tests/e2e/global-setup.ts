import { chromium, type FullConfig } from '@playwright/test';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const AUTH_FILE = 'tests/e2e/.auth/user.json';

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:3000';
  const email    = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      '\n\nMissing test credentials.\n' +
      'Copy .env.test.example → .env.test and fill in TEST_USER_EMAIL + TEST_USER_PASSWORD.\n' +
      'Create that account in your Supabase dev project (not production).\n'
    );
  }

  mkdirSync(dirname(resolve(AUTH_FILE)), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext(); // fresh — no storageState
  const page    = await context.newPage();

  // Turbopack compiles routes on first request — give it time.
  // Subsequent test navigations use Playwright's normal 30 s default.
  context.setDefaultNavigationTimeout(90_000);

  await page.goto(`${baseURL}/login`);

  // The login form: label="Email", label="Password", button name="Sign in"
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // GalaxyWipe animation plays (~1 s), then router.push('/dashboard')
  await page.waitForURL(`${baseURL}/dashboard`, { timeout: 20_000 });

  // Save cookies so all tests reuse this session without logging in again
  await context.storageState({ path: AUTH_FILE });
  await browser.close();
}
