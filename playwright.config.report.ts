import baseConfig from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...baseConfig,
  reporter: [
    ['list'],
    ['html', { open: 'always' }],
  ],
  use: {
    ...baseConfig.use,
    headless: process.env.CI ? true : baseConfig.use?.headless ?? false,
  },
});
