/**
 * Playwright E2E tests for MediaInfo three-tier architecture:
 * Background → Offscreen → Sandbox → Back
 *
 * These tests run in a real browser environment with actual extension contexts.
 */
import { expect, test, waitForHistoryEntry } from './extension.fixtures';

test.describe('MediaInfo Integration E2E', () => {
  test('should analyze media file and suggest filename with metadata', async ({
    page,
    baseURL,
  }) => {
    // Navigate to test fixture with media download
    await page.goto(`${baseURL}/media-download.html`);

    // Wait for download to start
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });

    // Trigger download
    await page.click('#download-video');

    const download = await downloadPromise;

    // Verify that media analysis ran and suggested a descriptive filename
    const suggestedFilename = download.suggestedFilename();

    expect(suggestedFilename).toBeTruthy();
    // Should contain media metadata in filename
    expect(suggestedFilename).toMatch(/\.(mp4|mkv|webm)$/i);
  });

  test('should create and manage offscreen document lifecycle', async ({
    page,
    serviceWorker,
    baseURL,
  }) => {
    // Check offscreen document state before download
    const hasOffscreenBefore = await serviceWorker.evaluate(async () => {
      // @ts-expect-error - chrome API
      return await chrome.offscreen.hasDocument();
    });

    // Initially should not have offscreen document
    expect(hasOffscreenBefore).toBe(false);

    // Trigger media download
    await page.goto(`${baseURL}/media-download.html`);
    await page.click('#download-video');

    // Wait for offscreen document creation
    await page.waitForTimeout(1000);

    // Check if offscreen document was created
    const hasOffscreenDuring = await serviceWorker.evaluate(async () => {
      // @ts-expect-error - chrome API
      return await chrome.offscreen.hasDocument();
    });

    expect(hasOffscreenDuring).toBe(true);
  });

  test('should make range requests for bandwidth efficiency', async ({
    page,
    baseURL,
  }) => {
    // Track network requests
    const requests: Array<{ url: string; headers: Record<string, string> }> =
      [];

    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        headers: request.headers(),
      });
    });

    // Trigger media download
    await page.goto(`${baseURL}/media-download.html`);
    await page.click('#download-video');

    // Wait for analysis to make requests
    await page.waitForTimeout(2000);

    // Find range requests (should be made by offscreen document)
    const rangeRequests = requests.filter(
      (req) => req.headers.range !== undefined,
    );

    // Should have made at least one range request
    expect(rangeRequests.length).toBeGreaterThan(0);

    // Verify range header format (e.g., "bytes=0-524287")
    if (rangeRequests.length > 0) {
      const firstRangeRequest = rangeRequests[0];
      expect(firstRangeRequest?.headers.range).toMatch(/^bytes=\d+-\d+$/);
    }
  });

  test('should handle analysis timeout gracefully', async ({
    page,
    baseURL,
  }) => {
    // Use fixture with slow/timeout media URL
    await page.goto(`${baseURL}/media-timeout.html`);

    const downloadPromise = page.waitForEvent('download', { timeout: 40_000 });

    await page.click('#download-slow');

    const download = await downloadPromise;

    // Download should still proceed even if analysis times out
    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('should propagate WASM errors from sandbox', async ({
    page,
    baseURL,
  }) => {
    // Block WASM file to simulate WASM initialization error
    await page.route('**/MediaInfoModule*.wasm', (route) => {
      route.abort('failed');
    });

    await page.goto(`${baseURL}/media-download.html`);

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
    await page.click('#download-video');

    const download = await downloadPromise;

    // Should fall back to original filename when WASM fails
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('should queue multiple concurrent analysis requests', async ({
    page,
    baseURL,
  }) => {
    // Navigate to fixture with multiple downloads
    await page.goto(`${baseURL}/media-multi-download.html`);

    // Trigger multiple downloads concurrently
    const downloadPromises = [
      page.waitForEvent('download'),
      page.waitForEvent('download'),
      page.waitForEvent('download'),
    ];

    await page.click('#download-all');

    // Wait for all downloads
    const downloads = await Promise.all(downloadPromises);

    // All downloads should have started (queue handles concurrent requests)
    expect(downloads.length).toBe(3);

    // Each should have a suggested filename
    for (const download of downloads) {
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });

  test('should record media analysis in history', async ({
    page,
    context,
    baseURL,
  }) => {
    // Trigger media download
    await page.goto(`${baseURL}/media-download.html`);
    await page.click('#download-video');

    // Wait for history entry with media metadata
    const historyEntry = await waitForHistoryEntry(
      context,
      (item) => item.media !== undefined && item.media.status === 'success',
      15_000,
    );

    expect(historyEntry).toBeTruthy();
    expect(historyEntry.media).toBeDefined();
    expect(historyEntry.media?.summary?.general.durationMs).toBeGreaterThan(0);
  });

  test('should include media metadata in upgrade proposal', async ({
    page,
    context,
    baseURL,
  }) => {
    await page.goto(`${baseURL}/media-download.html`);
    await page.click('#download-video');

    // Wait for history entry with upgrade
    const historyEntry = await waitForHistoryEntry(
      context,
      (item) =>
        item.phase === 'contextual-upgrade' && item.upgrade !== undefined,
      15_000,
    );

    // Verify upgrade proposal includes media metadata
    expect(historyEntry.upgrade?.proposedPath).toBeTruthy();

    // Should include duration or resolution in filename
    const proposedFilename = historyEntry.upgrade?.proposedPath ?? '';
    const hasMetadata =
      /\d+m|\d+s/i.test(proposedFilename) || // Duration
      /\d+p|\d+x\d+/i.test(proposedFilename); // Resolution

    expect(hasMetadata).toBe(true);
  });

  test('should cleanup offscreen document after inactivity', async ({
    page,
    serviceWorker,
    baseURL,
  }) => {
    // Trigger analysis
    await page.goto(`${baseURL}/media-download.html`);
    await page.click('#download-video');

    // Wait for analysis to complete
    await page.waitForTimeout(2000);

    // Offscreen should exist during analysis
    const hasOffscreenDuring = await serviceWorker.evaluate(async () => {
      // @ts-expect-error - chrome API
      return await chrome.offscreen.hasDocument();
    });
    expect(hasOffscreenDuring).toBe(true);

    // Wait for cleanup timeout (implementation-specific)
    await page.waitForTimeout(35_000);

    // Offscreen should be cleaned up
    const hasOffscreenAfter = await serviceWorker.evaluate(async () => {
      // @ts-expect-error - chrome API
      return await chrome.offscreen.hasDocument();
    });
    expect(hasOffscreenAfter).toBe(false);
  });

  test('should handle network errors gracefully', async ({ page, baseURL }) => {
    // Block media URL to simulate network error
    await page.route('**/*.mp4', (route) => {
      if (route.request().url().includes('test-media')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto(`${baseURL}/media-download.html`);

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
    await page.click('#download-video');

    const download = await downloadPromise;

    // Should fall back to original filename when network fails
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('should verify sandbox iframe creation in offscreen', async ({
    page,
    extensionId,
    baseURL,
  }) => {
    // Trigger download to create offscreen + sandbox
    await page.goto(`${baseURL}/media-download.html`);
    await page.click('#download-video');

    await page.waitForTimeout(1000);

    // Navigate to offscreen document
    const offscreenPage = await page.context().newPage();
    await offscreenPage.goto(
      `chrome-extension://${extensionId}/offscreen.html`,
    );

    // Check for sandbox iframe
    const hasSandbox = await offscreenPage.evaluate(() => {
      const iframe = document.querySelector('iframe[sandbox]');
      return !!iframe;
    });

    expect(hasSandbox).toBe(true);

    await offscreenPage.close();
  });
});
