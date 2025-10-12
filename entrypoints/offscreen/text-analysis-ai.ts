import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  ChromeLanguageDetectorConstructor,
  ChromeSummarizerConstructor,
} from '@/entrypoints/shared/integrations/chrome-ai/types';
import type {
  TextUpgradeAnalysisRequest,
  TextUpgradeAnalysisResponse,
  TextUpgradeAnalysisSuccess,
  TextUpgradeAnalysisUnavailable,
  TextUpgradeIngestionResult,
  TextUpgradeModelSource,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import {
  applyFilenamePolicy,
  type FilenamePolicyResult,
} from '@/entrypoints/shared/naming/policy-engine';
import { extractExtension } from '@/entrypoints/shared/utils/filename';
import {
  generatePromptFilename,
  type PromptFilenameResult,
} from './text-analysis-prompt';

type LanguageDetectionResult = {
  language?: string;
  confidence?: number;
  source: 'preference' | 'browser' | 'detector' | 'fallback';
};

async function detectLanguage(
  text: string,
  preference: TextUpgradeAnalysisRequest['settings']['languagePreference'],
): Promise<LanguageDetectionResult> {
  if (preference && preference !== 'auto' && preference !== 'browser') {
    return { language: preference, confidence: 1, source: 'preference' };
  }

  if (preference === 'browser') {
    const browserLocale = navigator.language?.split('-')[0];
    return {
      language: browserLocale,
      confidence: browserLocale ? 0.5 : undefined,
      source: 'browser',
    };
  }

  const LanguageDetectorCtor = (globalThis as { LanguageDetector?: unknown })
    .LanguageDetector as ChromeLanguageDetectorConstructor | undefined;

  if (!LanguageDetectorCtor?.create) {
    return { source: 'fallback' };
  }

  try {
    const availability = await LanguageDetectorCtor.availability?.();
    if (availability && availability === 'unavailable') {
      return { source: 'fallback' };
    }

    const detector = await LanguageDetectorCtor.create();
    try {
      const results = await detector.detectLanguage(text.slice(0, 5_000));
      const best = results?.[0];
      if (best?.detectedLanguage) {
        return {
          language: best.detectedLanguage,
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

async function summariseText(
  text: string,
  language?: string,
): Promise<string | null> {
  const SummarizerCtor = (globalThis as { Summarizer?: unknown }).Summarizer as
    | ChromeSummarizerConstructor
    | undefined;

  if (!SummarizerCtor?.create) {
    return fallbackSummary(text);
  }

  try {
    const availability = await SummarizerCtor.availability?.();
    if (availability && availability === 'unavailable') {
      return fallbackSummary(text);
    }

    const summarizer = await SummarizerCtor.create({
      type: 'key-points',
      format: 'markdown',
      length: 'short',
    });

    try {
      const sample = text.length > 20_000 ? text.slice(0, 20_000) : text;
      const response = await summarizer.summarize(sample, {
        context: language ? `Language: ${language}` : undefined,
      });
      const summary = response?.summary?.trim();
      if (summary && summary.length > 0) {
        return summary;
      }
      return fallbackSummary(text);
    } finally {
      summarizer.destroy?.();
    }
  } catch (error) {
    debugLogger.warn('[TextUpgradeAI] Summarizer failed', { error });
    return fallbackSummary(text);
  }
}

function fallbackSummary(text: string): string | null {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return null;
  }
  const first = lines[0];
  if (first.length <= 160) {
    return first;
  }
  return `${first.slice(0, 157).trimEnd()}…`;
}

function deriveSubject(summary: string | null, text: string): string {
  if (summary) {
    const firstLine = summary.split(/\n+/).find((line) => line.trim().length);
    if (firstLine) {
      return stripListPrefix(firstLine.trim());
    }
  }
  const fallback = text.split(/\n+/).find((line) => line.trim().length);
  if (fallback) {
    return stripListPrefix(fallback.trim());
  }
  return 'Document';
}

function stripListPrefix(value: string): string {
  return value.replace(/^[-*•\d.]+\s+/, '');
}

interface FilenameContext {
  request: TextUpgradeAnalysisRequest;
  ingestion: TextUpgradeIngestionResult;
  subject: string;
  language?: string;
  promptQualifiers?: string[];
}

function buildFilename({
  request,
  ingestion,
  subject,
  language,
  promptQualifiers,
}: FilenameContext): FilenamePolicyResult {
  const extension =
    extractExtension(request.filename) ??
    extractExtension(request.relativePath) ??
    extractExtension(request.baseline.final) ??
    null;

  const qualifiers: string[] = [];
  if (promptQualifiers?.length) {
    qualifiers.push(...promptQualifiers);
  }
  if (language) {
    qualifiers.push(language.toUpperCase());
  }
  if (ingestion.truncated) {
    qualifiers.push('excerpt');
  }

  const result = applyFilenamePolicy({
    subject,
    qualifiers,
    extension,
    maxLength: request.settings.maxFilenameLength,
    separator: request.settings.separator,
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

export async function runTextUpgradePipeline(
  request: TextUpgradeAnalysisRequest,
  ingestion: TextUpgradeIngestionResult,
): Promise<TextUpgradeAnalysisResponse | null> {
  const mode = request.settings.mode ?? 'on-device-only';
  if (mode === 'off') {
    return null;
  }

  const subjectLanguage = await detectLanguage(
    ingestion.text,
    request.settings.languagePreference,
  );

  const summary = await summariseText(ingestion.text, subjectLanguage.language);
  let modelSource: TextUpgradeModelSource = 'on-device';
  let promptCandidate = await generatePromptCandidate({
    request,
    ingestion,
    summary,
    language: subjectLanguage.language,
  });

  if (!promptCandidate) {
    if (mode === 'hybrid-ask') {
      return {
        status: 'permission-required',
        requestId: request.requestId,
        analyzedAt: Date.now(),
        reason: 'cloud-consent-required',
        message:
          'Cloud fallback is available but requires explicit permission from the user.',
      };
    }
    if (mode === 'hybrid-always') {
      promptCandidate = await generateCloudFallbackCandidate({
        ingestion,
        summary,
        language: subjectLanguage.language,
      });
      if (!promptCandidate) {
        return null;
      }
      modelSource = 'cloud';
    } else {
      return null;
    }
  }

  const subject = promptCandidate.stem?.trim() ?? '';
  if (subject.length === 0) {
    return null;
  }

  const filenameResult = buildFilename({
    request,
    ingestion,
    subject,
    language: subjectLanguage.language,
    promptQualifiers: promptCandidate?.qualifiers,
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

  const promptUsed = modelSource === 'on-device';

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
      summary: promptCandidate.explanation ?? summary ?? undefined,
    },
    language: subjectLanguage.language,
    languageConfidence: subjectLanguage.confidence,
    modelSource,
    truncatedInput: ingestion.truncated,
    promptConfidence: promptCandidate.confidence,
    promptUsed,
    metrics: {
      bytesFetched: ingestion.metrics.readBytes,
      requests: 1,
      elapsedMs: ingestion.metrics.elapsedMs,
    },
  };

  return success;
}

async function generatePromptCandidate({
  request,
  ingestion,
  summary,
  language,
}: {
  request: TextUpgradeAnalysisRequest;
  ingestion: TextUpgradeIngestionResult;
  summary: string | null;
  language?: string;
}): Promise<PromptFilenameResult | null> {
  try {
    const result = await generatePromptFilename({
      request,
      ingestion,
      summary,
      language,
    });
    return result;
  } catch (error) {
    debugLogger.warn('[TextUpgradeAI] Prompt candidate generation failed', {
      requestId: request.requestId,
      error,
    });
    return null;
  }
}

async function generateCloudFallbackCandidate({
  ingestion,
  summary,
  language,
}: {
  ingestion: TextUpgradeIngestionResult;
  summary: string | null;
  language?: string;
}): Promise<PromptFilenameResult | null> {
  const derived = deriveSubject(summary, ingestion.text);
  if (!derived || derived.trim().length === 0) {
    return null;
  }

  const qualifiers: string[] = [];
  if (language) {
    qualifiers.push(language.toUpperCase());
  }
  qualifiers.push('cloud');

  return {
    stem: derived,
    qualifiers,
    confidence: 0.6,
    explanation:
      summary ??
      'Cloud fallback generated this filename using the file text excerpt.',
  };
}

export function buildUnavailableResponse(
  request: TextUpgradeAnalysisRequest,
  reason: TextUpgradeAnalysisUnavailable['reason'],
  message: string,
): TextUpgradeAnalysisResponse {
  return {
    status: 'unavailable',
    requestId: request.requestId,
    analyzedAt: Date.now(),
    reason,
    message,
  };
}
