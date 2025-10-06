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

  test('uses page title with proper sanitization for page-title strategy', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await setSettingsInExtension(
      serviceWorker,
      createTestSettings({ instantBaselineStrategy: 'page-title' }),
    );

    await page.goto('/scenarios/business/biedronka-receipt.html');
    await page.waitForTimeout(100);

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

    expect(finalName).toBe('Biedronka Historia Transakcji Moje Konto.pdf');
  });

  test('combines page title with date for page-title-with-date strategy', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await setSettingsInExtension(
      serviceWorker,
      createTestSettings({ instantBaselineStrategy: 'page-title-with-date' }),
    );

    await page.goto('/scenarios/design/figma-component.html');
    await page.waitForTimeout(100);

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
      timeoutMs: 2_000,
    });

    expect(finalName).toMatch(
      /^Navbar Fix Dialog Component Figma \d{4}-\d{2}-\d{2}\.png$/,
    );
    expect(finalName).toContain('Figma');
  });
});
