import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  buildPromptInputs,
  buildPromptOutputs,
  type PromptContext,
} from '@/entrypoints/shared/integrations/chrome-ai/prompt-language-resolver';
import type {
  ChromeLanguageModelAvailabilityOptions,
  ChromeLanguageModelConstructor,
  ChromeLanguageModelSession,
} from '@/entrypoints/shared/integrations/chrome-ai/types';
import type { TextAnalysisMode } from '@/entrypoints/shared/integrations/text-analysis/types';

export interface PromptFilenameResult {
  stem: string;
  qualifiers: string[];
  confidence: number;
  explanation?: string;
}

// Configuration constants for Prompt API
const PROMPT_TIMEOUT_MS = 5_000;
const PROMPT_TEXT_SLICE = 4_000;
const MAX_QUALIFIERS = 4;
const FALLBACK_OUTPUT_LANGUAGE = 'en';

const PROMPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['stem', 'qualifiers', 'confidence', 'explanation'],
  properties: {
    stem: {
      type: 'string',
      minLength: 3,
      maxLength: 120,
    },
    qualifiers: {
      type: 'array',
      maxItems: MAX_QUALIFIERS,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 40,
      },
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    explanation: {
      type: 'string',
      minLength: 0,
      maxLength: 200,
    },
  },
} as const;

export async function generatePromptFilename(
  context: PromptContext,
): Promise<PromptFilenameResult | null> {
  const modelCtor = resolveLanguageModel();
  if (!modelCtor) {
    return null;
  }

  if (!isModePromptEnabled(context.request.settings.mode)) {
    return null;
  }

  const availabilityOptions = buildAvailabilityOptions(context);
  if (!(await checkPromptCapabilities(modelCtor, availabilityOptions))) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROMPT_TIMEOUT_MS);
  let session: ChromeLanguageModelSession | null = null;

  try {
    const expectedInputs = buildPromptInputs(context);
    const expectedOutputs = buildPromptOutputs(context);
    const outputLanguage =
      expectedOutputs[0]?.language ?? FALLBACK_OUTPUT_LANGUAGE;

    debugLogger.log('[PromptAI] create() options:', {
      expectedInputs,
      expectedOutputs,
      outputLanguage,
    });

    session = await modelCtor.create({
      signal: controller.signal,
      systemPrompt: buildSystemPrompt(),
      expectedInputs,
      expectedOutputs,
      outputLanguage,
    });

    const promptInput = buildPromptInput(context);
    const raw = await session.prompt(promptInput, {
      responseConstraint: PROMPT_SCHEMA,
      omitResponseConstraintInput: true,
      signal: controller.signal,
    });
    const parsed = parsePromptResponse(raw);
    return parsed;
  } catch (error) {
    if (controller.signal.aborted) {
      debugLogger.warn('[TextUpgradeAI] Prompt session aborted due to timeout');
    } else if (error instanceof DOMException) {
      debugLogger.warn('[TextUpgradeAI] Prompt API error', {
        name: error.name,
        message: error.message,
      });
    } else {
      debugLogger.warn('[TextUpgradeAI] Prompt session failed', { error });
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
    try {
      session?.destroy?.();
    } catch (destroyError) {
      debugLogger.log('[TextUpgradeAI] Prompt session destroy failed', {
        destroyError,
      });
    }
  }
}

function isModePromptEnabled(mode: TextAnalysisMode | undefined): boolean {
  switch (mode) {
    case undefined:
    case 'on-device-only':
    case 'hybrid-ask':
    case 'hybrid-always':
      return true;
    default:
      return false;
  }
}

function resolveLanguageModel(): ChromeLanguageModelConstructor | null {
  const globalScope = globalThis as typeof globalThis & {
    LanguageModel?: ChromeLanguageModelConstructor;
    ai?: { languageModel?: ChromeLanguageModelConstructor };
  };

  if (globalScope.LanguageModel?.create) {
    return globalScope.LanguageModel;
  }
  if (globalScope.ai?.languageModel?.create) {
    return globalScope.ai.languageModel;
  }
  return null;
}

async function checkPromptCapabilities(
  ctor: ChromeLanguageModelConstructor,
  options: ChromeLanguageModelAvailabilityOptions,
): Promise<boolean> {
  try {
    const capabilities = await ctor.capabilities?.(options);
    if (!capabilities) {
      return true;
    }
    const availability = capabilities.available;
    return availability === 'readily' || availability === 'processing';
  } catch (error) {
    debugLogger.warn('[TextUpgradeAI] Prompt capabilities check failed', {
      error,
    });
    return false;
  }
}

function buildAvailabilityOptions(
  context: PromptContext,
): ChromeLanguageModelAvailabilityOptions {
  const expectedInputs = buildPromptInputs(context);
  const expectedOutputs = buildPromptOutputs(context);
  const outputLanguage = expectedOutputs[0]?.language;
  return {
    expectedInputs,
    expectedOutputs,
    outputLanguage,
  } satisfies ChromeLanguageModelAvailabilityOptions;
}

function buildSystemPrompt(): string {
  return [
    'You rename downloaded files to be descriptive, concise, and professional.',
    'Output JSON only, matching the schema provided via response constraints.',
    'Prefer stems with 3-6 meaningful tokens. Use qualifiers for concise attributes such as topic, language, or truncated input.',
    'Never repeat tokens across stem and qualifiers.',
  ].join(' ');
}

function buildPromptInput({
  request,
  ingestion,
  summary,
  language,
}: PromptContext): string {
  const excerpt = ingestion.text.slice(0, PROMPT_TEXT_SLICE);
  const contextLines: string[] = [];
  contextLines.push(`Original filename: ${request.filename}`);
  contextLines.push(
    `Instant baseline filename: ${request.baseline.final || 'n/a'}`,
  );
  contextLines.push(`Relative path: ${request.relativePath || '(root)'}`);
  if (language) {
    contextLines.push(`Detected language: ${language}`);
  }
  if (summary) {
    contextLines.push(`Summary: ${summary}`);
  }
  contextLines.push('Content excerpt:');
  contextLines.push(excerpt);

  return [
    'Create a JSON object describing the best filename stem and qualifiers.',
    'Fields:',
    '- stem: Descriptive stem in sentence case (no extension).',
    '- qualifiers: Array (≤4) of short descriptors (no duplicates, no numbers unless meaningful).',
    '- confidence: Float 0-1 expressing certainty.',
    '- explanation: 1 sentence describing why the name fits.',
    'Do not include the file extension anywhere.',
    '',
    contextLines.join('\n'),
  ].join('\n');
}

function parsePromptResponse(raw: string): PromptFilenameResult | null {
  try {
    const parsed = JSON.parse(raw) as PromptFilenameResult;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const stem = typeof parsed.stem === 'string' ? parsed.stem.trim() : '';
    const qualifiers = Array.isArray(parsed.qualifiers)
      ? parsed.qualifiers
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter((entry) => entry.length > 0)
          .slice(0, MAX_QUALIFIERS)
      : [];
    const confidence =
      typeof parsed.confidence === 'number' &&
      Number.isFinite(parsed.confidence)
        ? clamp(parsed.confidence, 0, 1)
        : 0.5;
    const explanation =
      typeof parsed.explanation === 'string'
        ? parsed.explanation.trim().slice(0, 200)
        : undefined;

    if (!stem) {
      return null;
    }

    return {
      stem,
      qualifiers,
      confidence,
      explanation,
    };
  } catch (error) {
    debugLogger.warn('[TextUpgradeAI] Failed to parse prompt response', {
      error,
      raw,
    });
    return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
