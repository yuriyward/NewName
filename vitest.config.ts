import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  test: {
    mockReset: true,
    restoreMocks: true,
    exclude: ['tests/e2e/**', '**/node_modules/**'],
    testTimeout: 100, // ms. Hard timeout - tests fail if exceeded
    slowTestThreshold: 10, // Show warning for tests slower than 10ms
  },
  // Providing an explicit dev server port avoids sandbox failures when Vitest boots WXT helpers
  // inside restricted environments (e.g. CI without network permissions).
  plugins: [
    WxtVitest({
      dev: {
        server: {
          host: '127.0.0.1',
          port: 3999,
        },
      },
    }),
  ],
});
