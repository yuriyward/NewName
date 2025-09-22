import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  test: {
    mockReset: true,
    restoreMocks: true,
  },
  // @ts-expect-error - WxtVitest plugin has Vite version mismatch with Vitest's bundled Vite
  plugins: [WxtVitest()],
});
