import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Keep MV3 extension tests serial; Chromium reuses a single service worker
  // for the loaded build and parallel workers end up racing the shared state.
  fullyParallel: false,
  reporter: 'html',
  timeout: 90_000,
  use: {
    headless: !!process.env.CI,
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    baseURL: 'http://127.0.0.1:43210',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    command: 'node scripts/fixtures-server.mjs',
    url: 'http://127.0.0.1:43210',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
