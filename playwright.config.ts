import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  retries: 1,
  workers: 3,
  use: {
    baseURL: 'https://club-administration.qa.qubika.com',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], channel: 'firefox' },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], channel: 'webkit' },
    },
  ],
});