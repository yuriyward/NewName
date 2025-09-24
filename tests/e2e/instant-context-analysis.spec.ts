import { resolveFinalName } from '../shared/download-resolution';
import { expect, test } from './extension.fixtures';

test.describe('Phase 1 — Deterministic Strategies', () => {
  test.beforeEach(async ({ context }) => {
    // Ensure storage is clean between tests so the default strategy applies consistently.
    await context.storageState({ path: undefined });
  });

  test('appends date to original invoice filename', async ({
    page,
    context,
  }) => {
    await page.goto('/scenarios/business/biedronka-receipt.html');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Pobierz fakturę VAT (PDF)'),
    ]);

    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) =>
        item.original === 'invoice-2025-09-15.pdf' &&
        item.phase === 'instant-baseline',
      timeoutMs: 5000,
    });

    expect(finalName).toMatch(/^Invoice 2025 09 15 \d{4}-\d{2}-\d{2}\.pdf$/);
  });

  test('appends date to screenshot filename', async ({ page, context }) => {
    await page.goto('/scenarios/design/figma-component.html');

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
      timeoutMs: 5000,
    });

    expect(finalName).toMatch(
      /^Screenshot 2025 09 23 At 11 07 54 \d{4}-\d{2}-\d{2}\.png$/,
    );
  });
});
