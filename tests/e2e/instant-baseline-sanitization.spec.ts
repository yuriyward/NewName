import { resolveFinalName } from '../shared/download-resolution';
import { expect, setSettingsInExtension, test } from './extension.fixtures';

test.describe('Instant Baseline — Filename Sanitization', () => {
  test.beforeEach(async ({ context }) => {
    // Clean storage for consistent test behavior
    await context.storageState({ path: undefined });
  });

  test('fallback preserves original filename when startTime unavailable', async ({
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
    });

    // Default strategy 'original-with-date' falls back to original when startTime unavailable
    expect(finalName).toBe('historia_transakcji_2509238693113130.pdf');
    expect(finalName).toContain('_'); // Original underscores preserved in fallback
  });

  test('maintains filesystem-safe filenames', async ({
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
    });

    // Default strategy falls back to original filename
    expect(finalName).toBe('meeting-notes.txt');

    // Verify the filename is safe for filesystem
    expect(finalName).not.toMatch(/[\\/:*?"<>|]/); // No unsafe characters
    expect(finalName.length).toBeLessThan(255); // Within filesystem limits
  });

  test('preserves important punctuation and numbers in fallback', async ({
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
    });

    // Should preserve the transaction number and original structure
    expect(finalName).toBe('historia_transakcji_2509238693113130.pdf');
    expect(finalName).toContain('2509238693113130');
    expect(finalName).toContain('historia');
    expect(finalName).toContain('transakcji');
    expect(finalName).toContain('_'); // Original underscores preserved in fallback
  });

  test('uses page title when available for page-title strategy', async ({
    page,
    context,
    serviceWorker,
  }) => {
    // First set the extension to use page-title strategy
    await setSettingsInExtension(serviceWorker, {
      version: 1,
      mode: 'balanced',
      language: 'auto',
      separator: 'clean',
      maxLen: 60,
      transliterateAscii: false,
      instantBaselineStrategy: 'page-title',
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
      timeoutMs: 1500,
    });

    // Should use sanitized page title with clean separator
    expect(finalName).toBe('Biedronka Historia Transakcji Moje Konto.pdf');
  });

  // Success scenario tests - when strategies work as intended
  test('sanitizes filename with date when startTime is available', async ({
    page,
    context,
    serviceWorker,
  }) => {
    await page.goto('/scenarios/business/biedronka-receipt.html');

    // Configure original-with-date strategy
    await setSettingsInExtension(serviceWorker, {
      version: 1,
      mode: 'balanced',
      language: 'auto',
      separator: 'clean',
      maxLen: 60,
      transliterateAscii: false,
      instantBaselineStrategy: 'original-with-date',
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
    });

    // Should sanitize underscores and append date (clean separator capitalizes tokens)
    expect(finalName).toMatch(/^Historia Transakcji 2509238693113130 \d{4}-\d{2}-\d{2}\.pdf$/);
    expect(finalName).not.toContain('_');
  });

  test('uses page title with proper sanitization for page-title strategy', async ({
    page,
    context,
    serviceWorker,
  }) => {
    // Configure page-title strategy
    await setSettingsInExtension(serviceWorker, {
      version: 1,
      mode: 'balanced',
      language: 'auto',
      separator: 'clean',
      maxLen: 60,
      transliterateAscii: false,
      instantBaselineStrategy: 'page-title',
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

    await page.goto('/scenarios/business/biedronka-receipt.html');
    // Allow content script to publish page context
    await page.waitForTimeout(100);

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
    });

    // Should use sanitized page title with clean separator (spaces)
    expect(finalName).toBe('Biedronka Historia Transakcji Moje Konto.pdf');
  });

  test('combines page title with date for page-title-with-date strategy', async ({
    page,
    context,
    serviceWorker,
  }) => {
    // Configure page-title-with-date strategy
    await setSettingsInExtension(serviceWorker, {
      version: 1,
      mode: 'balanced',
      language: 'auto',
      separator: 'clean',
      maxLen: 60,
      transliterateAscii: false,
      instantBaselineStrategy: 'page-title-with-date',
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

    await page.goto('/scenarios/design/figma-component.html');
    // Allow content script to publish page context
    await page.waitForTimeout(100);

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
      timeoutMs: 2000,
    });

    // Should combine sanitized page title with current date (clean separator)
    expect(finalName).toMatch(/^Navbar Fix Dialog Component Figma \d{4}-\d{2}-\d{2}\.png$/);
    expect(finalName).toContain('Figma');
  });

  test('applies different separator styles correctly', async ({
    page,
    context,
    serviceWorker,
  }) => {
    // Configure snake_case separator with original-with-date strategy
    await setSettingsInExtension(serviceWorker, {
      version: 1,
      mode: 'balanced',
      language: 'auto',
      separator: 'snake',
      maxLen: 60,
      transliterateAscii: false,
      instantBaselineStrategy: 'original-with-date',
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
      timeoutMs: 2000,
    });

    // Should use snake_case separator and append date (date keeps '-')
    expect(finalName).toMatch(/^meeting_notes_\d{4}-\d{2}-\d{2}\.txt$/);
    expect(finalName).toContain('_');
  });
});
