/**
 * Prompt API language resolution utilities.
 * Handles building input/output language descriptors for Chrome's Prompt API
 * based on user preferences, detected content language, and supported languages.
 */
import {
  detectBrowserLanguage,
  getUserLanguagePreference,
  normalizeLanguageCode,
  resolveSupportedLanguage,
} from '@/entrypoints/shared/integrations/chrome-ai/language-helpers';
import type { ChromeLanguageModelIODescriptor } from '@/entrypoints/shared/integrations/chrome-ai/types';
import type {
  TextUpgradeAnalysisRequest,
  TextUpgradeIngestionResult,
} from '@/entrypoints/shared/integrations/text-analysis/types';

export interface PromptContext {
  request: TextUpgradeAnalysisRequest;
  ingestion: TextUpgradeIngestionResult;
  summary: string | null;
  language?: string;
}

const SUPPORTED_PROMPT_OUTPUT_LANGUAGES = new Set(['en', 'es', 'ja']);

export function buildPromptInputs(
  context: PromptContext,
): ChromeLanguageModelIODescriptor[] {
  const languages = resolvePromptInputLanguages(context);
  if (languages && languages.length > 0) {
    return [
      {
        type: 'text' as const,
        language: languages[0],
        languages,
      },
    ];
  }
  const fallback = resolvePromptOutputLanguage(context);
  return [
    {
      type: 'text' as const,
      language: fallback,
      languages: [fallback],
    },
  ];
}

export function buildPromptOutputs(
  context: PromptContext,
): ChromeLanguageModelIODescriptor[] {
  const language = resolvePromptOutputLanguage(context);
  return [
    {
      type: 'text' as const,
      language,
      languages: [language],
    },
  ];
}

function resolvePromptInputLanguages(
  context: PromptContext,
): string[] | undefined {
  const preference = getUserLanguagePreference({
    languagePreference: context.request.settings.languagePreference,
  });

  if (preference !== 'auto' && preference !== 'browser') {
    return [normalizeLanguageCode(preference)];
  }

  if (context.language && context.language.trim().length > 0) {
    return [normalizeLanguageCode(context.language)];
  }

  if (preference === 'browser') {
    return [detectBrowserLanguage()];
  }

  return undefined;
}

function resolvePromptOutputLanguage(context: PromptContext): string {
  const preference = getUserLanguagePreference({
    languagePreference: context.request.settings.languagePreference,
  });

  if (preference !== 'auto' && preference !== 'browser') {
    return resolveSupportedLanguage(
      preference,
      SUPPORTED_PROMPT_OUTPUT_LANGUAGES,
    );
  }

  if (context.language && context.language.trim().length > 0) {
    return resolveSupportedLanguage(
      context.language,
      SUPPORTED_PROMPT_OUTPUT_LANGUAGES,
    );
  }

  if (preference === 'browser') {
    return resolveSupportedLanguage(
      detectBrowserLanguage(),
      SUPPORTED_PROMPT_OUTPUT_LANGUAGES,
    );
  }

  return resolveSupportedLanguage(undefined, SUPPORTED_PROMPT_OUTPUT_LANGUAGES);
}
