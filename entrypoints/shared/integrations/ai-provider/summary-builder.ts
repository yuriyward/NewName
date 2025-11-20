/**
 * AI Analysis Summary Builder
 *
 * Provides utilities for building comprehensive summaries from AI analysis results.
 * These summaries combine multiple pieces of information (description, decision reasoning)
 * into user-friendly explanations.
 */

/**
 * Build comprehensive summary for cloud image analysis
 * Combines description and decision reasoning for richer context
 *
 * @param description - AI-generated description of the image content
 * @param decisionExplanation - Optional short explanation of why rename was needed
 * @returns Formatted summary string with description and reasoning
 */
export function buildCloudImageAnalysisSummary(
  description: string,
  decisionExplanation?: string,
): string {
  const parts: string[] = [];

  // Add description with label
  if (description && description.trim().length > 0) {
    parts.push(`Content: ${description.trim()}`);
  }

  // Add decision explanation if provided
  if (decisionExplanation && decisionExplanation.trim().length > 0) {
    parts.push(`Decision: ${decisionExplanation.trim()}`);
  }

  return parts.join('\n\n');
}

/**
 * Build comprehensive summary for cloud text analysis
 * Combines text content, decision reasoning, and generation explanation
 *
 * @param textContent - Text content or summary
 * @param decisionExplanation - Optional explanation of why rename was needed
 * @param generationReasoning - Optional explanation of filename choice
 * @returns Formatted summary string with all context
 */
export function buildCloudTextAnalysisSummary(
  textContent: string,
  decisionExplanation?: string,
  generationReasoning?: string,
): string {
  const parts: string[] = [];

  // Add text content with label (truncate if too long)
  if (textContent && textContent.trim().length > 0) {
    const truncatedContent =
      textContent.length > 200
        ? `${textContent.slice(0, 200).trim()}...`
        : textContent.trim();
    parts.push(`Content: ${truncatedContent}`);
  }

  // Add decision explanation if provided
  if (decisionExplanation && decisionExplanation.trim().length > 0) {
    parts.push(`Decision: ${decisionExplanation.trim()}`);
  }

  // Add generation reasoning if provided
  if (generationReasoning && generationReasoning.trim().length > 0) {
    parts.push(`Reasoning: ${generationReasoning.trim()}`);
  }

  return parts.join('\n\n');
}
