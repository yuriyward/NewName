import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...baseConfig.use,
    headless: process.env.CI ? true : (baseConfig.use?.headless ?? false),
  },
});
