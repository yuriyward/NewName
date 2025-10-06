import { resolveFinalName } from '../shared/download-resolution';
import { expect, setSettingsInExtension, test } from './extension.fixtures';
import { createStrategySettings } from './helpers/strategy-settings';

test.describe('Instant Baseline — Strategy: page-title', () => {
  test.beforeEach(async ({ context }) => {
    await context.storageState({ path: undefined });
  });

  test('uses page title for invoice filename', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto('/scenarios/business/biedronka-receipt.html');

    await setSettingsInExtension(
      serviceWorker,
      createStrategySettings('page-title'),
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

    expect(finalName).toMatch(/\.pdf$/);
    expect(finalName.length).toBeGreaterThan(10);
  });

  test('falls back to original when page title unavailable', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.setContent(
      '<html><head><title></title></head><body><a href="data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCgoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDQgMCBSCj4+Cj4+Ci9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApUKiAvRjEgMjQgVGYKNTAgNzUwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQ1IDAwMDAwIG4gCjAwMDAwMDAzMjcgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0MjAKJSVFT0YK" download="test-document.pdf">Download PDF</a></body></html>',
    );

    await setSettingsInExtension(
      serviceWorker,
      createStrategySettings('page-title'),
    );

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Download PDF'),
    ]);

    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) =>
        item.original === 'test-document.pdf' &&
        item.phase === 'instant-baseline',
      timeoutMs: 1_000,
    });

    expect(finalName).toBe('test-document.pdf');
  });
});
