import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  detectBrowserLanguage,
  getUserLanguagePreference,
  normalizeLanguageCode,
} from '@/entrypoints/shared/integrations/chrome-ai/language-helpers';
import type { ChromeLanguageDetectorConstructor } from '@/entrypoints/shared/integrations/chrome-ai/types';
import type { TextUpgradeAnalysisRequest } from '@/entrypoints/shared/integrations/text-analysis/types';
import { LANGUAGE_DETECTION_SAMPLE_SIZE } from './constants';

export type LanguageDetectionResult = {
  language?: string;
  confidence?: number;
  source: 'preference' | 'browser' | 'detector' | 'fallback';
};

export async function detectLanguage(
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

  const LanguageDetectorCtor = (
    globalThis as typeof globalThis & {
      LanguageDetector?: ChromeLanguageDetectorConstructor;
    }
  ).LanguageDetector;

  if (!LanguageDetectorCtor?.create) {
    debugLogger.log('[TextUpgradeAI] LanguageDetector API not available');
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

      const results = await detector.detect(
        text.slice(0, LANGUAGE_DETECTION_SAMPLE_SIZE),
      );
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
