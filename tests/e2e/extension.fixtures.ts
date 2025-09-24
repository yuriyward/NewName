import fs from 'node:fs/promises';
import path from 'node:path';
import {
  type BrowserContext,
  test as base,
  chromium,
  expect,
  type Page,
} from '@playwright/test';
import type { HistoryItem } from '@/entrypoints/shared/history/history';

type Fixtures = {
  context: BrowserContext;
  page: Page;
  downloadsDir: string;
  extensionId: string;
};

export const test = base.extend<Fixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires empty destructuring for fixtures
  downloadsDir: async ({}, use, testInfo) => {
    const dir = path.join(
      process.cwd(),
      'tmp',
      'pw-downloads',
      testInfo.project.name,
      testInfo.title.replace(/\W+/g, '_'),
    );
    await fs.mkdir(dir, { recursive: true });
    await use(dir);
  },

  context: async ({ downloadsDir }, use) => {
    const extensionPath = path.resolve('.output', 'chrome-mv3');
    const hasBuild = await fs
      .stat(extensionPath)
      .then(() => true)
      .catch(() => false);
    if (!hasBuild) {
      throw new Error('Extension build not found. Run: bun run build');
    }

    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: !!process.env.CI,
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
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker'));
    const url = new URL(worker.url());
    // chrome-extension://<id>/_generated_background_page.html (or service_worker.js)
    const id = url.host;
    await use(id);
  },

  page: async ({ context }, use) => {
    const [page] = context.pages().length
      ? context.pages()
      : [await context.newPage()];
    await use(page);
  },
});

export { expect };

export async function queryFinalFilenameFromExtension(
  context: BrowserContext,
  finalUrl: string,
): Promise<string | undefined> {
  const sw =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker'));
  const result = await sw.evaluate(async (url: string) => {
    const chromeApi = (
      globalThis as unknown as {
        chrome: {
          downloads: {
            search: (q: {
              finalUrl?: string;
              url?: string;
              state: string;
            }) => Promise<Array<{ filename?: string }>>;
          };
        };
      }
    ).chrome;
    let [res] = await chromeApi.downloads.search({
      finalUrl: url,
      state: 'complete',
    });
    if (!res) {
      [res] = await chromeApi.downloads.search({ url, state: 'complete' });
    }
    return res?.filename ?? null;
  }, finalUrl);
  return (result as string | null) ?? undefined;
}

export async function waitForFinalFilenameFromExtension(
  context: BrowserContext,
  finalUrl: string,
  timeoutMs = 6_000,
): Promise<string> {
  const start = Date.now();
  while (true) {
    const path = await queryFinalFilenameFromExtension(context, finalUrl);
    if (path) return path;
    if (Date.now() - start > timeoutMs)
      throw new Error('Timed out waiting for download to complete');
    await new Promise((r) => setTimeout(r, 150));
  }
}

export async function readHistoryFromExtension(
  context: BrowserContext,
): Promise<HistoryItem[]> {
  const sw =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker'));
  const result = await sw.evaluate(async () => {
    const chromeApi = (
      globalThis as unknown as {
        chrome: {
          storage: {
            local: {
              get: (
                keys: string[],
                cb: (res: Record<string, unknown>) => void,
              ) => void;
            };
          };
        };
      }
    ).chrome;
    return await new Promise<HistoryItem[]>((resolve) => {
      chromeApi.storage.local.get(
        ['history.v1'],
        (res: Record<string, unknown>) => {
          resolve((res['history.v1'] as HistoryItem[]) ?? []);
        },
      );
    });
  });
  return result as HistoryItem[];
}

export async function waitForHistoryEntry(
  context: BrowserContext,
  predicate: (item: HistoryItem) => boolean,
  timeoutMs = 10_000,
): Promise<HistoryItem> {
  const start = Date.now();
  while (true) {
    const items = await readHistoryFromExtension(context);
    const found = items.find(predicate);
    if (found) return found;
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for history entry');
    }
    await new Promise((r) => setTimeout(r, 150));
  }
}
