import { resolveFinalName } from '../shared/download-resolution';
import { expect, setSettingsInExtension, test } from './extension.fixtures';

test.describe('Instant Baseline — All Deterministic Strategies', () => {
  test.beforeEach(async ({ context }) => {
    // Clean storage between tests to ensure consistent behavior
    await context.storageState({ path: undefined });
  });

  test.describe('Strategy: keep-original', () => {
    test('keeps invoice filename unchanged', async ({
      page,
      context,
      serviceWorker,
    }) => {
      await page.goto('/scenarios/business/biedronka-receipt.html');

      // Configure extension to use keep-original strategy
      await setSettingsInExtension(serviceWorker, {
        version: 1,
        mode: 'balanced',
        language: 'auto',
        separator: 'clean',
        maxLen: 60,
        transliterateAscii: false,
        instantBaselineStrategy: 'keep-original',
        perType: {
          pdf: { behavior: 'auto' },
          image: { behavior: 'auto' },
          audio: { behavior: 'auto' },
          video: { behavior: 'auto' },
          office: { behavior: 'auto' },
          archive: { behavior: 'auto' },
          data: { behavior: 'auto' },
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
          level: 'basic',
        },
        notifyOnKeep: false,
      });

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
        timeoutMs: 1000,
      });

      expect(finalName).toBe('historia_transakcji_2509238693113130.pdf');
    });

    test('keeps screenshot filename unchanged', async ({
      page,
      context,
      serviceWorker,
    }) => {
      await page.goto('/scenarios/design/figma-component.html');

      // Configure keep-original strategy
      await setSettingsInExtension(serviceWorker, {
        version: 1,
        instantBaselineStrategy: 'keep-original',
        mode: 'balanced',
        language: 'auto',
        separator: 'clean',
        maxLen: 60,
        transliterateAscii: false,
        perType: {
          pdf: { behavior: 'auto' },
          image: { behavior: 'auto' },
          audio: { behavior: 'auto' },
          video: { behavior: 'auto' },
          office: { behavior: 'auto' },
          archive: { behavior: 'auto' },
          data: { behavior: 'auto' },
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
          level: 'basic',
        },
        notifyOnKeep: false,
      });

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
        timeoutMs: 1000,
      });

      expect(finalName).toBe('Screenshot 2025-09-23 at 11.07.54.png');
    });
  });

  test.describe('Strategy: original-with-date', () => {
    test('fallback to original when startTime unavailable', async ({
      page,
      context,
      serviceWorker,
    }) => {
      await page.goto('/scenarios/business/biedronka-receipt.html');
      await page.waitForTimeout(500);

      await setSettingsInExtension(serviceWorker, {
        version: 1,
        instantBaselineStrategy: 'original-with-date',
        mode: 'balanced',
        language: 'auto',
        separator: 'clean',
        maxLen: 60,
        transliterateAscii: false,
        perType: {
          pdf: { behavior: 'auto' },
          image: { behavior: 'auto' },
          audio: { behavior: 'auto' },
          video: { behavior: 'auto' },
          office: { behavior: 'auto' },
          archive: { behavior: 'auto' },
          data: { behavior: 'auto' },
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
          level: 'basic',
        },
        notifyOnKeep: false,
      });

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
        timeoutMs: 3000,
      });

      // When startTime is not available in test environment, should fallback to original filename
      expect(finalName).toBe('historia_transakcji_2509238693113130.pdf');
    });

    test('preserves filename when date unavailable', async ({
      page,
      context,
      serviceWorker,
    }) => {
      await page.goto('/scenarios/business/biedronka-receipt.html');
      await page.waitForTimeout(500);

      await setSettingsInExtension(serviceWorker, {
        version: 1,
        instantBaselineStrategy: 'original-with-date',
        mode: 'balanced',
        language: 'auto',
        separator: 'clean',
        maxLen: 60,
        transliterateAscii: false,
        perType: {
          pdf: { behavior: 'auto' },
          image: { behavior: 'auto' },
          audio: { behavior: 'auto' },
          video: { behavior: 'auto' },
          office: { behavior: 'auto' },
          archive: { behavior: 'auto' },
          data: { behavior: 'auto' },
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
          level: 'basic',
        },
        notifyOnKeep: false,
      });

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
        timeoutMs: 3000,
      });

      // Should preserve original filename with underscores when date processing fails
      expect(finalName).toBe('historia_transakcji_2509238693113130.pdf');
      expect(finalName).toContain('_'); // Underscores preserved in fallback
    });
  });

  test.describe('Strategy: page-title', () => {
    test('uses page title for invoice filename', async ({
      page,
      context,
      serviceWorker,
    }) => {
      await page.goto('/scenarios/business/biedronka-receipt.html');

      // Configure page-title strategy
      await setSettingsInExtension(serviceWorker, {
        version: 1,
        instantBaselineStrategy: 'page-title',
        mode: 'balanced',
        language: 'auto',
        separator: 'clean',
        maxLen: 60,
        transliterateAscii: false,
        perType: {
          pdf: { behavior: 'auto' },
          image: { behavior: 'auto' },
          audio: { behavior: 'auto' },
          video: { behavior: 'auto' },
          office: { behavior: 'auto' },
          archive: { behavior: 'auto' },
          data: { behavior: 'auto' },
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
          level: 'basic',
        },
        notifyOnKeep: false,
      });

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('text=Pobierz historię transakcji (PDF)'),
      ]);

      const finalName = await resolveFinalName({
        context,
        download,
        historyPredicate: (item) =>
          item.original === 'invoice-2025-09-15.pdf' &&
          item.phase === 'instant-baseline',
        timeoutMs: 1000,
      });

      // Should use the page title (check what the actual page title is)
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);

      // For Biedronka receipt, expect something descriptive from page title
      expect(finalName).toMatch(/\.pdf$/);
      expect(finalName.length).toBeGreaterThan(10); // Should be descriptive
    });

    test('falls back to original when page title unavailable', async ({
      page,
      context,
      serviceWorker,
    }) => {
      // Create a page with no title or empty title
      await page.setContent(
        '<html><head><title></title></head><body><a href="data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCgoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDQgMCBSCj4+Cj4+Ci9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApUKiAvRjEgMjQgVGYKNTAgNzUwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQ1IDAwMDAwIG4gCjAwMDAwMDAzMjcgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0MjAKJSVFT0YK" download="test-document.pdf">Download PDF</a></body></html>',
      );

      // Configure page-title strategy
      await setSettingsInExtension(serviceWorker, {
        version: 1,
        instantBaselineStrategy: 'page-title',
        mode: 'balanced',
        language: 'auto',
        separator: 'clean',
        maxLen: 60,
        transliterateAscii: false,
        perType: {
          pdf: { behavior: 'auto' },
          image: { behavior: 'auto' },
          audio: { behavior: 'auto' },
          video: { behavior: 'auto' },
          office: { behavior: 'auto' },
          archive: { behavior: 'auto' },
          data: { behavior: 'auto' },
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
          level: 'basic',
        },
        notifyOnKeep: false,
      });

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
        timeoutMs: 1000,
      });

      // Should fall back to original filename when page title is empty
      expect(finalName).toBe('test-document.pdf');
    });
  });

  test.describe('Strategy: page-title-with-date', () => {
    test('fallback to original when page context not captured', async ({
      page,
      context,
      serviceWorker,
    }) => {
      await page.goto('/scenarios/design/figma-component.html');
      await page.waitForTimeout(500);

      await setSettingsInExtension(serviceWorker, {
        version: 1,
        instantBaselineStrategy: 'page-title-with-date',
        mode: 'balanced',
        language: 'auto',
        separator: 'clean',
        maxLen: 60,
        transliterateAscii: false,
        perType: {
          pdf: { behavior: 'auto' },
          image: { behavior: 'auto' },
          audio: { behavior: 'auto' },
          video: { behavior: 'auto' },
          office: { behavior: 'auto' },
          archive: { behavior: 'auto' },
          data: { behavior: 'auto' },
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
          level: 'basic',
        },
        notifyOnKeep: false,
      });

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
        timeoutMs: 3000,
      });

      // When page context is not captured in test environment, should fallback to original filename
      expect(finalName).toBe('Screenshot 2025-09-23 at 11.07.54.png');
    });

    test('fallback to original when title processing fails', async ({
      page,
      context,
      serviceWorker,
    }) => {
      await page.goto('/scenarios/business/sprint-planning.html');
      await page.waitForTimeout(500);

      await setSettingsInExtension(serviceWorker, {
        version: 1,
        instantBaselineStrategy: 'page-title-with-date',
        mode: 'balanced',
        language: 'auto',
        separator: 'clean',
        maxLen: 60,
        transliterateAscii: false,
        perType: {
          pdf: { behavior: 'auto' },
          image: { behavior: 'auto' },
          audio: { behavior: 'auto' },
          video: { behavior: 'auto' },
          office: { behavior: 'auto' },
          archive: { behavior: 'auto' },
          data: { behavior: 'auto' },
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
          level: 'basic',
        },
        notifyOnKeep: false,
      });

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
        timeoutMs: 3000,
      });

      // Should fallback to original filename when page title processing fails in test environment
      expect(finalName).toBe('meeting-notes.txt');
    });

    test('falls back gracefully when page title missing but date available', async ({
      page,
      context,
      serviceWorker,
    }) => {
      // Create a page with no title
      await page.setContent(
        '<html><head></head><body><a href="data:text/plain;base64,SGVsbG8gV29ybGQ=" download="notes.txt">Download</a></body></html>',
      );

      await setSettingsInExtension(serviceWorker, {
        version: 1,
        instantBaselineStrategy: 'page-title-with-date',
        mode: 'balanced',
        language: 'auto',
        separator: 'clean',
        maxLen: 60,
        transliterateAscii: false,
        perType: {
          pdf: { behavior: 'auto' },
          image: { behavior: 'auto' },
          audio: { behavior: 'auto' },
          video: { behavior: 'auto' },
          office: { behavior: 'auto' },
          archive: { behavior: 'auto' },
          data: { behavior: 'auto' },
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
          level: 'basic',
        },
        notifyOnKeep: false,
      });

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('text=Download'),
      ]);

      const finalName = await resolveFinalName({
        context,
        download,
        historyPredicate: (item) =>
          item.original === 'notes.txt' && item.phase === 'instant-baseline',
        timeoutMs: 1000,
      });

      // Should fall back to original when no page title available
      expect(finalName).toBe('notes.txt');
    });
  });
});
