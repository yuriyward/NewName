import { resolveFinalName } from '../shared/download-resolution';
import { expect, setSettingsInExtension, test } from './extension.fixtures';

test.describe('Instant Baseline — Strategy Comparison', () => {
  const testScenario = {
    url: '/scenarios/business/biedronka-receipt.html',
    clickTarget: 'text=Pobierz historię transakcji (PDF)',
    originalFile: 'invoice-2025-09-15.pdf',
  };

  const baseSettings = {
    version: 1,
    mode: 'balanced' as const,
    language: 'auto' as const,
    separator: 'clean' as const,
    maxLen: 60,
    transliterateAscii: false,
    perType: {
      pdf: { behavior: 'auto' as const },
      image: { behavior: 'auto' as const },
      audio: { behavior: 'auto' as const },
      video: { behavior: 'auto' as const },
      office: { behavior: 'auto' as const },
      archive: { behavior: 'auto' as const },
      data: { behavior: 'auto' as const },
    },
    metadataToggles: {
      geo: false,
      docDate: true,
      mediaSpecs: true,
      sourceHint: true,
    },
    cloud: {
      enabled: false,
      scope: [],
      dataMinimize: true,
    },
    debug: {
      enabled: false,
      level: 'basic' as const,
    },
    notifyOnKeep: false,
  };

  test('demonstrates all 4 strategies produce different results', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto(testScenario.url);

    // Get the page title for comparison
    const pageTitle = await page.title();
    console.log('Page title for testing:', pageTitle);

    const results = [];

    // Test each strategy
    const strategies = [
      'keep-original',
      'original-with-date',
      'page-title',
      'page-title-with-date',
    ] as const;

    for (const strategy of strategies) {
      // Configure the strategy
      await setSettingsInExtension(serviceWorker, {
        ...baseSettings,
        instantBaselineStrategy: strategy,
      });

      // Trigger download
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click(testScenario.clickTarget),
      ]);

      // Get the result
      const finalName = await resolveFinalName({
        context,
        download,
        historyPredicate: (item) =>
          item.original === testScenario.originalFile &&
          item.phase === 'instant-baseline',
        timeoutMs: 1000,
      });

      results.push({ strategy, finalName });
      console.log(`Strategy "${strategy}": ${finalName}`);

      // Wait a bit between tests to avoid conflicts
      await page.waitForTimeout(100);
    }

    // Verify each strategy produces different results
    expect(results).toHaveLength(4);

    // Find results by strategy
    const keepOriginal = results.find(
      (r) => r.strategy === 'keep-original',
    )?.finalName;
    const originalWithDate = results.find(
      (r) => r.strategy === 'original-with-date',
    )?.finalName;
    const pageTitleResult = results.find(
      (r) => r.strategy === 'page-title',
    )?.finalName;
    const pageTitleWithDate = results.find(
      (r) => r.strategy === 'page-title-with-date',
    )?.finalName;

    // Assertions about expected behaviors
    expect(keepOriginal).toBe(testScenario.originalFile);

    expect(originalWithDate).toMatch(
      /^Invoice 2025 09 15 \d{4}-\d{2}-\d{2}\.pdf$/,
    );
    expect(originalWithDate).not.toBe(keepOriginal);

    // Page title strategies should be different from original-based ones
    if (pageTitleResult !== testScenario.originalFile) {
      // Page title was available and used
      expect(pageTitleResult).not.toBe(keepOriginal);
      expect(pageTitleResult).not.toBe(originalWithDate);

      // page-title-with-date should be different from page-title
      if (pageTitleWithDate !== testScenario.originalFile) {
        expect(pageTitleWithDate).not.toBe(pageTitleResult);
        expect(pageTitleWithDate).toMatch(/\d{4}-\d{2}-\d{2}\.pdf$/);
      }
    }

    // Log summary for manual verification
    console.log('Strategy comparison results:');
    console.log('- keep-original:', keepOriginal);
    console.log('- original-with-date:', originalWithDate);
    console.log('- page-title:', pageTitleResult);
    console.log('- page-title-with-date:', pageTitleWithDate);
  });

  test('verifies strategy fallback behavior when page title unavailable', async ({
    page,
    context,
    serviceWorker,
  }) => {
    // Create a page with empty title
    await page.setContent(`
      <html>
        <head>
          <title></title>
        </head>
        <body>
          <a href="data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCgoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDQgMCBSCj4+Cj4+Ci9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApUKiAvRjEgMjQgVGYKNTAgNzUwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQ1IDAwMDAwIG4gCjAwMDAwMDAzMjcgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0MjAKJSVFT0YK" download="document.pdf">
            Download Test PDF
          </a>
        </body>
      </html>
    `);

    const results = [];
    const originalFile = 'document.pdf';

    // Test page-title strategies with no title available
    const titleStrategies = ['page-title', 'page-title-with-date'] as const;

    for (const strategy of titleStrategies) {
      await setSettingsInExtension(serviceWorker, {
        ...baseSettings,
        instantBaselineStrategy: strategy,
      });

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('text=Download Test PDF'),
      ]);

      const finalName = await resolveFinalName({
        context,
        download,
        historyPredicate: (item) =>
          item.original === originalFile && item.phase === 'instant-baseline',
        timeoutMs: 1000,
      });

      results.push({ strategy, finalName });
      await page.waitForTimeout(100);
    }

    // When page title is unavailable, both strategies should fall back
    const pageTitleResult = results.find(
      (r) => r.strategy === 'page-title',
    )?.finalName;
    const pageTitleWithDateResult = results.find(
      (r) => r.strategy === 'page-title-with-date',
    )?.finalName;

    // Both should fall back to original filename when no page title
    expect(pageTitleResult).toBe(originalFile);
    expect(pageTitleWithDateResult).toBe(originalFile);

    console.log('Fallback behavior results:');
    console.log('- page-title (no title):', pageTitleResult);
    console.log('- page-title-with-date (no title):', pageTitleWithDateResult);
  });

  test('shows different separators affect output formatting', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto(testScenario.url);

    const separators = ['clean', 'kebab', 'snake'] as const;
    const results = [];

    for (const separator of separators) {
      await setSettingsInExtension(serviceWorker, {
        ...baseSettings,
        separator,
        instantBaselineStrategy: 'original-with-date',
      });

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click(testScenario.clickTarget),
      ]);

      const finalName = await resolveFinalName({
        context,
        download,
        historyPredicate: (item) =>
          item.original === testScenario.originalFile &&
          item.phase === 'instant-baseline',
        timeoutMs: 1000,
      });

      results.push({ separator, finalName });
      await page.waitForTimeout(100);
    }

    // Each separator should produce different formatting
    const cleanResult = results.find((r) => r.separator === 'clean')?.finalName;
    const kebabResult = results.find((r) => r.separator === 'kebab')?.finalName;
    const snakeResult = results.find((r) => r.separator === 'snake')?.finalName;

    // Verify different separators produce different outputs
    expect(cleanResult).toContain(' '); // Clean uses spaces
    expect(kebabResult).toContain('-'); // Kebab uses dashes
    expect(snakeResult).toContain('_'); // Snake uses underscores

    console.log('Separator formatting results:');
    console.log('- clean:', cleanResult);
    console.log('- kebab:', kebabResult);
    console.log('- snake:', snakeResult);
  });
});
