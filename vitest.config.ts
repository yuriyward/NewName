import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  test: {
    mockReset: true,
    restoreMocks: true,
  },
  // Providing an explicit dev server port avoids sandbox failures when Vitest boots WXT helpers
  // inside restricted environments (e.g. CI without network permissions).
  // @ts-expect-error - WxtVitest plugin has Vite version mismatch with Vitest's bundled Vite
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
