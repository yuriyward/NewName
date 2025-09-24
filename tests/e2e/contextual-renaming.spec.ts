import { resolveFinalName } from '../shared/download-resolution';
import { expect, test } from './extension.fixtures';

test.describe('Phase 1 strategy defaults', () => {
  test('sanitises long transaction filenames and appends date', async ({
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
      timeoutMs: 5000,
    });

    expect(finalName).toMatch(
      /^Historia Transakcji 2509238693113130 \d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });

  test('preserves original tokens for meeting notes while ensuring safe formatting', async ({
    page,
    context,
  }) => {
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
      timeoutMs: 5000,
    });

    expect(finalName).toMatch(/^Meeting Notes \d{4}-\d{2}-\d{2}\.txt$/);
  });
});
