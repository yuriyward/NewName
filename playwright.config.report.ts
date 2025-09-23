import baseConfig from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...baseConfig,
  reporter: [
    ['list'],
    ['html', { open: 'always' }],
  ],
});
