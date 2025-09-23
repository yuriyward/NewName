import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  reporter: 'html',
  timeout: 90_000,
  use: {
    headless: false, // Chromium extensions require headed mode
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    baseURL: 'http://127.0.0.1:43210',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node scripts/fixtures-server.js',
    url: 'http://127.0.0.1:43210',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
