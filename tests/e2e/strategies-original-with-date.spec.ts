import { resolveFinalName } from '../shared/download-resolution';
import { expect, setSettingsInExtension, test } from './extension.fixtures';
import { createStrategySettings } from './helpers/strategy-settings';

test.describe('Instant Baseline — Strategy: original-with-date', () => {
  test.beforeEach(async ({ context }) => {
    await context.storageState({ path: undefined });
  });

  test('fallback to original when startTime unavailable', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto('/scenarios/business/biedronka-receipt.html');
    await page.waitForTimeout(500);

    await setSettingsInExtension(
      serviceWorker,
      createStrategySettings('original-with-date'),
    );

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Pobierz historię transakcji (PDF)'),
    ]);

    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) =>
        item.original === 'historia_transakcji_2509238693113130.pdf' &&
        item.phase === 'instant-baseline',
      timeoutMs: 3_000,
    });

    expect(finalName).toBe('historia_transakcji_2509238693113130.pdf');
  });

  test('sanitizes and appends date when available', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto('/scenarios/business/biedronka-receipt.html');
    await page.waitForTimeout(500);

    await setSettingsInExtension(
      serviceWorker,
      createStrategySettings('original-with-date'),
    );

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Pobierz historię transakcji (PDF)'),
    ]);

    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) =>
        item.original === 'historia_transakcji_2509238693113130.pdf' &&
        item.phase === 'instant-baseline',
      timeoutMs: 3_000,
    });

    expect(finalName).toMatch(
      /^Historia Transakcji 2509238693113130 \d{4}-\d{2}-\d{2}\.pdf$/,
    );
    expect(finalName).not.toContain('_');
  });

  test('preserves original when sanitization fails', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto('/scenarios/design/figma-component.html');
    await page.waitForTimeout(500);

    await setSettingsInExtension(
      serviceWorker,
      createStrategySettings('original-with-date'),
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
});
