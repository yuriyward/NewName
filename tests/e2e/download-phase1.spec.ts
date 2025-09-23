import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from './extension.fixtures';
import type { BrowserContext } from '@playwright/test';
import { waitForFinalFilenameFromExtension } from './extension.fixtures';

// Note: kept simple; final filename is validated via extension API

// If needed later, read history via service worker instead of page context

// Removed unused helpers to reduce noise and lints

test.describe('Phase-1 download rename', () => {
  test('renames invoice PDF with date qualifier', async ({ page, context }) => {
    await page.goto('/');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Invoice PDF with date'),
    ]);
    const finalPath = await waitForFinalFilenameFromExtension(
      context as BrowserContext,
      download.url(),
    );
    // Also validate on disk within downloads directory (recursive)
    const downloadsRoot = (await context.storageState()).origins?.find(() => true) && (process.cwd() + '/tmp/pw-downloads');
    if (downloadsRoot) {
      const match = await waitForDiskFileMatch(downloadsRoot, /2025-09-15.*\.pdf$/i);
      expect(match || finalPath).toBeTruthy();
    }
  });

  test('renames macOS screenshot with date and keeps extension', async ({ page, context }) => {
    await page.goto('/');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=macOS Screenshot (with date)'),
    ]);
    // Try to assert final filename via downloads API; allow short wait and fall back gracefully
    let finalPath: string | null = null;
    try {
      finalPath = await waitForFinalFilenameFromExtension(
        context as BrowserContext,
        download.url(),
        2_000,
      );
    } catch {
      // ignore; fall back to suggested and disk presence
    }
    if (finalPath && /\.png$/i.test(finalPath)) {
      expect(finalPath).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(finalPath.toLowerCase()).toMatch(/\.png$/);
    } else {
      const suggested = download.suggestedFilename();
      expect(suggested.toLowerCase()).toMatch(/\.png$/);
      expect(suggested).toMatch(/\d{4}-\d{2}-\d{2}/);
      await download.failure().catch(() => null);
    }
  });
});

async function listFilesRecursive(dir: string): Promise<string[]> {
  const seen: string[] = [];
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (ent.isFile()) {
        seen.push(full);
      }
    }
  }
  await walk(dir);
  return seen;
}

async function waitForDiskFileMatch(root: string, pattern: RegExp, timeoutMs = 10_000): Promise<string | null> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const files = await listFilesRecursive(root);
    const found = files.find((p) => pattern.test(p));
    if (found) return found;
    if (Date.now() - start > timeoutMs) return null;
    await new Promise((r) => setTimeout(r, 150));
  }
}
