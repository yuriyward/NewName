import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { defineConfig } from 'wxt';

const MEDIAINFO_WASM_SOURCE = path.resolve(
  process.cwd(),
  'node_modules',
  'mediainfo.js',
  'dist',
  'MediaInfoModule.wasm',
);

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  manifest: {
    name: 'NewName',
    description:
      'Intelligent, context-aware file renamer for Chrome downloads.',
    version: '0.1.1',
    minimum_chrome_version: '138',
    permissions: ['downloads', 'storage', 'notifications', 'offscreen'],
    host_permissions: ['<all_urls>'],
  },
  vite: () => ({
    plugins: [
      tailwindcss(),
      viteStaticCopy({
        targets: [
          {
            src: MEDIAINFO_WASM_SOURCE,
            dest: 'wasm',
          },
        ],
      }),
    ],
  }),
});
