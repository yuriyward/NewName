import { resolveFinalName } from '../shared/download-resolution';
import { expect, setSettingsInExtension, test } from './extension.fixtures';
import { createStrategySettings } from './helpers/strategy-settings';

test.describe('Instant Baseline — Strategy: keep-original', () => {
  test.beforeEach(async ({ context }) => {
    await context.storageState({ path: undefined });
  });

  test('keeps invoice filename unchanged', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto('/scenarios/business/biedronka-receipt.html');

    await setSettingsInExtension(
      serviceWorker,
      createStrategySettings('keep-original'),
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
      timeoutMs: 1_000,
    });

    expect(finalName).toBe('historia_transakcji_2509238693113130.pdf');
  });

  test('keeps screenshot filename unchanged', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto('/scenarios/design/figma-component.html');

    await setSettingsInExtension(
      serviceWorker,
      createStrategySettings('keep-original'),
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
      timeoutMs: 1_000,
    });

    expect(finalName).toBe('Screenshot 2025-09-23 at 11.07.54.png');
  });
});
