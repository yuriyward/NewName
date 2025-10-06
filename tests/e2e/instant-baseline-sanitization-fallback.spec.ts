import { resolveFinalName } from '../shared/download-resolution';
import { expect, test } from './extension.fixtures';

test.describe('Instant Baseline — Filename Sanitization (Fallbacks)', () => {
  test.beforeEach(async ({ context }) => {
    await context.storageState({ path: undefined });
  });

  test('fallback preserves original filename when startTime unavailable', async ({
    page,
    context,
  }) => {
    await page.goto('/scenarios/business/biedronka-receipt.html');

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

    expect(finalName).toBe('historia_transakcji_2509238693113130.pdf');
    expect(finalName).toContain('_');
  });

  test('maintains filesystem-safe filenames', async ({ page, context }) => {
    await page.goto('/scenarios/business/sprint-planning.html');

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
    });

    expect(finalName).toBe('meeting-notes.txt');
    expect(finalName).not.toMatch(/[\\/:*?"<>|]/);
    expect(finalName.length).toBeLessThan(255);
  });

  test('preserves important punctuation and numbers in fallback', async ({
    page,
    context,
  }) => {
    await page.goto('/scenarios/business/biedronka-receipt.html');

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

    expect(finalName).toBe('historia_transakcji_2509238693113130.pdf');
    expect(finalName).toContain('2509238693113130');
    expect(finalName).toContain('_');
  });
});
