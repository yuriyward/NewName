/**
 * Prompt building logic for filename generation.
 * Constructs structured prompts that guide AI models to generate appropriate filenames.
 *
 * SECURITY: URL sanitization is applied to page context URLs.
 * Other page context fields (title, heading) are already sanitized in buildBaseContextDescription.
 */

import { sanitizeUrl } from '@/entrypoints/shared/utils/prompt-sanitization';
import type { FilenameGenerationContext } from './filename-generation-types';
import {
  buildBaseContextDescription,
  formatPolicyRules,
  truncateForPrompt,
} from './prompt-helpers';

/**
 * System prompt that establishes the AI's role as a filename generator.
 * This is separate from the per-request prompt and sets the overall context.
 */
export const GENERATION_SYSTEM_PROMPT = `You are a professional filename generator. Your job is to create clear, descriptive filenames based on file content.

Follow these principles:
- Clarity: Names should immediately convey what the file contains
- Brevity: Keep names concise while maintaining meaning (3-6 words ideal)
- Consistency: Follow the user's formatting preferences
- Practicality: Create names that work well in file systems and searches
- Relevance: Focus on the main topic, not minor details

Avoid:
- Technical jargon unless the content is technical
- Redundant words that don't add meaning
- File extensions in the stem (they're added separately)
- Special characters that might cause issues
- Overly generic terms like "document" or "file"

Always respond with valid JSON matching the provided schema.`;

/**
 * Build the generation prompt that asks the AI to create a new filename.
 * This prompt includes policy rules and examples to guide generation.
 * For PDFs with extracted titles, prioritizes using the exact title in the filename.
 *
 * @param context - Filename generation context with settings and content
 * @returns Formatted prompt string
 */
export function buildGenerationPrompt(
  context: FilenameGenerationContext,
): string {
  const baseContext = buildBaseContextDescription({
    filename: context.currentBaseline,
    summary: context.summary,
    language: context.language,
    fileType: 'image', // Image pipeline reuses this generator
    pageContext: context.pageContext,
  });

  // Truncate summary if too long to avoid token limits
  const summaryForPrompt = truncateForPrompt(context.summary, 800).trim();

  const policyRules = formatPolicyRules(context.settings);

  const separatorExample =
    context.settings.separator === 'clean'
      ? 'Budget Meeting Notes'
      : context.settings.separator === 'kebab'
        ? 'budget-meeting-notes'
        : 'budget_meeting_notes';

  const separatorDescription =
    context.settings.separator === 'clean'
      ? 'Use single spaces between words.'
      : context.settings.separator === 'kebab'
        ? 'Use lowercase words joined with hyphens.'
        : 'Use lowercase words joined with underscores.';

  const transliterationGuidance = context.settings.transliterateAscii
    ? 'Convert diacritics to their ASCII equivalents (e.g., café → cafe).'
    : 'Preserve Unicode characters unless unsafe for filenames.';

  const jsonSummary = JSON.stringify(summaryForPrompt || 'Not available');
  const jsonBaseline = JSON.stringify(context.currentBaseline);

  const pageContextHints: string[] = [];
  if (context.pageContext?.title) {
    // Note: Title and heading are already sanitized in buildBaseContextDescription
    pageContextHints.push(
      `  • Page title: ${JSON.stringify(context.pageContext.title)}`,
    );
  }
  if (context.pageContext?.heading) {
    // Note: Title and heading are already sanitized in buildBaseContextDescription
    pageContextHints.push(
      `  • Page heading: ${JSON.stringify(context.pageContext.heading)}`,
    );
  }
  if (context.pageContext?.url) {
    // Sanitize URL to prevent injection attacks
    const sanitizedUrl = sanitizeUrl(context.pageContext.url);
    pageContextHints.push(`  • Source URL: ${sanitizedUrl}`);
  }

  const sourceSpecificGuidance =
    pageContextHints.length > 0
      ? `- The source includes:\n${pageContextHints.join(
          '\n',
        )}\n- If these contain specific names or locations that the baseline omits, reuse them verbatim near the start of the stem.\n- Preserve numeric identifiers that appear in the source by appending them as short qualifiers when helpful.`
      : '';

  // Add PDF-specific generation guidance if title was extracted
  const pdfGuidance =
    context.pdfContext?.shouldPrioritizeTitle &&
    context.pdfContext?.documentTitle
      ? `\nPDF PRIORITY: This is a PDF with an extracted document title: "${context.pdfContext.documentTitle}"
- PRIORITIZE using this exact title as the primary component of the filename
- If the title is a complete, descriptive phrase, use it directly
- Only shorten or modify the title if it exceeds the max length
- The title is authoritative for this document`
      : '';

  return `You generate descriptive filename stems that follow strict formatting policies.

Context:
${baseContext}

Content summary (JSON string): ${jsonSummary}
Current baseline name (JSON string): ${jsonBaseline}${pdfGuidance}

Formatting requirements:
${policyRules}
- ${separatorDescription}
- ${transliterationGuidance}
- Keep the stem under ${context.settings.maxLength} characters.
- Never include a file extension (no ".png", ".jpg", etc.).

Generation guidance:
- Focus on the most important subject (3-6 words ideal).
- Prefer concrete nouns and descriptors over vague phrases.
- Qualifiers are optional; include at most three short items if they add clarity.
${sourceSpecificGuidance}

Output schema:
\`\`\`json
{
  "stem": string,
  "qualifiers": string[]?,
  "confidence": number,
  "explanation": string?
}
\`\`\`

Well-formed examples:
1. {"stem": "${separatorExample}", "confidence": 0.86, "explanation": "Summarizes the project roadmap topic."}
2. {"stem": "${separatorExample}", "qualifiers": ["2025"], "confidence": 0.9, "explanation": "Adds the year as a useful qualifier."}

Respond with JSON only—no markdown, no additional text, no trailing commas.`;
}
