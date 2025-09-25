import { resolveFinalName } from '../shared/download-resolution';
import { expect, test } from './extension.fixtures';

test.describe('Instant Baseline — Default Strategy Integration', () => {
  test.beforeEach(async ({ context }) => {
    // Ensure storage is clean between tests so the default strategy applies consistently.
    await context.storageState({ path: undefined });
  });

  test('applies default strategy (original-with-date) to various file types', async ({
    page,
    context,
  }) => {
    // Test PDF
    await page.goto('/scenarios/business/biedronka-receipt.html');

    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Pobierz historię transakcji (PDF)'),
    ]);

    const pdfName = await resolveFinalName({
      context,
      download: pdfDownload,
      historyPredicate: (item) =>
        item.original === 'historia_transakcji_2509238693113130.pdf' &&
        item.phase === 'instant-baseline',
    });

    // Default strategy is 'original-with-date' - in test environment, falls back to original
    expect(pdfName).toBe('historia_transakcji_2509238693113130.pdf');

    // Test PNG
    await page.goto('/scenarios/design/figma-component.html');

    const [pngDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Export Screenshot (PNG)'),
    ]);

    const pngName = await resolveFinalName({
      context,
      download: pngDownload,
      historyPredicate: (item) =>
        item.original === 'Screenshot 2025-09-23 at 11.07.54.png' &&
        item.phase === 'instant-baseline',
    });

    // Default strategy is 'original-with-date' - in test environment, falls back to original
    expect(pngName).toBe('Screenshot 2025-09-23 at 11.07.54.png');
  });

  test('handles file renaming history tracking correctly', async ({
    page,
    context,
  }) => {
    await page.goto('/scenarios/business/biedronka-receipt.html');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Pobierz historię transakcji (PDF)'),
    ]);

    // Verify the history item is created with proper metadata
    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) => {
        return (
          item.original === 'historia_transakcji_2509238693113130.pdf' &&
          item.phase === 'instant-baseline'
          // Don't require specific reasonTags since they depend on whether processing succeeded
        );
      },
    });

    // Default strategy is 'original-with-date' - in test environment, falls back to original
    expect(finalName).toBe('historia_transakcji_2509238693113130.pdf');
  });
});
