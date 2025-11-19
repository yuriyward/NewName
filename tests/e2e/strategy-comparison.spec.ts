import { resolveFinalName } from '../shared/download-resolution';
import { expect, setSettingsInExtension, test } from './extension.fixtures';
import { createStrategySettings } from './helpers/strategy-settings';

test.describe('Instant Baseline — Strategy Comparison', () => {
  const scenario = {
    url: '/scenarios/business/biedronka-receipt.html',
    clickTarget: 'text=Pobierz historię transakcji (PDF)',
    originalFile: 'invoice-2025-09-15.pdf',
  };

  test.beforeEach(async ({ context }) => {
    await context.storageState({ path: undefined });
  });

  test('demonstrates all strategies produce distinct results', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto(scenario.url);

    const results: Array<{ strategy: string; finalName: string }> = [];
    const strategies = ['keep-original', 'original-with-date'] as const;

    for (const strategy of strategies) {
      await test.step(`apply ${strategy}`, async () => {
        await setSettingsInExtension(
          serviceWorker,
          createStrategySettings(strategy),
        );

        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.click(scenario.clickTarget),
        ]);

        const finalName = await resolveFinalName({
          context,
          download,
          historyPredicate: (item) =>
            item.original === scenario.originalFile &&
            item.phase === 'instant-baseline',
          timeoutMs: 1_000,
        });

        results.push({ strategy, finalName });
        await page.waitForTimeout(100);
      });
    }

    expect(results).toHaveLength(strategies.length);

    const names = Object.fromEntries(
      results.map(({ strategy, finalName }) => [strategy, finalName]),
    ) as Record<(typeof strategies)[number], string>;

    expect(names['keep-original']).toBe(scenario.originalFile);
    expect(names['original-with-date']).toMatch(
      /^Invoice 2025 09 15 \d{4}-\d{2}-\d{2}\.pdf$/,
    );

    await test.step('summary', async () => {
      console.table(results);
    });
  });

  test('shows separator styles affect formatting', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto(scenario.url);

    const separators = ['clean', 'kebab', 'snake'] as const;
    const results: Array<{ separator: string; finalName: string }> = [];

    for (const separator of separators) {
      await test.step(`separator ${separator}`, async () => {
        await setSettingsInExtension(
          serviceWorker,
          createStrategySettings('original-with-date', { separator }),
        );

        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.click(scenario.clickTarget),
        ]);

        const finalName = await resolveFinalName({
          context,
          download,
          historyPredicate: (item) =>
            item.original === scenario.originalFile &&
            item.phase === 'instant-baseline',
          timeoutMs: 1_000,
        });

        results.push({ separator, finalName });
        await page.waitForTimeout(100);
      });
    }

    const clean = results.find((r) => r.separator === 'clean')?.finalName;
    const kebab = results.find((r) => r.separator === 'kebab')?.finalName;
    const snake = results.find((r) => r.separator === 'snake')?.finalName;

    expect(clean).toContain(' ');
    expect(kebab).toContain('-');
    expect(snake).toContain('_');

    await test.step('separator summary', async () => {
      console.table(results);
    });
  });
});
