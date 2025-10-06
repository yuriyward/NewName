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
    const strategies = [
      'keep-original',
      'original-with-date',
      'page-title',
      'page-title-with-date',
    ] as const;

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

    if (names['page-title'] !== scenario.originalFile) {
      expect(names['page-title']).not.toBe(names['keep-original']);
      expect(names['page-title']).not.toBe(names['original-with-date']);
    }

    if (names['page-title-with-date'] !== scenario.originalFile) {
      expect(names['page-title-with-date']).toMatch(/\d{4}-\d{2}-\d{2}\.pdf$/);
      if (names['page-title'] !== scenario.originalFile) {
        expect(names['page-title-with-date']).not.toBe(names['page-title']);
      }
    }

    await test.step('summary', async () => {
      console.table(results);
    });
  });

  test('verifies fallback when page title unavailable', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.setContent(`
      <html>
        <head><title></title></head>
        <body>
          <a href="data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCgoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDQgMCBSCj4+Cj4+Ci9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApUKiAvRjEgMjQgVGYKNTAgNzUwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQ1IDAwMDAwIG4gCjAwMDAwMDAzMjcgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0MjAKJSVFT0YK" download="document.pdf">
            Download Test PDF
          </a>
        </body>
      </html>
    `);

    const originalFile = 'document.pdf';
    const strategies = ['page-title', 'page-title-with-date'] as const;
    const results: Array<{ strategy: string; finalName: string }> = [];

    for (const strategy of strategies) {
      await test.step(`strategy ${strategy}`, async () => {
        await setSettingsInExtension(
          serviceWorker,
          createStrategySettings(strategy),
        );

        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.click('text=Download Test PDF'),
        ]);

        const finalName = await resolveFinalName({
          context,
          download,
          historyPredicate: (item) =>
            item.original === originalFile && item.phase === 'instant-baseline',
          timeoutMs: 1_000,
        });

        results.push({ strategy, finalName });
        await page.waitForTimeout(100);
      });
    }

    for (const { finalName } of results) {
      expect(finalName).toBe(originalFile);
    }

    await test.step('fallback summary', async () => {
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
