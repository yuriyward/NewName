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

const MUPDF_WASM_SOURCE = path.resolve(
  process.cwd(),
  'node_modules',
  'mupdf',
  'dist',
  'mupdf-wasm.wasm',
);

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: 'assets/icon.svg',
  },
  manifest: {
    name: 'NewName',
    description:
      'Intelligent, context-aware file renamer for Chrome downloads.',
    version: '0.1.6',
    minimum_chrome_version: '138',
    permissions: ['alarms', 'downloads', 'storage', 'offscreen'],
    host_permissions: ['<all_urls>'],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
    sandbox: {
      pages: ['sandbox.html'],
    },
    web_accessible_resources: [],
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2W58+sJZ57nVLTHzCUO6W67xB3Pd9saN2pPmqPhu+QC4UfXw8WsnN8s6Z2TgvnhMO068dHPVkGqgldQIenPTaE+DQ2EmivvgjIbQlfKQPvhcwsCSsy0QZeEszDIwb7mx2NlF+As5KpH2Esv7Z3efnjuzRgr2VTMvgD6hZQMrlSRVIx6Fi1u8kLKK6o8QXR8bPU/tugjet8yP8iX/pZ59vZ5+v+DbNUTe+IQ7lgyRsrQ3YGSFLgZqUyq8Lm94X8LOf8QMbNzooJSpy+MAYwTZgfKT9PCNyubXKf9Fh++BMsWDfsBhtzMG8yehd6syl2YAYyvIyHKJoSSr5M80pIzDJwIDAQAB',
    trial_tokens: [
      'AuhYmnInYAtVRQxe2yGkyB6wDylOj8TjMSyxwPLX6v42BAbXkO9ZKLThHOlIAklu04/OOylkyZ5txCDvCCw9uQUAAAB4eyJvcmlnaW4iOiJjaHJvbWUtZXh0ZW5zaW9uOi8vZnBvaWRwcGVlbW1jZGpubmpma29nbWNkZGdoaWdsb2EiLCJmZWF0dXJlIjoiQUlQcm9tcHRBUElGb3JFeHRlbnNpb24iLCJleHBpcnkiOjE3NjA0ODYzOTl9',
    ],
  },
  vite: () => ({
    server: {
      // Allow all origins in dev mode (needed for sandboxed iframe with origin: null)
      // Security note: Only affects dev server, not production builds
      cors: true,
    },
    build: {
      // Suppress Tailwind v4 sourcemap warnings (known issue, doesn't affect functionality)
      sourcemap: false,
    },
    plugins: [
      tailwindcss(),
      viteStaticCopy({
        targets: [
          {
            src: MEDIAINFO_WASM_SOURCE,
            dest: 'wasm',
          },
          {
            src: MUPDF_WASM_SOURCE,
            dest: 'wasm',
          },
        ],
      }),
    ],
  }),
});
