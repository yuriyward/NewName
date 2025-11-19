import { resolveFinalName } from '../shared/download-resolution';
import { expect, setSettingsInExtension, test } from './extension.fixtures';
import { createTestSettings } from './helpers/test-settings';

test.describe('Instant Baseline — Filename Sanitization (Strategies)', () => {
  test.beforeEach(async ({ context }) => {
    await context.storageState({ path: undefined });
  });

  test('sanitizes filename with date when startTime is available', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto('/scenarios/business/biedronka-receipt.html');

    await setSettingsInExtension(
      serviceWorker,
      createTestSettings({ instantBaselineStrategy: 'original-with-date' }),
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
    });

    expect(finalName).toMatch(
      /^Historia Transakcji 2509238693113130 \d{4}-\d{2}-\d{2}\.pdf$/,
    );
    expect(finalName).not.toContain('_');
  });
});
