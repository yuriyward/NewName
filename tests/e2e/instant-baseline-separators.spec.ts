import { resolveFinalName } from '../shared/download-resolution';
import { expect, setSettingsInExtension, test } from './extension.fixtures';
import { createTestSettings } from './helpers/test-settings';

test.describe('Instant Baseline — Filename Separators', () => {
  test.beforeEach(async ({ context }) => {
    await context.storageState({ path: undefined });
  });

  test('applies different separator styles correctly', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await setSettingsInExtension(
      serviceWorker,
      createTestSettings({
        separator: 'snake',
        instantBaselineStrategy: 'original-with-date',
      }),
    );

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
      timeoutMs: 2_000,
    });

    expect(finalName).toMatch(/^meeting_notes_\d{4}-\d{2}-\d{2}\.txt$/);
    expect(finalName).toContain('_');
  });
});
