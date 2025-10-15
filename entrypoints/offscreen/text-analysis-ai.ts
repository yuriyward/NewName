import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  detectBrowserLanguage,
  getUserLanguagePreference,
  normalizeLanguageCode,
  resolveSupportedLanguage,
} from '@/entrypoints/shared/integrations/chrome-ai/language-helpers';
import type { AiModelStatusMap } from '@/entrypoints/shared/integrations/chrome-ai/model-status';
import type {
  ChromeLanguageDetectorConstructor,
  ChromeLanguageModelIODescriptor,
  // ============================================================
  // TODO: TEMPORARILY DISABLED - Re-enable after step-by-step integration
  // ChromeSummarizerConstructor,
  // ============================================================
} from '@/entrypoints/shared/integrations/chrome-ai/types';
import type {
  TextAnalysisMode,
  TextUpgradeAnalysisRequest,
  TextUpgradeAnalysisResponse,
  TextUpgradeAnalysisSuccess,
  TextUpgradeAnalysisUnavailable,
  TextUpgradeIngestionResult,
  TextUpgradeModelSource,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import {
  ensureAiModelsReadyRemote,
  recordAiPipelineTelemetryRemote,
} from '@/entrypoints/shared/messaging/extension-messaging';
import {
  applyFilenamePolicy,
  type FilenamePolicyResult,
} from '@/entrypoints/shared/naming/policy-engine';
import { detectOriginalDelimiter } from '@/entrypoints/shared/pipeline/path-utils';
import { extractExtension } from '@/entrypoints/shared/utils/filename';

// ============================================================
// TODO: TEMPORARILY DISABLED - Re-enable after step-by-step integration
// import {
//   generatePromptFilename,
//   type PromptFilenameResult,
// } from './text-analysis-prompt';
// ============================================================

const SUPPORTED_PROMPT_OUTPUT_LANGUAGES = new Set(['en', 'es', 'ja']);

type LanguageDetectionResult = {
  language?: string;
  confidence?: number;
  source: 'preference' | 'browser' | 'detector' | 'fallback';
};

function recordPipelineBlocked(mode: TextAnalysisMode, reason: string): void {
  void recordAiPipelineTelemetryRemote({
    type: 'blocked',
    mode,
    reason,
  }).catch((error) => {
    debugLogger.warn('[TextUpgradeAI] Failed to record blocked telemetry', {
      mode,
      reason,
      error,
    });
  });
}

function recordPipelineRouted(source: TextUpgradeModelSource): void {
  void recordAiPipelineTelemetryRemote({
    type: 'routed',
    source,
  }).catch((error) => {
    debugLogger.warn('[TextUpgradeAI] Failed to record routed telemetry', {
      source,
      error,
    });
  });
}

async function detectLanguage(
  text: string,
  preference: TextUpgradeAnalysisRequest['settings']['languagePreference'],
): Promise<LanguageDetectionResult> {
  const effectivePreference = getUserLanguagePreference({
    languagePreference: preference,
  });

  if (effectivePreference !== 'auto' && effectivePreference !== 'browser') {
    const language = normalizeLanguageCode(effectivePreference);
    return { language, confidence: 1, source: 'preference' };
  }

  if (effectivePreference === 'browser') {
    const browserLocale = detectBrowserLanguage();
    return {
      language: browserLocale,
      confidence: browserLocale ? 0.5 : undefined,
      source: 'browser',
    };
  }

  const LanguageDetectorCtor = (globalThis as { LanguageDetector?: unknown })
    .LanguageDetector as ChromeLanguageDetectorConstructor | undefined;

  if (!LanguageDetectorCtor?.create) {
    debugLogger.log('[TextUpgradeAI] LanguageDetector API not available', {
      hasGlobal: !!LanguageDetectorCtor,
      hasCreate: !!LanguageDetectorCtor?.create,
    });
    return { source: 'fallback' };
  }

  try {
    const availability = await LanguageDetectorCtor.availability?.();
    debugLogger.log('[TextUpgradeAI] Language detector availability', {
      availability,
    });

    if (availability && availability === 'unavailable') {
      return { source: 'fallback' };
    }

    const detector = await LanguageDetectorCtor.create();
    if (!detector) {
      debugLogger.warn('[TextUpgradeAI] Language detector created but is null');
      return { source: 'fallback' };
    }

    try {
      // Chrome API uses "detect", not "detectLanguage"
      if (typeof detector.detect !== 'function') {
        debugLogger.warn(
          '[TextUpgradeAI] Language detector missing detect method',
          {
            detectorType: typeof detector,
            detectorKeys: Object.keys(detector),
          },
        );
        return { source: 'fallback' };
      }

      const results = await detector.detect(text.slice(0, 5_000));
      const best = results?.[0];
      if (best?.detectedLanguage) {
        return {
          language: normalizeLanguageCode(best.detectedLanguage),
          confidence: best.confidence,
          source: 'detector',
        };
      }
      return { source: 'fallback' };
    } finally {
      detector.destroy?.();
    }
  } catch (error) {
    debugLogger.warn('[TextUpgradeAI] Language detection failed', { error });
    return { source: 'fallback' };
  }
}

// ============================================================
// TODO: TEMPORARILY DISABLED - Re-enable summarization after step-by-step integration
// ============================================================
// async function summariseText(
//   text: string,
//   language?: string,
// ): Promise<string | null> {
//   const SummarizerCtor = (globalThis as { Summarizer?: unknown }).Summarizer as
//     | ChromeSummarizerConstructor
//     | undefined;
//
//   if (!SummarizerCtor?.create) {
//     return fallbackSummary(text);
//   }
//
//   try {
//     const outputLanguage = resolveSummaryOutputLanguage(language);
//     const expectedInputLanguages =
//       language && language.trim().length > 0
//         ? [language.toLowerCase()]
//         : undefined;
//
//     const availability = await SummarizerCtor.availability?.({
//       expectedInputLanguages,
//       outputLanguage,
//     });
//     if (availability && availability === 'unavailable') {
//       return fallbackSummary(text);
//     }
//
//     const summarizer = await SummarizerCtor.create({
//       type: 'key-points',
//       format: 'markdown',
//       length: 'short',
//       outputLanguage,
//       expectedInputLanguages,
//     });
//
//     try {
//       const sample = text.length > 20_000 ? text.slice(0, 20_000) : text;
//       const response = await summarizer.summarize(sample, {
//         context: language ? `Language: ${language}` : undefined,
//         outputLanguage,
//         expectedInputLanguages,
//       });
//       const summary = response?.summary?.trim();
//       if (summary && summary.length > 0) {
//         return summary;
//       }
//       return fallbackSummary(text);
//     } finally {
//       summarizer.destroy?.();
//     }
//   } catch (error) {
//     debugLogger.warn('[TextUpgradeAI] Summarizer failed', { error });
//     return fallbackSummary(text);
//   }
// }
//
// function fallbackSummary(text: string): string | null {
//   const lines = text
//     .split(/\n+/)
//     .map((line) => line.trim())
//     .filter(Boolean);
//   if (lines.length === 0) {
//     return null;
//   }
//   const first = lines[0];
//   if (first.length <= 160) {
//     return first;
//   }
//   return `${first.slice(0, 157).trimEnd()}…`;
// }
// ============================================================

// ============================================================
// TODO: TEMPORARILY DISABLED - Re-enable after step-by-step integration
// ============================================================
// function deriveSubject(summary: string | null, text: string): string {
//   if (summary) {
//     const firstLine = summary.split(/\n+/).find((line) => line.trim().length);
//     if (firstLine) {
//       return stripListPrefix(firstLine.trim());
//     }
//   }
//   const fallback = text.split(/\n+/).find((line) => line.trim().length);
//   if (fallback) {
//     return stripListPrefix(fallback.trim());
//   }
//   return 'Document';
// }
//
// function stripListPrefix(value: string): string {
//   return value.replace(/^[-*•\d.]+\s+/, '');
// }
// ============================================================

/**
 * Extract filename stem (without extension) from baseline filename
 */
function extractStemFromBaseline(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot > 0 && lastDot < filename.length - 1) {
    return filename.slice(0, lastDot);
  }
  return filename;
}

interface FilenameContext {
  request: TextUpgradeAnalysisRequest;
  ingestion: TextUpgradeIngestionResult;
  subject: string;
  language?: string;
}

function buildFilename({
  request,
  ingestion: _ingestion, // Unused in simplified version
  subject,
  language,
}: FilenameContext): FilenamePolicyResult {
  const extension =
    extractExtension(request.filename) ??
    extractExtension(request.relativePath) ??
    extractExtension(request.baseline.final) ??
    null;

  const qualifiers: string[] = [];

  // ============================================================
  // TODO: TEMPORARILY DISABLED - Re-enable truncated marker after step-by-step integration
  // ============================================================
  // if (ingestion.truncated) {
  //   qualifiers.push('excerpt');
  // }
  // ============================================================

  const baselineStem = extractStemFromBaseline(
    request.baseline.final || request.filename,
  );
  const baselineNormalized = baselineStem.trim().toLowerCase();
  const subjectNormalized = subject.trim().toLowerCase();
  const originalDelimiter = detectOriginalDelimiter(baselineStem);
  const isKebabLike = originalDelimiter === '-';
  const isSnakeLike = originalDelimiter === '_';
  const isLowercaseBaseline =
    baselineStem.length > 0 && baselineStem === baselineStem.toLowerCase();
  const shouldMirrorBaselineDelimiter =
    request.settings.separator === 'clean' &&
    isLowercaseBaseline &&
    subjectNormalized.length > 0 &&
    subjectNormalized === baselineNormalized &&
    (isKebabLike || isSnakeLike);

  const effectiveSeparator =
    shouldMirrorBaselineDelimiter && isKebabLike
      ? 'kebab'
      : shouldMirrorBaselineDelimiter && isSnakeLike
        ? 'snake'
        : request.settings.separator;

  if (language) {
    const formattedLanguage =
      effectiveSeparator === 'clean'
        ? language.toUpperCase()
        : language.toLowerCase();
    qualifiers.push(formattedLanguage);
  }

  const result = applyFilenamePolicy({
    subject,
    qualifiers,
    extension,
    maxLength: request.settings.maxFilenameLength,
    separator: effectiveSeparator,
    transliterateAscii: request.settings.transliterateAscii,
  });

  return result;
}

function buildProposedPath(relativePath: string, filename: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  parts.pop(); // remove existing filename
  parts.push(filename);
  return parts.join('/');
}

function formatReasonTags(
  language?: string,
  promptUsed?: boolean,
  modelSource: TextUpgradeModelSource = 'on-device',
): string[] {
  const tags = ['ai-text-summary'];
  if (language) {
    tags.push(`language-${language.toLowerCase()}`);
  }
  if (promptUsed) {
    tags.push('ai-prompt-structured');
  }
  if (modelSource === 'cloud') {
    tags.push('ai-cloud-fallback');
  }
  return tags;
}

function resolvePreferredOutputLanguage(
  request: TextUpgradeAnalysisRequest,
): string {
  const preference = getUserLanguagePreference({
    languagePreference: request.settings.languagePreference,
  });

  if (preference === 'browser') {
    const browserLanguage = detectBrowserLanguage();
    return resolveSupportedLanguage(
      browserLanguage,
      SUPPORTED_PROMPT_OUTPUT_LANGUAGES,
    );
  }

  if (preference !== 'auto') {
    return resolveSupportedLanguage(
      preference,
      SUPPORTED_PROMPT_OUTPUT_LANGUAGES,
    );
  }

  return resolveSupportedLanguage(undefined, SUPPORTED_PROMPT_OUTPUT_LANGUAGES);
}

function resolveExpectedInputLanguages(
  request: TextUpgradeAnalysisRequest,
): string[] | undefined {
  const preference = getUserLanguagePreference({
    languagePreference: request.settings.languagePreference,
  });

  if (preference === 'browser') {
    return [detectBrowserLanguage()];
  }

  if (preference !== 'auto') {
    return [normalizeLanguageCode(preference)];
  }

  return undefined;
}

// ============================================================
// TODO: TEMPORARILY DISABLED - Will be re-enabled with prompt API
// ============================================================
function _buildLanguageModelInputs(
  request: TextUpgradeAnalysisRequest,
): ChromeLanguageModelIODescriptor[] {
  const languages = resolveExpectedInputLanguages(request);
  if (languages && languages.length > 0) {
    return [
      {
        type: 'text',
        language: languages[0],
        languages,
      },
    ];
  }
  const fallback = resolvePreferredOutputLanguage(request);
  return [
    {
      type: 'text',
      language: fallback,
      languages: [fallback],
    },
  ];
}

// ============================================================
// TODO: TEMPORARILY DISABLED - Will be re-enabled with prompt API
// ============================================================
function _buildLanguageModelOutputs(
  request: TextUpgradeAnalysisRequest,
): ChromeLanguageModelIODescriptor[] {
  const language = resolvePreferredOutputLanguage(request);
  return [
    {
      type: 'text',
      language,
      languages: [language],
    },
  ];
}

// ============================================================
// TODO: TEMPORARILY DISABLED - Will be re-enabled with summarizer
// ============================================================
function _resolveSummaryOutputLanguage(language?: string): string {
  if (language && language.trim().length > 0) {
    return normalizeLanguageCode(language);
  }
  return detectBrowserLanguage();
}

function mapModelStatuses(statuses: AiModelStatusMap): Record<string, string> {
  return Object.fromEntries(
    Object.entries(statuses).map(([key, value]) => [key, value.state]),
  );
}

function describeModelAvailabilityError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Chrome blocked on-device AI because the models are not downloaded yet. Open the AI Model Setup page to download Gemini Nano and try again.';
    }
    if (error.name === 'AbortError') {
      return 'On-device AI setup was cancelled before the models finished downloading.';
    }
  }
  if (error instanceof Error) {
    if (/unavailable/i.test(error.message)) {
      return "This device cannot use Chrome's built-in AI models. Check hardware requirements or update Chrome.";
    }
    return error.message;
  }
  return "Chrome's built-in AI models are not ready yet. Open the AI Model Setup page to finish downloading Gemini Nano.";
}

export async function runTextUpgradePipeline(
  request: TextUpgradeAnalysisRequest,
  ingestion: TextUpgradeIngestionResult,
): Promise<TextUpgradeAnalysisResponse | null> {
  const mode = request.settings.mode ?? 'on-device-only';
  if (mode === 'off') {
    return null;
  }

  // ============================================================
  // SIMPLIFIED: Only check for language-detector availability
  // TODO: Re-enable summarizer and language-model after step-by-step integration
  // ============================================================
  let onDeviceReady = true;
  let modelStatuses: AiModelStatusMap | null = null;
  try {
    debugLogger.log('[TextUpgradeAI] Checking language-detector availability', {
      requestId: request.requestId,
    });

    // Ask background context to prepare the required models
    modelStatuses = await ensureAiModelsReadyRemote({
      ids: ['language-detector'],
      // ============================================================
      // TODO: TEMPORARILY DISABLED - Re-enable after step-by-step integration
      // ============================================================
      // summarizer: {
      //   type: 'key-points',
      //   format: 'markdown',
      //   length: 'short',
      //   outputLanguage: resolvePreferredOutputLanguage(request),
      //   expectedInputLanguages: resolveExpectedInputLanguages(request),
      // },
      // languageModel: {
      //   outputLanguage: resolvePreferredOutputLanguage(request),
      //   expectedInputs: buildLanguageModelInputs(request),
      //   expectedOutputs: buildLanguageModelOutputs(request),
      // },
      // ============================================================
    });
  } catch (error) {
    onDeviceReady = false;
    const message = describeModelAvailabilityError(error);
    debugLogger.warn('[TextUpgradeAI] Language detector unavailable', {
      requestId: request.requestId,
      mode,
      error,
    });
    recordPipelineBlocked(mode, message);
    if (mode === 'on-device-only' || mode === 'hybrid-ask') {
      return {
        status: 'unavailable',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        reason: 'api-unavailable',
        message,
      } satisfies TextUpgradeAnalysisUnavailable;
    }
  }

  if (onDeviceReady && modelStatuses && debugLogger.isEnabled()) {
    debugLogger.log('[TextUpgradeAI] Language detector ready', {
      requestId: request.requestId,
      statuses: mapModelStatuses(modelStatuses),
    });
  }

  // Detect language
  const subjectLanguage = await detectLanguage(
    ingestion.text,
    request.settings.languagePreference,
  );

  // ============================================================
  // TODO: TEMPORARILY DISABLED - Re-enable summarization after step-by-step integration
  // ============================================================
  // const summary = await summariseText(ingestion.text, subjectLanguage.language);
  // ============================================================

  const modelSource: TextUpgradeModelSource = 'on-device';

  // ============================================================
  // TODO: TEMPORARILY DISABLED - Re-enable prompt generation after step-by-step integration
  // ============================================================
  // let promptCandidate: PromptFilenameResult | null = null;
  //
  // if (onDeviceReady) {
  //   promptCandidate = await generatePromptCandidate({
  //     request,
  //     ingestion,
  //     summary,
  //     language: subjectLanguage.language,
  //   });
  // }
  //
  // if (!promptCandidate) {
  //   if (mode === 'hybrid-ask') {
  //     return {
  //       status: 'permission-required',
  //       requestId: request.requestId,
  //       analyzedAt: Date.now(),
  //       reason: 'cloud-consent-required',
  //       message:
  //         'Cloud fallback is available but requires explicit permission from the user.',
  //     };
  //   }
  //   if (mode === 'hybrid-always') {
  //     promptCandidate = await generateCloudFallbackCandidate({
  //       ingestion,
  //       summary,
  //       language: subjectLanguage.language,
  //     });
  //     if (!promptCandidate) {
  //       return null;
  //     }
  //     modelSource = 'cloud';
  //   } else {
  //     return null;
  //   }
  // }
  //
  // const subject = promptCandidate.stem?.trim() ?? '';
  // if (subject.length === 0) {
  //   return null;
  // }
  // ============================================================

  // Use baseline filename as subject (without extension)
  const subject = extractStemFromBaseline(
    request.baseline.final || request.filename,
  );
  if (!subject || subject.trim().length === 0) {
    return null;
  }

  const filenameResult = buildFilename({
    request,
    ingestion,
    subject,
    language: subjectLanguage.language,
  });

  const proposedFilename = filenameResult.filename;
  if (!proposedFilename || proposedFilename.length === 0) {
    return null;
  }

  const currentFinal = request.baseline.final ?? request.filename;
  if (
    currentFinal &&
    currentFinal.toLowerCase() === proposedFilename.toLowerCase()
  ) {
    return null;
  }

  const proposedPath = buildProposedPath(
    request.relativePath,
    proposedFilename,
  );

  const promptUsed = false; // No prompt API used in simplified version

  const success: TextUpgradeAnalysisSuccess = {
    status: 'success',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    proposal: {
      proposedFilename,
      proposedPath,
      confidence: 'suggested',
      autoApply: false,
      reasonTags: formatReasonTags(
        subjectLanguage.language,
        promptUsed,
        modelSource,
      ),
      generatedAt: Date.now(),
      source: 'ai',
      summary: subjectLanguage.language
        ? `Language detected: ${subjectLanguage.language.toUpperCase()}`
        : undefined,
    },
    language: subjectLanguage.language,
    languageConfidence: subjectLanguage.confidence,
    modelSource,
    truncatedInput: ingestion.truncated,
    promptConfidence: undefined,
    promptUsed,
    metrics: {
      bytesFetched: ingestion.metrics.readBytes,
      requests: 1,
      elapsedMs: ingestion.metrics.elapsedMs,
    },
  };

  recordPipelineRouted(modelSource);
  return success;
}

// ============================================================
// TODO: TEMPORARILY DISABLED - Re-enable after step-by-step integration
// ============================================================
// async function generatePromptCandidate({
//   request,
//   ingestion,
//   summary,
//   language,
// }: {
//   request: TextUpgradeAnalysisRequest;
//   ingestion: TextUpgradeIngestionResult;
//   summary: string | null;
//   language?: string;
// }): Promise<PromptFilenameResult | null> {
//   try {
//     const result = await generatePromptFilename({
//       request,
//       ingestion,
//       summary,
//       language,
//     });
//     return result;
//   } catch (error) {
//     debugLogger.warn('[TextUpgradeAI] Prompt candidate generation failed', {
//       requestId: request.requestId,
//       error,
//     });
//     return null;
//   }
// }
//
// async function generateCloudFallbackCandidate({
//   ingestion,
//   summary,
//   language,
// }: {
//   ingestion: TextUpgradeIngestionResult;
//   summary: string | null;
//   language?: string;
// }): Promise<PromptFilenameResult | null> {
//   const derived = deriveSubject(summary, ingestion.text);
//   if (!derived || derived.trim().length === 0) {
//     return null;
//   }
//
//   const qualifiers: string[] = [];
//   if (language) {
//     qualifiers.push(language.toUpperCase());
//   }
//   qualifiers.push('cloud');
//
//   return {
//     stem: derived,
//     qualifiers,
//     confidence: 0.6,
//     explanation:
//       summary ??
//       'Cloud fallback generated this filename using the file text excerpt.',
//   };
// }
// ============================================================
