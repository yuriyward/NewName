import { resolveFinalName } from '../shared/download-resolution';
import { expect, test } from './extension.fixtures';

test.describe('Phase-1 download rename', () => {
  test('renames invoice PDF with date qualifier', async ({ page, context }) => {
    await page.goto('/');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Invoice PDF with date'),
    ]);
    await download.path();
    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) =>
        item.original === 'invoice-2025-09-15.pdf' && item.phase === 1,
      timeoutMs: 0,
    });
    expect(finalName).toMatch(/2025-09-15.*\.pdf$/i);
  });

  test('renames macOS screenshot with date and keeps extension', async ({
    page,
    context,
  }) => {
    await page.goto('/');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=macOS Screenshot (with date)'),
    ]);
    await download.path().catch(() => null); // images may cancel; best effort
    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) =>
        item.original === 'Screenshot 2025-09-23 at 11.07.54.png' &&
        item.phase === 1,
      timeoutMs: 0,
    });
    expect(finalName).toMatch(/\d{4}-\d{2}-\d{2}.*\.png$/i);
  });
});
