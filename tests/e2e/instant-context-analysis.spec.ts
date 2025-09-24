import { resolveFinalName } from '../shared/download-resolution';
import { expect, test } from './extension.fixtures';

test.describe('Phase 1 - Instant Context Analysis (PRD Ideal Behavior)', () => {
  test('should rename invoice with vendor and document type context', async ({
    page,
    context,
  }) => {
    // Test Phase 1 context extraction from a real business invoice page
    await page.goto('/scenarios/business/polish-invoice.html');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Pobierz fakturę VAT (PDF)'),
    ]);

    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) =>
        item.original === 'invoice-2025-09-15.pdf' && item.phase === 1,
      timeoutMs: 5000,
    });

    // PRD IDEAL: Phase 1 should extract context from page title and domain
    // Expected: "Biedronka - Faktura - 2025-09-15" (vendor + document type + date)
    // Better: "Biedronka Faktury Online - Faktura VAT - 2025-09-15" (full page context)
    expect(finalName).toMatch(/^.*(?:Biedronka|Faktura).*2025-09-15.*\.pdf$/i);

    // Should be human-readable, not machine-generated filename
    expect(finalName).not.toMatch(/^invoice-2025-09-15\.pdf$/i);

    // Should preserve extension
    expect(finalName).toMatch(/\.pdf$/);

    console.log(`Ideal: "Biedronka - Faktura - 2025-09-15.pdf"`);
    console.log(`Actual: "${finalName}"`);
  });

  test('should rename screenshot with page context instead of timestamp', async ({
    page,
    context,
  }) => {
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
        item.phase === 1,
      timeoutMs: 5000,
    });

    // PRD IDEAL: Should extract meaningful context from design context
    // Expected: "Figma - Dialog Component - Design" or "Figma - Navbar Fix"
    expect(finalName).toMatch(/^.*(?:Figma|Dialog|Design|Component).*\.png$/i);

    // Should NOT include precise machine timestamp
    expect(finalName).not.toMatch(/11\.07\.54/);
    expect(finalName).not.toMatch(/2025-09-23 at/);

    // Should preserve extension
    expect(finalName).toMatch(/\.png$/);

    console.log(`Ideal: "Figma - Dialog Component - Design.png"`);
    console.log(`Actual: "${finalName}"`);
  });

  test('should extract context from research paper download', async ({
    page,
    context,
  }) => {
    await page.goto('/scenarios/academic/research-paper.html');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=📄 Full Paper (PDF) - 1.2 MB'),
    ]);

    const finalName = await resolveFinalName({
      context,
      download,
      historyPredicate: (item) =>
        item.original === 'research-paper.pdf' && item.phase === 1,
      timeoutMs: 5000,
    });

    // PRD IDEAL: Should recognize academic context and add meaningful details
    // Expected: "AI Ethics in Healthcare - Research Paper" or "Journal of AI Ethics - Research Paper"
    expect(finalName).toMatch(/^.*(?:AI Ethics|Healthcare|Research Paper).*\.pdf$/i);

    // Should not be the generic original name
    expect(finalName).not.toBe('research-paper.pdf');

    console.log(`Ideal: "AI Ethics in Healthcare - Research Paper.pdf"`);
    console.log(`Actual: "${finalName}"`);
  });

  test('should handle meeting notes with business context', async ({
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
        item.original === 'meeting-notes.txt' && item.phase === 1,
      timeoutMs: 5000,
    });

    // PRD IDEAL: Should recognize business meeting context
    // Expected: "Sprint Planning - Meeting Notes" or "Waypass - Sprint Planning - Meeting Notes"
    expect(finalName).toMatch(/^.*(?:Sprint Planning|Meeting Notes|Waypass).*\.txt$/i);

    // Should include business context from the page
    const hasBusinessContext =
      finalName.toLowerCase().includes('sprint') ||
      finalName.toLowerCase().includes('planning') ||
      finalName.toLowerCase().includes('waypass') ||
      finalName.match(/\d{4}-\d{2}-\d{2}/); // Date qualifier

    expect(hasBusinessContext).toBe(true);

    console.log(`Ideal: "Waypass - Sprint Planning - Meeting Notes - 2025-09-20.txt"`);
    console.log(`Actual: "${finalName}"`);
  });
});
