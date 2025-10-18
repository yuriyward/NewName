/**
 * Simple logging helper for PDF analysis.
 * Offscreen documents cannot rely on debug toggles, so use console directly.
 */
export function logPdfDebug(
  event: string,
  data?: Record<string, unknown>,
): void {
  if (data) {
    console.log(`[PdfAnalysis] ${event}`, data);
    return;
  }
  console.log(`[PdfAnalysis] ${event}`);
}
