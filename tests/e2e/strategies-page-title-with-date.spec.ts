import { resolveFinalName } from '../shared/download-resolution';
import { expect, setSettingsInExtension, test } from './extension.fixtures';
import { createStrategySettings } from './helpers/strategy-settings';

test.describe('Instant Baseline — Strategy: page-title-with-date', () => {
  test.beforeEach(async ({ context }) => {
    await context.storageState({ path: undefined });
  });

  test('fallback to original when page context not captured', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto('/scenarios/design/figma-component.html');
    await page.waitForTimeout(500);

    await setSettingsInExtension(
      serviceWorker,
      createStrategySettings('page-title-with-date'),
    );

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Export Screenshot (PNG)'),
    ]);

    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) =>
        item.original === 'Screenshot 2025-09-23 at 11.07.54.png' &&
        item.phase === 'instant-baseline',
      timeoutMs: 3_000,
    });

    expect(finalName).toBe('Screenshot 2025-09-23 at 11.07.54.png');
  });

  test('falls back to original when title processing fails', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto('/scenarios/business/sprint-planning.html');
    await page.waitForTimeout(500);

    await setSettingsInExtension(
      serviceWorker,
      createStrategySettings('page-title-with-date'),
    );

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Download Meeting Notes (TXT)'),
    ]);

    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) =>
        item.original === 'meeting-notes.txt' &&
        item.phase === 'instant-baseline',
      timeoutMs: 3_000,
    });

    expect(finalName).toBe('meeting-notes.txt');
  });

  test('falls back gracefully when page title missing but date available', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.setContent(
      '<html><head></head><body><a href="data:text/plain;base64,SGVsbG8gV29ybGQ=" download="notes.txt">Download</a></body></html>',
    );

    await setSettingsInExtension(
      serviceWorker,
      createStrategySettings('page-title-with-date'),
    );

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Download'),
    ]);

    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) =>
        item.original === 'notes.txt' && item.phase === 'instant-baseline',
      timeoutMs: 1_000,
    });

    expect(finalName).toBe('notes.txt');
  });
});
