import path from 'node:path';
import fs from 'node:fs/promises';
import { test as base, chromium, expect, type BrowserContext, type Page } from '@playwright/test';

type Fixtures = {
  context: BrowserContext;
  page: Page;
  downloadsDir: string;
  extensionId: string;
};

export const test = base.extend<Fixtures>({
    // biome-ignore lint/correctness/noEmptyPattern: Playwright requires empty destructuring for fixtures
    downloadsDir: async ({}, use, testInfo) => {
    const dir = path.join(process.cwd(), 'tmp', 'pw-downloads', testInfo.project.name, testInfo.title.replace(/\W+/g, '_'));
    await fs.mkdir(dir, { recursive: true });
    await use(dir);
  },

  context: async ({ downloadsDir }, use) => {
    const extensionPath = path.resolve('.output', 'chrome-mv3');
    const hasBuild = await fs.stat(extensionPath).then(() => true).catch(() => false);
    if (!hasBuild) {
      throw new Error('Extension build not found. Run: bun run build');
    }

    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
      acceptDownloads: true,
      downloadsPath: downloadsDir,
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Wait for the MV3 service worker to be ready and extract extension id from its URL
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const url = new URL(worker.url());
    // chrome-extension://<id>/_generated_background_page.html (or service_worker.js)
    const id = url.host;
    // Warm up extension pages (ensures storage/init happens before first download)
    const warmup = await context.newPage();
    await warmup.goto(`chrome-extension://${id}/popup.html`);
    await warmup.close();
    await use(id);
  },

  page: async ({ context }, use) => {
    const [page] = context.pages().length ? context.pages() : [await context.newPage()];
    await use(page);
  },
});

export { expect };
