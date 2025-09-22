import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  manifest: {
    name: 'NewName',
    description: 'Intelligent, context-aware file renamer for Chrome downloads.',
    version: '0.1.0',
    minimum_chrome_version: '138',
    permissions: ['downloads', 'storage', 'notifications', 'offscreen'],
    host_permissions: ['<all_urls>'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
