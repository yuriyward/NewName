import fs from 'node:fs/promises';
import path from 'node:path';
import {
  type BrowserContext,
  test as base,
  chromium,
  expect,
  type Page,
  type Worker,
} from '@playwright/test';
import type { HistoryItem } from '@/entrypoints/shared/history/history';

const SERVICE_WORKER_WAIT_TIMEOUT = 2_000;

let cachedExtensionId: string | undefined;

async function wakeServiceWorker(
  context: BrowserContext,
  extensionId: string,
  timeoutMs: number,
): Promise<void> {
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${extensionId}/popup.html`, {
      waitUntil: 'domcontentloaded',
      timeout: Math.max(250, Math.min(timeoutMs, 1_000)),
    });
  } catch {
    // Ignore navigation failures; the attempt is enough to nudge the worker.
  } finally {
    if (!page.isClosed()) {
      await page.close().catch(() => {
        /* noop */
      });
    }
  }
}

async function waitForServiceWorker(
  context: BrowserContext,
  options: {
    timeoutMs?: number;
    extensionId?: string;
    retryOnTimeout?: boolean;
  } = {},
): Promise<Worker> {
  const {
    timeoutMs = SERVICE_WORKER_WAIT_TIMEOUT,
    extensionId = cachedExtensionId,
    retryOnTimeout = true,
  } = options;

  const existing = context.serviceWorkers()[0];
  if (existing) return existing;

  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      context.waitForEvent('serviceworker'),
      new Promise<Worker>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Service worker did not become available in time'));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== 'Service worker did not become available in time' ||
      !retryOnTimeout ||
      !extensionId
    ) {
      throw error;
    }

    await wakeServiceWorker(context, extensionId, timeoutMs);
    return await waitForServiceWorker(context, {
      timeoutMs,
      extensionId,
      retryOnTimeout: false,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type Fixtures = {
  context: BrowserContext;
  page: Page;
  downloadsDir: string;
  extensionId: string;
  serviceWorker: Worker;
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
    const worker = await waitForServiceWorker(context, {
      timeoutMs: SERVICE_WORKER_WAIT_TIMEOUT,
      retryOnTimeout: true,
    });
    const url = new URL(worker.url());
    // chrome-extension://<id>/_generated_background_page.html (or service_worker.js)
    const id = url.host;
    cachedExtensionId = id;
    await use(id);
  },

  serviceWorker: async ({ context }, use) => {
    const existing = context.serviceWorkers()[0];
    if (existing) {
      await use(existing);
      return;
    }
    const sw = await context.waitForEvent('serviceworker');
    await use(sw);
  },

  page: async ({ context }, use) => {
    const [page] = context.pages().length
      ? context.pages()
      : [await context.newPage()];
    await use(page);
  },
});

export { expect };

export async function setSettingsInExtension(
  worker: Worker,
  settings: Record<string, unknown>,
): Promise<void> {
  await worker.evaluate(async (payload) => {
    const chromeApi = (
      globalThis as unknown as {
        chrome: {
          storage: { local: { set: (obj: unknown, cb: () => void) => void } };
          runtime: { lastError?: unknown };
        };
      }
    ).chrome;
    await new Promise<void>((resolve, reject) => {
      chromeApi.storage.local.set({ 'local:settings.v1': payload }, () => {
        if (chromeApi.runtime.lastError) reject(chromeApi.runtime.lastError);
        else resolve();
      });
    });
  }, settings);
}

export async function queryFinalFilenameFromExtension(
  context: BrowserContext,
  finalUrl: string,
): Promise<string | undefined> {
  const sw = await waitForServiceWorker(context);
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
    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) {
      throw new Error('Timed out waiting for download to complete');
    }
    const path = await queryFinalFilenameFromExtension(context, finalUrl).catch(
      () => undefined,
    );
    if (path) return path;
    await new Promise((r) => setTimeout(r, 150));
  }
}

export async function readHistoryFromExtension(
  context: BrowserContext,
): Promise<HistoryItem[]> {
  const sw = await waitForServiceWorker(context);
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
    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) {
      throw new Error('Timed out waiting for history entry');
    }
    const items = await readHistoryFromExtension(context).catch(() => []);
    const found = items.find(predicate);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 150));
  }
}
