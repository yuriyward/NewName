/**
 * Shared utilities for Prompt API integration across decision and generation modules.
 * These helpers provide common functionality for session management, availability checks,
 * and response parsing.
 */

import { formatPageContextInline } from '@/entrypoints/shared/context/page-context-formatter';
import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type {
  ChromeLanguageModelConstructor,
  ChromeLanguageModelCreateOptions,
  ChromeLanguageModelSession,
} from '@/entrypoints/shared/integrations/chrome-ai/types';
import type { Separator } from '@/entrypoints/shared/settings/settings';
import type { PageContextDetails } from '@/entrypoints/shared/state/page-context-store';

/**
 * Resolve LanguageModel constructor from Chrome's global scope.
 * Chrome exposes the Prompt API via the LanguageModel global.
 */
export function resolveLanguageModelCtor(): ChromeLanguageModelConstructor | null {
  const globalScope = globalThis as typeof globalThis & {
    LanguageModel?: ChromeLanguageModelConstructor;
  };

  if (globalScope.LanguageModel?.create) {
    return globalScope.LanguageModel;
  }

  return null;
}

/**
 * Normalize language model options for Chrome version compatibility.
 * Ensures both old (outputLanguage) and new (expectedOutputs) API formats are present.
 * - outputLanguage: Old format (Chrome <140)
 * - expectedOutputs: New format (Chrome 140+)
 */
function normalizeLanguageModelOptions(options?: {
  outputLanguage?: string;
}): ChromeLanguageModelCreateOptions {
  const outputLang = options?.outputLanguage || 'en';
  return {
    outputLanguage: outputLang,
    expectedOutputs: [{ type: 'text', languages: [outputLang] }],
  };
}

/**
 * Check if the LanguageModel (Prompt API) is available and ready.
 * Returns availability status string or null if API not present.
 * Supports both old (outputLanguage) and new (expectedOutputs) API formats
 * for Chrome version compatibility.
 */
export async function checkLanguageModelAvailability(options?: {
  outputLanguage?: string;
}): Promise<string | null> {
  const LanguageModelCtor = resolveLanguageModelCtor();

  if (!LanguageModelCtor?.availability) {
    offscreenLogger.log('[PromptHelpers] LanguageModel API not available');
    return null;
  }

  try {
    const normalizedOptions = normalizeLanguageModelOptions(options);
    const availability =
      await LanguageModelCtor.availability(normalizedOptions);

    offscreenLogger.log('[PromptHelpers] Availability check', {
      availability,
      ...normalizedOptions,
    });

    return availability;
  } catch (error) {
    offscreenLogger.warn('[PromptHelpers] Availability check failed', {
      error,
    });
    return null;
  }
}

/**
 * Create a LanguageModel prompt session with common configuration.
 * Handles session creation and logs configuration for debugging.
 * Supports both old (outputLanguage) and new (expectedOutputs) API formats
 * for Chrome version compatibility.
 */
export async function createPromptSession(
  options: ChromeLanguageModelCreateOptions,
): Promise<ChromeLanguageModelSession | null> {
  const LanguageModelCtor = resolveLanguageModelCtor();

  if (!LanguageModelCtor?.create) {
    offscreenLogger.log(
      '[PromptHelpers] Cannot create session - API not available',
    );
    return null;
  }

  try {
    const normalizedOptions: ChromeLanguageModelCreateOptions = {
      ...options,
      ...normalizeLanguageModelOptions(options),
    };

    offscreenLogger.log('[PromptHelpers] Creating prompt session', {
      hasSystemPrompt: !!normalizedOptions.systemPrompt,
      temperature: normalizedOptions.temperature,
      topK: normalizedOptions.topK,
      outputLanguage: normalizedOptions.outputLanguage,
      expectedOutputs: normalizedOptions.expectedOutputs,
    });

    const session = await LanguageModelCtor.create(normalizedOptions);

    if (!session) {
      offscreenLogger.warn('[PromptHelpers] Session created but is null');
      return null;
    }

    offscreenLogger.log('[PromptHelpers] Session created successfully');
    return session;
  } catch (error) {
    offscreenLogger.warn('[PromptHelpers] Session creation failed', { error });
    return null;
  }
}

/**
 * Parse and validate structured JSON response from Prompt API.
 * Generic helper that validates the response is valid JSON.
 * Additional schema validation should be done by the caller.
 */
export function parseStructuredResponse<T>(
  response: string,
  context: string,
): T | null {
  try {
    const trimmed = response.trim();
    if (trimmed.length === 0) {
      offscreenLogger.warn(`[PromptHelpers] Empty response for ${context}`);
      return null;
    }

    const parsed = JSON.parse(trimmed) as T;

    offscreenLogger.log(`[PromptHelpers] Parsed ${context} response`, {
      response: parsed,
    });

    return parsed;
  } catch (error) {
    offscreenLogger.warn(
      `[PromptHelpers] Failed to parse ${context} response`,
      {
        error,
        response: response.slice(0, 200), // Log first 200 chars
      },
    );
    return null;
  }
}

/**
 * Format policy rules as human-readable text for inclusion in prompts.
 * This helps the AI understand the filename constraints and preferences.
 */
export function formatPolicyRules(settings: {
  maxLength: number;
  separator: Separator;
  transliterateAscii: boolean;
}): string {
  const separatorDesc =
    settings.separator === 'clean'
      ? 'spaces'
      : settings.separator === 'kebab'
        ? 'hyphens (-)'
        : 'underscores (_)';

  const rules = [
    `Maximum filename length: ${settings.maxLength} characters`,
    `Word separator: ${separatorDesc}`,
    'Safe characters only: letters, numbers, spaces, hyphens, underscores',
    'No special characters: / \\ : * ? " < > |',
    'Single dot before extension only',
  ];

  if (settings.transliterateAscii) {
    rules.push('Convert diacritics to ASCII equivalents (e.g., ü → u)');
  }

  return rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n');
}

/**
 * Build base context information for prompts.
 * This creates a common context structure that both decision and generation
 * prompts can use.
 */
export interface BasePromptContext {
  filename: string;
  summary?: string;
  language?: string;
  fileType: string;
  pageContext?: PageContextDetails;
}

export function buildBaseContextDescription(
  context: BasePromptContext,
): string {
  const parts: string[] = [];

  parts.push(`Current filename: "${context.filename}"`);

  if (context.summary && context.summary.trim().length > 0) {
    parts.push(`Content summary: ${context.summary.trim()}`);
  } else {
    parts.push('Content summary: Not available');
  }

  if (context.language) {
    const langUpper = context.language.toUpperCase();
    parts.push(`Detected language: ${langUpper}`);
  } else {
    parts.push('Detected language: Unknown');
  }

  parts.push(`File type: ${context.fileType}`);

  // Add page context if available
  const pageContextFormatted = formatPageContextInline(context.pageContext);
  if (pageContextFormatted) {
    parts.push(`Source page: ${pageContextFormatted}`);
  }

  return parts.join('\n');
}

/**
 * Safely destroy a prompt session, catching any errors.
 * Sessions must be destroyed to prevent memory leaks.
 */
export function destroyPromptSession(
  session: ChromeLanguageModelSession,
): void {
  try {
    session.destroy?.();
  } catch (error) {
    offscreenLogger.warn('[PromptHelpers] Session destruction failed', {
      error,
    });
  }
}

/**
 * Format a language code for display in prompts.
 * Converts ISO codes to uppercase for consistency.
 */
export function formatLanguageForPrompt(language: string | undefined): string {
  if (!language) return 'unknown';
  return language.toUpperCase();
}

/**
 * Truncate text for inclusion in prompts while respecting token limits.
 * Rough heuristic: ~4 chars per token.
 */
export function truncateForPrompt(
  text: string,
  maxChars: number = 2000,
): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars).trim()}...`;
}
