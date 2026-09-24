import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3210';
const authState =
  process.env.MSM_AUTH_STORAGE_STATE ?? path.join(rootDir, '.auth', 'user.json');

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  globalSetup: './support/globalSetup.ts',
  outputDir: 'test-results',
  preserveOutput: 'failures-only',
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
      ]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  retries: 0,
  testDir: './tests',
  timeout: 45_000,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    storageState: authState,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  workers: 1,
  projects: [
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
    },
    {
      name: 'desktop',
      testIgnore: /api\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { height: 800, width: 1280 },
      },
    },
    {
      name: 'mobile',
      testIgnore: /api\/.*\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
      },
    },
  ],
});
